import { invoiceTotal, formatYen, type InvoiceSectionInput } from "@/lib/business/invoice";
import { formatDate, formatYearMonth } from "@/lib/dates";
import { EXPENSE_LIKE_SECTION_TYPES } from "@/lib/constants";

const FIRM_NAME = "Beagle総合法律事務所";
const FIRM_LAWYER = "弁護士　宮村頼光";
const FIRM_REG_NUMBER = "登録番号　T5810678070063";
const FIRM_ADDRESS = ["〒103-0025", "東京都中央区日本橋茅場町1丁目6番3号KTビル404号"];
const FIRM_PHONE = "03-6869-1076";

const yen = formatYen;

function escapeHtml(s: string) {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

export interface InvoiceTimeChargeRowForHtml {
  date: string;
  startTime: string;
  endTime: string;
  hours: number;
  content: string;
}

export interface InvoiceExpenseRowForHtml {
  date: string;
  category: string;
  amount: number;
  origin: string;
  destination: string;
  route: string;
}

export interface InvoiceForHtml {
  invoiceNumber: number;
  clientName: string;
  caseTitle: string;
  issueDate: string;
  billingMonth?: string; // 請求対象月（YYYY-MM、任意）。設定時のみPDFに表示
  honorific: string;
  dueDate: string;
  sections: InvoiceSectionInput[];
  notes: string;
  timeCharges?: InvoiceTimeChargeRowForHtml[];
  expenses?: InvoiceExpenseRowForHtml[];
}

// 請求書PDF共通スタイル。
// v10：全体的に文字サイズを拡大。No./摘要/金額は横・縦とも中央揃え。「税込ご請求額」ラベルは右揃え。
// v11 3.5：セルは縦方向すべて中央揃えを維持しつつ、摘要列の内容は左揃えに変更。表はtable-layout:auto、
// 項目（第N）列は約44pxに圧縮、摘要列は自動幅。表内文字サイズを17〜18px程度に拡大。
const COMMON_STYLE = `
    .inv-root * { box-sizing: border-box; }
    .inv-root h1 { text-align:center; font-size:26px; letter-spacing:0.3em; margin:0 0 28px; }
    .inv-header-row { display:flex; justify-content:space-between; align-items:flex-start; margin-bottom:20px; }
    .inv-client-block { padding-top:24px; }
    .inv-client-name { font-size:19px; border-bottom:1px solid #333; padding-bottom:4px; min-width:220px; display:inline-block; }
    .inv-firm-block { text-align:right; white-space:pre-line; font-size:13.5px; }
    .inv-narrow { width:520px; max-width:100%; }
    .inv-amount-box { width:100%; border-bottom:3px double #333; padding:10px 4px 14px; margin-bottom:24px; display:flex; justify-content:space-between; align-items:baseline; }
    .inv-amount-box .inv-label { font-size:16px; }
    .inv-amount-box .inv-value { font-size:26px; font-weight:bold; }
    table.inv-table { width:100%; table-layout:auto; border-collapse:collapse; margin-bottom:28px; }
    table.inv-table th, table.inv-table td { border:1px solid #888; padding:8px 10px; font-size:17.5px; vertical-align:middle; }
    table.inv-table th { background:#f1ede4; text-align:center; }
    .section-cell { text-align:center; white-space:nowrap; width:44px; }
    .no-cell { text-align:center; width:36px; }
    .desc-cell { text-align:left; }
    .amount-cell { text-align:center; white-space:nowrap; width:130px; }
    .inv-total-row td { font-weight:bold; font-size:18px; border-top:3px double #333; }
    .inv-total-row .total-label { text-align:right; }
    .inv-footer { white-space:pre-line; font-size:13.5px; color:#333; }
    .inv-attachment-title { text-align:center; font-size:18px; letter-spacing:0.15em; margin:0 0 20px; }
`;

function pageWrapperOpen(): string {
  return `<div style="font-family: 'Hiragino Mincho ProN','Yu Mincho','Noto Serif JP',serif; color:#1a1a1a; font-size:14.5px; line-height:1.7; padding:32px; background:#fff;">
  <style>${COMMON_STYLE}</style>
  <div class="inv-root">`;
}
function pageWrapperClose(): string {
  return `  </div>
</div>`;
}

/** 請求書の中身（style込みの1つの&lt;div&gt;フラグメント）。PDF化に使う。区分が2つ以上のときのみ「項目」列（第N）を表示する（v9 3.8）。
 * 実費系の区分（実費／実費お預かり金／実費ご返金）は、個々の項目を列挙せず「別紙のとおり」1行にまとめる（v10 3.2）。
 */
export function buildInvoiceElement(inv: InvoiceForHtml): string {
  const { sections, total } = invoiceTotal(inv.sections);
  const showSectionLabel = sections.length > 1;

  const bodyRowsHtml = sections
    .map((sec, secIdx) => {
      const isExpenseLike = EXPENSE_LIKE_SECTION_TYPES.includes(sec.type);
      let no = 0;

      if (isExpenseLike) {
        const rowCount = 1;
        const sectionLabelCell = showSectionLabel ? `<td class="section-cell" rowspan="${rowCount}">第${secIdx + 1}</td>` : "";
        return `<tr>${sectionLabelCell}<td class="no-cell">1</td><td class="desc-cell">別紙のとおり</td><td class="amount-cell">${yen(sec.total)}</td></tr>`;
      }

      const rowCount = sec.items.length + (sec.tax ? 1 : 0) + (sec.withholding ? 1 : 0) + 1; // +1 for subtotal row
      const sectionLabelCell = showSectionLabel ? `<td class="section-cell" rowspan="${rowCount}">第${secIdx + 1}</td>` : "";

      const itemRows = sec.items
        .map((item) => {
          no += 1;
          return `<tr>${no === 1 ? sectionLabelCell : ""}<td class="no-cell">${no}</td><td class="desc-cell">${escapeHtml(item.description)}</td><td class="amount-cell">${yen(item.amount)}</td></tr>`;
        })
        .join("");

      let extraRows = "";
      if (sec.tax) {
        no += 1;
        extraRows += `<tr>${no === 1 ? sectionLabelCell : ""}<td class="no-cell">${no}</td><td class="desc-cell">消費税（10%）</td><td class="amount-cell">${yen(sec.tax)}</td></tr>`;
      }
      if (sec.withholding) {
        no += 1;
        extraRows += `<tr>${no === 1 ? sectionLabelCell : ""}<td class="no-cell">${no}</td><td class="desc-cell">源泉所得税</td><td class="amount-cell">${yen(-sec.withholding)}</td></tr>`;
      }
      no += 1;
      const subtotalRow = `<tr>${no === 1 ? sectionLabelCell : ""}<td class="no-cell">${no}</td><td class="desc-cell">小計</td><td class="amount-cell">${yen(sec.total)}</td></tr>`;

      return itemRows + extraRows + subtotalRow;
    })
    .join("");

  const dueDateLine = inv.dueDate ? `\nお支払期限　${escapeHtml(formatDate(inv.dueDate))}` : "";
  const billingMonthLine = inv.billingMonth ? `\nご請求対象月　${escapeHtml(formatYearMonth(inv.billingMonth))}分` : "";

  return `${pageWrapperOpen()}
    <h1>ご請求書</h1>
    <div class="inv-header-row">
      <div class="inv-client-block">
        <span class="inv-client-name">${escapeHtml(inv.clientName)}　${escapeHtml(inv.honorific || "御中")}</span>
      </div>
      <div class="inv-firm-block">ご請求日　${escapeHtml(formatDate(inv.issueDate))}${billingMonthLine}${dueDateLine}
${FIRM_NAME}
${FIRM_LAWYER}
${FIRM_REG_NUMBER}
${FIRM_ADDRESS.join("\n")}
${FIRM_PHONE}</div>
    </div>

    <div class="inv-narrow">
      <div class="inv-amount-box">
        <span class="inv-label">ご請求額</span>
        <span class="inv-value">${yen(total)}</span>
      </div>

      <table class="inv-table">
        <thead>
          <tr>${showSectionLabel ? "<th>項目</th>" : ""}<th>No.</th><th>摘要</th><th>金額</th></tr>
        </thead>
        <tbody>
          ${bodyRowsHtml}
          <tr class="inv-total-row">
            <td colspan="${showSectionLabel ? 3 : 2}" class="total-label">税込ご請求額</td>
            <td class="amount-cell">${yen(total)}</td>
          </tr>
        </tbody>
      </table>
    </div>

    <div class="inv-footer">${escapeHtml((inv.notes || "").trim())}</div>
${pageWrapperClose()}`;
}

/** 別紙「タイムチャージ明細」（v10 3.2）。案件No.・依頼者名などは含めない。 */
export function buildTimeChargeAttachment(rows: InvoiceTimeChargeRowForHtml[]): string {
  const bodyRows = rows
    .map(
      (r) =>
        `<tr><td>${escapeHtml(formatDate(r.date))}</td><td class="desc-cell">${escapeHtml(r.startTime || "－")}〜${escapeHtml(r.endTime || "－")}</td><td class="amount-cell">${r.hours}時間</td><td class="desc-cell">${escapeHtml(r.content)}</td></tr>`
    )
    .join("");
  return `${pageWrapperOpen()}
    <h2 class="inv-attachment-title">別紙　タイムチャージ明細</h2>
    <table class="inv-table">
      <thead><tr><th>稼働日</th><th>開始〜終了</th><th>稼働時間</th><th>稼働内容</th></tr></thead>
      <tbody>${bodyRows}</tbody>
    </table>
${pageWrapperClose()}`;
}

/** 別紙「実費一覧」（v10 3.2、v12 3.3で列を「日付／金額／目的／経路」に変更）。案件No.・依頼者名などは含めない。 */
export function buildExpenseAttachment(rows: InvoiceExpenseRowForHtml[]): string {
  const routeDisplay = (r: InvoiceExpenseRowForHtml) => r.route || (r.origin && r.destination ? `${r.origin}→${r.destination}` : r.origin || r.destination || "");
  const bodyRows = rows
    .map(
      (r) =>
        `<tr><td>${escapeHtml(formatDate(r.date))}</td><td class="amount-cell">${yen(r.amount)}</td><td class="desc-cell">${escapeHtml(r.category)}</td><td class="desc-cell">${escapeHtml(routeDisplay(r))}</td></tr>`
    )
    .join("");
  const total = rows.reduce((s, r) => s + r.amount, 0);
  return `${pageWrapperOpen()}
    <h2 class="inv-attachment-title">別紙　実費一覧</h2>
    <table class="inv-table">
      <thead><tr><th>日付</th><th>金額</th><th>目的</th><th>経路</th></tr></thead>
      <tbody>
        ${bodyRows}
        <tr class="inv-total-row"><td class="total-label">合計</td><td class="amount-cell">${yen(total)}</td><td colspan="2"></td></tr>
      </tbody>
    </table>
${pageWrapperClose()}`;
}
