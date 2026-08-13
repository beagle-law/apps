// Renders an HTML string to a PDF buffer. Locally this launches the full
// `puppeteer` package (bundled Chromium, easy local dev). On Vercel it uses
// `puppeteer-core` + `@sparticuz/chromium` (a serverless-compatible Chromium
// binary) since the full puppeteer download doesn't fit/run in that
// environment. Both are dynamically imported so only the one actually
// needed for the current environment gets loaded.
export async function renderHtmlToPdf(html: string): Promise<Buffer> {
  const isServerless = !!process.env.VERCEL || !!process.env.AWS_LAMBDA_FUNCTION_NAME;

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let browser: any;
  try {
    if (isServerless) {
      const chromium = (await import("@sparticuz/chromium")).default;
      const puppeteer = await import("puppeteer-core");
      browser = await puppeteer.launch({
        args: chromium.args,
        executablePath: await chromium.executablePath(),
        headless: true,
      });
    } else {
      const puppeteer = await import("puppeteer");
      browser = await puppeteer.launch({ headless: true });
    }

    const page = await browser.newPage();
    await page.setContent(html, { waitUntil: "networkidle0" });
    const pdf = await page.pdf({ format: "A4", printBackground: true, margin: { top: "14mm", bottom: "14mm", left: "14mm", right: "14mm" } });
    return Buffer.from(pdf);
  } finally {
    if (browser) await browser.close();
  }
}
