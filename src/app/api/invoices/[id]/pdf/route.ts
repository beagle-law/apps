import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";
import { invoiceInclude, serializeInvoice } from "@/lib/invoice-query";
import { buildInvoiceHtml } from "@/lib/pdf/invoice-html";
import { renderHtmlToPdf } from "@/lib/pdf/render";

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "認証が必要です" }, { status: 401 });

  const { id } = await params;
  const invoice = await prisma.invoice.findUnique({ where: { id }, include: invoiceInclude });
  if (!invoice) return NextResponse.json({ error: "請求書が見つかりません" }, { status: 404 });

  const data = serializeInvoice(invoice);
  const html = buildInvoiceHtml(data);

  let pdf: Buffer;
  try {
    pdf = await renderHtmlToPdf(html);
  } catch (e) {
    console.error("Invoice PDF generation failed", e);
    return NextResponse.json({ error: "PDFの生成に失敗しました" }, { status: 500 });
  }

  const filename = `ご請求書_${data.invoiceNumber}.pdf`;
  return new NextResponse(new Uint8Array(pdf), {
    status: 200,
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="invoice.pdf"; filename*=UTF-8''${encodeURIComponent(filename)}`,
    },
  });
}
