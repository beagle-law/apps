"use client";

import { buildInvoiceElement, type InvoiceForHtml } from "@/lib/invoice-html";

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
    doc.save(`ご請求書_${inv.invoiceNumber}.pdf`);
  } finally {
    document.body.removeChild(container);
  }
}
