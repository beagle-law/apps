"use client";

import { buildInvoiceElement, buildTimeChargeAttachment, buildExpenseAttachment, LOGO_SRC, type InvoiceForHtml } from "@/lib/invoice-html";

/** ファイル名に使えない文字を全角に置き換える。 */
function sanitizeForFilename(s: string): string {
  return s.replace(/[/\\:*?"<>|]/g, "_").trim();
}

// v20：ファイル名は「宛名＋敬称」と請求対象月（未設定の場合のみ発行月）で付ける。
function invoiceFileName(inv: InvoiceForHtml): string {
  const [year, month] = (inv.billingMonth || inv.issueDate).split("-");
  const clientPart = sanitizeForFilename(`${inv.clientName}${inv.honorific || "御中"}`) || "お客様";
  return `${clientPart}_ご請求書（${Number(year)}年${Number(month)}月）.pdf`;
}

type JsPDFInstance = InstanceType<typeof import("jspdf").jsPDF>;

/** ほぼ真っ白（余白だけ）のcanvasか。1ページ目からはみ出した数ピクセルが白紙ページになるのを防ぐ。 */
function isBlankCanvas(c: HTMLCanvasElement, ctx: CanvasRenderingContext2D): boolean {
  const { width, height } = c;
  if (width === 0 || height === 0) return true;
  const data = ctx.getImageData(0, 0, width, height).data;
  for (let i = 0; i < data.length; i += 4 * 7) {
    // 白に近くない画素が1つでもあれば、内容がある
    if (data[i] < 245 || data[i + 1] < 245 || data[i + 2] < 245) return false;
  }
  return true;
}


let logoDataUrlCache: string | null | undefined;
/** ロゴを埋め込み画像（data URL）にして返す。foreignObject方式では外部URLの画像が描画されないことがあるため。 */
async function getLogoDataUrl(): Promise<string | null> {
  if (logoDataUrlCache !== undefined) return logoDataUrlCache;
  try {
    const blob = await fetch(LOGO_SRC).then((r) => (r.ok ? r.blob() : Promise.reject(new Error("logo"))));
    logoDataUrlCache = await new Promise<string>((resolve, reject) => {
      const fr = new FileReader();
      fr.onload = () => resolve(fr.result as string);
      fr.onerror = () => reject(fr.error);
      fr.readAsDataURL(blob);
    });
  } catch {
    logoDataUrlCache = null;
  }
  return logoDataUrlCache;
}

/** HTMLフラグメントを画面の裏でレンダリングしてcanvas化する。foreignObject方式は、画面内（背面）に置かないと描画されない。 */
async function renderBlockToCanvas(
  html2canvas: typeof import("html2canvas").default,
  html: string,
  foreignObject: boolean
): Promise<HTMLCanvasElement> {
  const container = document.createElement("div");
  container.style.cssText = foreignObject
    ? "position:absolute;left:0;top:0;width:780px;z-index:-1;background:#fff;pointer-events:none"
    : "position:fixed;left:-10000px;top:0;width:780px";
  container.innerHTML = html;
  document.body.appendChild(container);
  try {
    if (document.fonts?.ready) await document.fonts.ready;
    // ロゴなどの画像の読み込み完了を待つ（読み込み前にcanvas化すると画像が抜けるため）
    await Promise.all(
      Array.from(container.querySelectorAll("img")).map(
        (img) =>
          new Promise<void>((resolve) => {
            if (img.complete && img.naturalWidth > 0) return resolve();
            img.onload = () => resolve();
            img.onerror = () => resolve();
          })
      )
    );
    // レイアウト確定を待つ。requestAnimationFrameはバックグラウンドタブで発火が
    // 止まることがあるため使わず、setTimeoutで待つ（バックグラウンドでも必ず進む）。
    await new Promise<void>((resolve) => setTimeout(resolve, 50));
    return await html2canvas(container, { scale: 2, backgroundColor: "#ffffff", useCORS: true, foreignObjectRendering: foreignObject });
  } finally {
    document.body.removeChild(container);
  }
}

/** 描画結果がほぼ真っ白か（描画に失敗していないか）の簡易判定。 */
function looksBlank(c: HTMLCanvasElement): boolean {
  if (c.width === 0 || c.height === 0) return true;
  const small = document.createElement("canvas");
  small.width = 120;
  small.height = Math.max(1, Math.round((120 * c.height) / c.width));
  const ctx = small.getContext("2d");
  if (!ctx) return false;
  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, small.width, small.height);
  ctx.drawImage(c, 0, 0, small.width, small.height);
  const d = ctx.getImageData(0, 0, small.width, small.height).data;
  let nonWhite = 0;
  for (let i = 0; i < d.length; i += 4) if (d[i] < 240 || d[i + 1] < 240 || d[i + 2] < 240) nonWhite++;
  return nonWhite < 40;
}

/**
 * 1つのHTMLフラグメントをレンダリングし、jsPDFドキュメントへページを追加する。
 * `isFirstPageOverall`がfalseの場合、このブロックの最初のページの前に必ず改ページする
 * （本体・各別紙をそれぞれ独立した新規ページから開始させるため、v10 3.2）。
 * 1ブロックが1ページに収まらない場合は、従来どおりcanvasをページ高さ単位でスライスして
 * 複数ページに分割する。
 */
async function appendHtmlBlock(doc: JsPDFInstance, html: string, isFirstPageOverall: boolean): Promise<void> {
  const html2canvasModule = await import("html2canvas");
  const html2canvas = html2canvasModule.default;

  // v34：html2canvasの標準の描画は、文字が行・セルの下寄りにずれて描かれる（上下中央にならない）ため、
  // ブラウザ本来の描画（foreignObject方式）で画像化する。うまく描画できなかった場合（空白など）は従来の方式に切り替える。
  let canvas: HTMLCanvasElement | null = null;
  try {
    const logo = await getLogoDataUrl();
    const c = await renderBlockToCanvas(html2canvas, logo ? html.split(`src="${LOGO_SRC}"`).join(`src="${logo}"`) : html, true);
    if (!looksBlank(c)) canvas = c;
  } catch {
    canvas = null;
  }
  if (!canvas) canvas = await renderBlockToCanvas(html2canvas, html, false);

  {
    if (canvas.width === 0 || canvas.height === 0) {
      throw new Error("請求書のレンダリングに失敗しました（サイズが0でした）");
    }

    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();
    const margin = 20;
    const imgWidthPt = pageWidth - margin * 2;
    const pxPerPt = canvas.width / imgWidthPt;
    const pageHeightPx = (pageHeight - margin * 2) * pxPerPt;

    // 1ページ分をわずかに（約8%以内）超えるだけの場合は、2ページに分けず、1ページに収まるよう縮小して出力する
    // （数ピクセルはみ出しただけの内容が、ほぼ白紙の2ページ目になるのを防ぐ）
    const fullHeightPt = canvas.height / pxPerPt;
    const maxHeightPt = pageHeight - margin * 2;
    if (fullHeightPt > maxHeightPt && fullHeightPt <= maxHeightPt * 1.08) {
      const k = maxHeightPt / fullHeightPt;
      if (!isFirstPageOverall) doc.addPage();
      doc.addImage(canvas.toDataURL("image/jpeg", 0.85), "JPEG", margin + (imgWidthPt * (1 - k)) / 2, margin, imgWidthPt * k, maxHeightPt, undefined, "FAST");
      return;
    }

    let renderedPx = 0;
    let isFirstPageOfBlock = true;
    while (renderedPx < canvas.height) {
      const sliceHeightPx = Math.min(pageHeightPx, canvas.height - renderedPx);
      const pageCanvas = document.createElement("canvas");
      pageCanvas.width = canvas.width;
      pageCanvas.height = sliceHeightPx;
      const ctx = pageCanvas.getContext("2d");
      if (!ctx) throw new Error("PDF生成用のcanvasコンテキストを取得できませんでした");
      // JPEGは透過を持てないため、先に白で塗りつぶしてから描画する（容量削減のためPNGではなくJPEGで埋め込む）。
      ctx.fillStyle = "#ffffff";
      ctx.fillRect(0, 0, pageCanvas.width, pageCanvas.height);
      ctx.drawImage(canvas, 0, renderedPx, canvas.width, sliceHeightPx, 0, 0, canvas.width, sliceHeightPx);

      // 2ページ目以降で、残りがほぼ白紙（余白だけ）の場合は、ページを追加しない
      if (!isFirstPageOfBlock && isBlankCanvas(pageCanvas, ctx)) break;

      if (!(isFirstPageOverall && isFirstPageOfBlock)) doc.addPage();
      doc.addImage(pageCanvas.toDataURL("image/jpeg", 0.85), "JPEG", margin, margin, imgWidthPt, sliceHeightPx / pxPerPt, undefined, "FAST");

      renderedPx += sliceHeightPx;
      isFirstPageOfBlock = false;
    }
  }
}

/**
 * ワンクリックで請求書PDFを直接ダウンロードする（jsPDF + html2canvasによるクライアント側生成）。
 * サーバー往復なし、印刷ダイアログも経由しない。
 *
 * jsPDFの`doc.html()`ヘルパーは内部でのiframeクローン処理に起因して、
 * 環境によって白紙PDFが生成される不具合が報告されている。ここではhtml2canvasを
 * 直接呼び出してcanvasを取得し、その画像をjsPDFへ`addImage`する、より枯れた方式に
 * 切り替えている。
 *
 * v10 3.2：タイムチャージから計算した項目がある場合は別紙「タイムチャージ明細」を、
 * 実費系区分がある場合は別紙「実費一覧」を、それぞれ独立した新規ページとして自動生成する。
 */
export async function downloadInvoicePdf(inv: InvoiceForHtml): Promise<void> {
  const { jsPDF } = await import("jspdf");
  const doc = new jsPDF({ unit: "pt", format: "a4" });

  await appendHtmlBlock(doc, buildInvoiceElement(inv), true);

  if (inv.timeCharges && inv.timeCharges.length > 0) {
    await appendHtmlBlock(doc, buildTimeChargeAttachment(inv.timeCharges), false);
  }
  if (inv.expenses && inv.expenses.length > 0) {
    await appendHtmlBlock(doc, buildExpenseAttachment(inv.expenses), false);
  }

  doc.save(invoiceFileName(inv));
}
