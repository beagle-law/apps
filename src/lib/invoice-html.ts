import { invoiceTotal, formatYen, type InvoiceSectionInput } from "@/lib/business/invoice";
import { formatDate } from "@/lib/dates";

const FIRM_NAME = "Beagle総合法律事務所";
const FIRM_LAWYER = "弁護士　宮村頼光";
const FIRM_REG_NUMBER = "登録番号　T5810678070063";
const FIRM_ADDRESS = ["〒103-0025", "東京都中央区日本橋茅場町1丁目6番3号KTビル404号"];
const FIRM_PHONE = "03-6869-1076";

const BANK_INFO = `銀行：三井住友銀行
支店：東京中央支店（支店番号：015）
名義：ベンゴシ　ミヤムラ　ヨリミツ
口座種別：普通
口座番号：9548121`;

const yen = formatYen;

function escapeHtml(s: string) {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

export interface InvoiceForHtml {
  invoiceNumber: number;
  clientName: string;
  caseTitle: string;
  issueDate: string;
  sections: InvoiceSectionInput[];
  notes: string;
}

/** 請求書の中身（style込みの1つの&lt;div&gt;フラグメント）。PDF化に使う。区分が2つ以上のときのみ「項目」列（第N）を表示する（v9 3.8）。 */
export function buildInvoiceElement(inv: InvoiceForHtml): string {
  const { sections, total } = invoiceTotal(inv.sections);
  const showSectionLabel = sections.length > 1;

  const bodyRowsHtml = sections
    .map((sec, secIdx) => {
      let no = 0;
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

  const notesBlock = inv.notes?.trim() ? `\n\n${inv.notes.trim()}` : "";

  return `<div style="font-family: 'Hiragino Mincho ProN','Yu Mincho','Noto Serif JP',serif; color:#1a1a1a; font-size:13px; line-height:1.7; padding:32px; background:#fff;">
  <style>
    .inv-root * { box-sizing: border-box; }
    .inv-root h1 { text-align:center; font-size:22px; letter-spacing:0.3em; margin:0 0 28px; }
    .inv-header-row { display:flex; justify-content:space-between; align-items:flex-start; margin-bottom:20px; }
    .inv-client-block { padding-top:24px; }
    .inv-client-name { font-size:16px; border-bottom:1px solid #333; padding-bottom:4px; min-width:220px; display:inline-block; }
    .inv-firm-block { text-align:right; white-space:pre-line; font-size:12px; }
    .inv-amount-box { border-bottom:3px double #333; padding:10px 4px 14px; margin-bottom:24px; display:flex; justify-content:space-between; align-items:baseline; }
    .inv-amount-box .inv-label { font-size:14px; }
    .inv-amount-box .inv-value { font-size:22px; font-weight:bold; }
    table.inv-table { width:100%; border-collapse:collapse; margin-bottom:28px; }
    table.inv-table th, table.inv-table td { border:1px solid #888; padding:6px 8px; font-size:12.5px; }
    table.inv-table th { background:#f1ede4; text-align:center; }
    .section-cell { text-align:center; white-space:nowrap; }
    .no-cell { text-align:center; width:32px; }
    .amount-cell { text-align:right; white-space:nowrap; width:110px; }
    .inv-total-row td { font-weight:bold; font-size:15px; border-top:3px double #333; }
    .inv-footer { white-space:pre-line; font-size:12px; color:#333; }
  </style>
  <div class="inv-root">
    <h1>ご請求書</h1>
    <div class="inv-header-row">
      <div class="inv-client-block">
        <span class="inv-client-name">${escapeHtml(inv.clientName)}　御中</span>
      </div>
      <div class="inv-firm-block">ご請求日　${escapeHtml(formatDate(inv.issueDate))}
${FIRM_NAME}
${FIRM_LAWYER}
${FIRM_REG_NUMBER}
${FIRM_ADDRESS.join("\n")}
${FIRM_PHONE}</div>
    </div>

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
          <td colspan="${showSectionLabel ? 3 : 2}" style="text-align:center;">税込ご請求額</td>
          <td class="amount-cell">${yen(total)}</td>
        </tr>
      </tbody>
    </table>

    <div class="inv-footer">お支払いは下記銀行口座へ振り込みくださいますようお願い申し上げます。

${BANK_INFO}

恐れ入りますが振込手数料は貴社にてご負担ください。
なお、実費の差額については、訴訟終結後ご返金いたします。${notesBlock}</div>
  </div>
</div>`;
}
