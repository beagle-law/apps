import { invoiceTotal } from "@/lib/business/invoice";
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

function yen(n: number) {
  return `¥${Math.round(n).toLocaleString("ja-JP")}`;
}

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
  feeItems: { description: string; amount: number }[];
  applyTax: boolean;
  applyWithholding: boolean;
  expenseAmount: number;
  notes: string;
}

/** 請求書の中身（style込みの1つの&lt;div&gt;フラグメント）。印刷プレビュー・PDF化どちらにも使う。 */
export function buildInvoiceElement(inv: InvoiceForHtml): string {
  const totals = invoiceTotal({
    feeItems: inv.feeItems,
    applyTax: inv.applyTax,
    applyWithholding: inv.applyWithholding,
    expenseAmount: inv.expenseAmount,
  });

  const section1RowCount = inv.feeItems.length + 1 + (inv.applyTax ? 1 : 0) + (inv.applyWithholding ? 1 : 0);

  const feeRows = inv.feeItems
    .map(
      (item, i) => `
      <tr>
        ${i === 0 ? `<td class="section-cell" rowspan="${section1RowCount}">第1<br/>（弁護士報酬）</td>` : ""}
        <td class="no-cell">${i + 1}</td>
        <td class="desc-cell">${escapeHtml(item.description)}</td>
        <td class="amount-cell">${yen(item.amount)}</td>
      </tr>`
    )
    .join("");

  const taxRow = inv.applyTax
    ? `<tr><td class="no-cell"></td><td class="desc-cell">消費税（10%）</td><td class="amount-cell">${yen(totals.tax)}</td></tr>`
    : "";
  const withholdingRow = inv.applyWithholding
    ? `<tr><td class="no-cell"></td><td class="desc-cell">源泉所得税</td><td class="amount-cell">-${yen(totals.withholding)}</td></tr>`
    : "";
  const section1SubtotalRow = `<tr><td class="no-cell"></td><td class="desc-cell">小計</td><td class="amount-cell">${yen(totals.section1)}</td></tr>`;

  const section2Rows = `
    <tr>
      <td class="section-cell" rowspan="2">第2<br/>（実費預り金）</td>
      <td class="no-cell"></td>
      <td class="desc-cell">実費預り金</td>
      <td class="amount-cell">${yen(totals.section2)}</td>
    </tr>
    <tr>
      <td class="no-cell"></td>
      <td class="desc-cell">小計</td>
      <td class="amount-cell">${yen(totals.section2)}</td>
    </tr>`;

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
      <span class="inv-value">${yen(totals.total)}</span>
    </div>

    <table class="inv-table">
      <thead>
        <tr><th>項目</th><th>No.</th><th>摘要</th><th>金額</th></tr>
      </thead>
      <tbody>
        ${feeRows}
        ${taxRow}
        ${withholdingRow}
        ${section1SubtotalRow}
        ${section2Rows}
        <tr class="inv-total-row">
          <td colspan="3">税込ご請求額</td>
          <td class="amount-cell">${yen(totals.total)}</td>
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
