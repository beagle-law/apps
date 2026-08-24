"use client";

import { buildInvoiceElement, type InvoiceForHtml } from "@/lib/invoice-html";

/** ファイル名に使えない文字を全角に置き換える。 */
function sanitizeForFilename(s: string): string {
  return s.replace(/[/\\:*?"<>|]/g, "_").trim();
}

function invoiceFileName(inv: InvoiceForHtml): string {
  const [year, month] = inv.issueDate.split("-");
  const clientPart = sanitizeForFilename(inv.clientName) || "お客様";
  return `${clientPart}_ご請求書（${Number(year)}年${Number(month)}月）.pdf`;
}

/**
 * ワンクリックで請求書PDFを直接ダウンロードする（jsPDF + html2canvasによるクライアント側生成）。
 * サーバー往復なしで、確認済みのHTMLレイアウト（buildInvoiceElement）をそのままラスタライズしてPDF化する。
 */
export async function downloadInvoicePdf(inv: InvoiceForHtml): Promise<void> {
  const { jsPDF } = await import("jspdf");

  const container = document.createElement("div");
  container.style.position = "fixed";
  container.style.left = "-10000px";
  container.style.top = "0";
  container.style.width = "780px";
  container.innerHTML = buildInvoiceElement(inv);
  document.body.appendChild(container);

  const doc = new jsPDF({ unit: "pt", format: "a4" });
  const pageWidth = doc.internal.pageSize.getWidth() - 40;

  try {
    await new Promise<void>((resolve, reject) => {
      doc
        .html(container, {
          x: 20,
          y: 20,
          width: pageWidth,
          windowWidth: 780,
          html2canvas: { scale: pageWidth / 780 },
          callback: () => resolve(),
        })
        .catch(reject);
    });
    doc.save(invoiceFileName(inv));
  } finally {
    document.body.removeChild(container);
  }
}
