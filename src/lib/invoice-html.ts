import { invoiceTotal, formatYen, type InvoiceSectionInput } from "@/lib/business/invoice";
import { formatDate, formatYearMonth } from "@/lib/dates";
import { ATTACHMENT_SUMMARY_SECTION_TYPES } from "@/lib/constants";

const FIRM_NAME = "Beagle総合法律事務所";
const FIRM_LAWYER = "弁護士　宮村頼光";
const FIRM_REG_NUMBER = "登録番号　T5810678070063";
const FIRM_ADDRESS = ["〒103-0025", "東京都中央区日本橋茅場町1丁目6番3号KTビル404号"];
const FIRM_PHONE = "03-6869-1076";
const LOGO_SRC = "/invoice-logo.png"; // 請求書用ロゴ（public配下。同一オリジンのためPDF化時にそのまま描画できる）

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
  billingMonth?: string; // 請求対象月（YYYY-MM）。設定時のみPDFに表示
  honorific: string;
  dueDate: string;
  sections: InvoiceSectionInput[];
  notes: string;
  timeCharges?: InvoiceTimeChargeRowForHtml[];
  expenses?: InvoiceExpenseRowForHtml[];
}

// 請求書PDF共通スタイル（v32：ロゴの紫系を基調にした、すっきりしたデザインに刷新）。
// 配色：濃い紫 #3F3A6B（見出し・罫線）／中間の紫 #6B63C8（差し色）／淡い紫 #F3F2FB（面）／罫線 #DAD8EE。
// v10〜v16の方針は維持：No./摘要/金額は縦中央揃え、摘要列は左揃え、文字は大きめ。
// PDF化に使うhtml2canvasはtable-layout:autoの表を正しく100%幅へ広げられないため、table-layout:fixedと列ごとの割合指定にしている。
const COMMON_STYLE = `
    .inv-root * { box-sizing: border-box; }
    .inv-root { color:#2B2A33; }
    .inv-top { display:flex; justify-content:space-between; align-items:center; padding-bottom:16px; margin-bottom:26px; border-bottom:3px solid #3F3A6B; }
    .inv-logo { width:92px; height:auto; display:block; }
    .inv-title-block { text-align:right; }
    .inv-title { font-size:32px; font-weight:700; letter-spacing:0.3em; margin:0; padding-left:0.3em; color:#3F3A6B; line-height:1.2; }
    .inv-title-en { font-size:12px; letter-spacing:0.55em; color:#8A86B8; margin-top:6px; }
    .inv-header-row { display:flex; justify-content:space-between; align-items:flex-start; margin-bottom:24px; gap:24px; }
    .inv-client-block { flex:1; min-width:0; padding-top:6px; }
    .inv-client-name { font-size:23px; font-weight:700; border-bottom:2px solid #6B63C8; padding-bottom:5px; display:inline-block; min-width:240px; color:#1F1D2B; }
    .inv-meta { margin-top:14px; font-size:15px; color:#4A4860; line-height:1.9; }
    .inv-meta b { display:inline-block; width:7.5em; font-weight:600; color:#3F3A6B; }
    .inv-firm-block { text-align:right; white-space:pre-line; font-size:14px; color:#4A4860; line-height:1.75; flex-shrink:0; }
    .inv-firm-name { font-size:17px; font-weight:700; color:#3F3A6B; letter-spacing:0.05em; }
    .inv-amount-box { width:100%; background:#F3F2FB; border-left:6px solid #3F3A6B; padding:16px 22px; margin-bottom:26px; display:flex; justify-content:space-between; align-items:baseline; }
    .inv-amount-box .inv-label { font-size:18px; color:#55527F; letter-spacing:0.1em; }
    .inv-amount-box .inv-value { font-size:32px; font-weight:700; color:#3F3A6B; }
    table.inv-table { width:100%; table-layout:fixed; border-collapse:collapse; margin-bottom:26px; }
    table.inv-table th { background:#3F3A6B; color:#ffffff; font-weight:600; font-size:16px; letter-spacing:0.12em; padding:11px 12px; text-align:center; vertical-align:middle; }
    table.inv-table td { border-bottom:1px solid #DAD8EE; padding:12px 12px; font-size:18px; vertical-align:middle; overflow-wrap:break-word; }
    .section-cell { text-align:center; white-space:nowrap; width:7%; }
    td.section-cell { background:#F8F7FD; color:#3F3A6B; font-weight:700; border-right:1px solid #DAD8EE; }
    .no-cell { text-align:center; white-space:nowrap; width:6%; color:#8A86B8; }
    th.no-cell { color:#ffffff; }
    .desc-cell { text-align:left; }
    .amount-cell { text-align:center; white-space:nowrap; width:16%; font-weight:600; }
    .date-cell { text-align:center; white-space:nowrap; width:23%; }
    .inv-total-row td { font-weight:700; font-size:20px; color:#3F3A6B; background:#F3F2FB; border-top:2px solid #3F3A6B; border-bottom:2px solid #3F3A6B; }
    .inv-total-row .total-label { text-align:right; letter-spacing:0.08em; }
    .inv-footer { white-space:pre-line; font-size:14px; line-height:1.8; color:#4A4860; border-top:1px solid #DAD8EE; padding-top:14px; }
    .inv-bottom-bar { display:flex; margin-top:22px; }
    .inv-bottom-bar span { display:block; height:5px; }
    .inv-attachment-title { text-align:left; font-size:22px; font-weight:700; letter-spacing:0.18em; margin:0; color:#3F3A6B; }
`;

function pageWrapperOpen(): string {
  return `<div style="font-family: 'Hiragino Sans','Hiragino Kaku Gothic ProN','Yu Gothic','Noto Sans JP',sans-serif; color:#2B2A33; font-size:16px; line-height:1.7; padding:36px 36px 28px; background:#fff;">
  <style>${COMMON_STYLE}</style>
  <div class="inv-root">`;
}
function pageWrapperClose(): string {
  return `    <div class="inv-bottom-bar"><span style="width:62%;background:#3F3A6B;"></span><span style="width:24%;background:#6B63C8;"></span><span style="width:14%;background:#A5A0DC;"></span></div>
  </div>
</div>`;
}

/** 各ページ上部のヘッダー：左にロゴ、右にタイトル。 */
function topHeader(titleHtml: string, subtitleEn: string): string {
  return `<div class="inv-top">
      <img class="inv-logo" src="${LOGO_SRC}" alt="Beagle Law" />
      <div class="inv-title-block">${titleHtml}<div class="inv-title-en">${subtitleEn}</div></div>
    </div>`;
}

/** 請求書の中身（style込みの1つの&lt;div&gt;フラグメント）。PDF化に使う。区分が2つ以上のときのみ「項目」列（第N）を表示する（v9 3.8）。
 * 実費／実費ご返金は、個々の項目を列挙せず「別紙のとおり」1行にまとめる（v10 3.2）。
 * 実費お預かり金は対象外とし、入力した項目名をそのまま摘要欄に表示する（v16）。
 */
export function buildInvoiceElement(inv: InvoiceForHtml): string {
  const { sections, total } = invoiceTotal(inv.sections);
  const showSectionLabel = sections.length > 1;

  const bodyRowsHtml = sections
    .map((sec, secIdx) => {
      const summarizeAsAttachment = ATTACHMENT_SUMMARY_SECTION_TYPES.includes(sec.type);
      let no = 0;

      if (summarizeAsAttachment) {
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
      const subtotalRow = `<tr>${no === 1 ? sectionLabelCell : ""}<td class="no-cell">${no}</td><td class="desc-cell" style="color:#55527F;">小計</td><td class="amount-cell">${yen(sec.total)}</td></tr>`;

      return itemRows + extraRows + subtotalRow;
    })
    .join("");

  const metaLines = [
    `<div><b>ご請求日</b>${escapeHtml(formatDate(inv.issueDate))}</div>`,
    inv.billingMonth ? `<div><b>ご請求対象月</b>${escapeHtml(formatYearMonth(inv.billingMonth))}分</div>` : "",
    inv.dueDate ? `<div><b>お支払期限</b>${escapeHtml(formatDate(inv.dueDate))}</div>` : "",
  ].join("");

  return `${pageWrapperOpen()}
    ${topHeader('<h1 class="inv-title">ご請求書</h1>', "INVOICE")}
    <div class="inv-header-row">
      <div class="inv-client-block">
        <span class="inv-client-name">${escapeHtml(inv.clientName)}　${escapeHtml(inv.honorific || "御中")}</span>
        <div class="inv-meta">${metaLines}</div>
      </div>
      <div class="inv-firm-block"><div class="inv-firm-name">${FIRM_NAME}</div>${FIRM_LAWYER}
${FIRM_REG_NUMBER}
${FIRM_ADDRESS.join("\n")}
TEL　${FIRM_PHONE}</div>
    </div>

    <div class="inv-amount-box">
      <span class="inv-label">ご請求額</span>
      <span class="inv-value">${yen(total)}</span>
    </div>

    <table class="inv-table">
      <thead>
        <tr>${showSectionLabel ? '<th class="section-cell">項目</th>' : ""}<th class="no-cell">No.</th><th class="desc-cell" style="text-align:center;">摘要</th><th class="amount-cell">金額</th></tr>
      </thead>
      <tbody>
        ${bodyRowsHtml}
        <tr class="inv-total-row">
          <td colspan="${showSectionLabel ? 3 : 2}" class="total-label">税込ご請求額</td>
          <td class="amount-cell">${yen(total)}</td>
        </tr>
      </tbody>
    </table>

    <div class="inv-footer">${escapeHtml((inv.notes || "").trim())}</div>
${pageWrapperClose()}`;
}

/** 別紙「タイムチャージ明細」（v10 3.2）。案件No.・依頼者名などは含めない。 */
export function buildTimeChargeAttachment(rows: InvoiceTimeChargeRowForHtml[]): string {
  const bodyRows = rows
    .map(
      (r) =>
        `<tr><td class="date-cell">${escapeHtml(formatDate(r.date))}</td><td class="desc-cell">${escapeHtml(r.startTime || "－")}〜${escapeHtml(r.endTime || "－")}</td><td class="amount-cell">${r.hours}時間</td><td class="desc-cell">${escapeHtml(r.content)}</td></tr>`
    )
    .join("");
  return `${pageWrapperOpen()}
    ${topHeader('<h2 class="inv-attachment-title">別紙　タイムチャージ明細</h2>', "ATTACHMENT")}
    <table class="inv-table">
      <thead><tr><th class="date-cell">稼働日</th><th class="desc-cell" style="text-align:center;">開始〜終了</th><th class="amount-cell">稼働時間</th><th class="desc-cell" style="text-align:center;">稼働内容</th></tr></thead>
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
        `<tr><td class="date-cell">${escapeHtml(formatDate(r.date))}</td><td class="amount-cell">${yen(r.amount)}</td><td class="desc-cell">${escapeHtml(r.category)}</td><td class="desc-cell">${escapeHtml(routeDisplay(r))}</td></tr>`
    )
    .join("");
  const total = rows.reduce((s, r) => s + r.amount, 0);
  return `${pageWrapperOpen()}
    ${topHeader('<h2 class="inv-attachment-title">別紙　実費一覧</h2>', "ATTACHMENT")}
    <table class="inv-table">
      <thead><tr><th class="date-cell">日付</th><th class="amount-cell">金額</th><th class="desc-cell" style="text-align:center;">目的</th><th class="desc-cell" style="text-align:center;">経路</th></tr></thead>
      <tbody>
        ${bodyRows}
        <tr class="inv-total-row"><td class="total-label">合計</td><td class="amount-cell">${yen(total)}</td><td colspan="2"></td></tr>
      </tbody>
    </table>
${pageWrapperClose()}`;
}
