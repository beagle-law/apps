import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";
import { invoiceInclude, serializeInvoice } from "@/lib/invoice-query";

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "認証が必要です" }, { status: 401 });

  const { id } = await params;
  const invoice = await prisma.invoice.findUnique({ where: { id }, include: invoiceInclude });
  if (!invoice) return NextResponse.json({ error: "請求書が見つかりません" }, { status: 404 });
  return NextResponse.json(serializeInvoice(invoice));
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "認証が必要です" }, { status: 401 });

  const { id } = await params;
  await prisma.$transaction([
    prisma.timeCharge.updateMany({ where: { invoiceId: id }, data: { billed: false, invoiceId: null } }),
    prisma.invoice.delete({ where: { id } }),
  ]);
  return NextResponse.json({ ok: true });
}
