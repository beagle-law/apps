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
 * サーバー往復なし、印刷ダイアログも経由しない。
 *
 * jsPDFの`doc.html()`ヘルパーは内部でのiframeクローン処理に起因して、
 * 環境によって白紙PDFが生成される不具合が報告されている。ここではhtml2canvasを
 * 直接呼び出してcanvasを取得し、その画像をjsPDFへ`addImage`する、より枯れた方式に
 * 切り替えている。1ページに収まらない場合はcanvasをページ高さ単位でスライスして
 * 複数ページに分割する。
 */
export async function downloadInvoicePdf(inv: InvoiceForHtml): Promise<void> {
  const [{ jsPDF }, { default: html2canvas }] = await Promise.all([
    import("jspdf"),
    import("html2canvas"),
  ]);

  const container = document.createElement("div");
  container.style.position = "fixed";
  container.style.left = "-10000px";
  container.style.top = "0";
  container.style.width = "780px";
  container.innerHTML = buildInvoiceElement(inv);
  document.body.appendChild(container);

  try {
    if (document.fonts?.ready) await document.fonts.ready;
    // レイアウト確定を待つ。requestAnimationFrameはバックグラウンドタブで発火が
    // 止まることがあるため使わず、setTimeoutで待つ（バックグラウンドでも必ず進む）。
    await new Promise<void>((resolve) => setTimeout(resolve, 50));

    const canvas = await html2canvas(container, {
      scale: 2,
      backgroundColor: "#ffffff",
      useCORS: true,
    });
    if (canvas.width === 0 || canvas.height === 0) {
      throw new Error("請求書のレンダリングに失敗しました（サイズが0でした）");
    }

    const doc = new jsPDF({ unit: "pt", format: "a4" });
    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();
    const margin = 20;
    const imgWidthPt = pageWidth - margin * 2;
    const pxPerPt = canvas.width / imgWidthPt;
    const pageHeightPx = (pageHeight - margin * 2) * pxPerPt;

    let renderedPx = 0;
    let isFirstPage = true;
    while (renderedPx < canvas.height) {
      const sliceHeightPx = Math.min(pageHeightPx, canvas.height - renderedPx);
      const pageCanvas = document.createElement("canvas");
      pageCanvas.width = canvas.width;
      pageCanvas.height = sliceHeightPx;
      const ctx = pageCanvas.getContext("2d");
      if (!ctx) throw new Error("PDF生成用のcanvasコンテキストを取得できませんでした");
      ctx.drawImage(canvas, 0, renderedPx, canvas.width, sliceHeightPx, 0, 0, canvas.width, sliceHeightPx);

      if (!isFirstPage) doc.addPage();
      doc.addImage(pageCanvas.toDataURL("image/png"), "PNG", margin, margin, imgWidthPt, sliceHeightPx / pxPerPt);

      renderedPx += sliceHeightPx;
      isFirstPage = false;
    }

    doc.save(invoiceFileName(inv));
  } finally {
    document.body.removeChild(container);
  }
}
