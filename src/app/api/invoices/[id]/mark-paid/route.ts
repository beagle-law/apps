import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";
import { invoiceInclude, serializeInvoice } from "@/lib/invoice-query";

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "認証が必要です" }, { status: 401 });

  const { id } = await params;
  const body = (await req.json()) as { paid?: boolean };
  const paid = body.paid ?? true;

  const updated = await prisma.invoice.update({
    where: { id },
    data: { paid, paidAt: paid ? new Date().toISOString().slice(0, 10) : "" },
    include: invoiceInclude,
  });
  return NextResponse.json(serializeInvoice(updated));
}
