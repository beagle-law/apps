import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";
import { getAccessibleCaseOrNull } from "@/lib/case-access";
import { invoiceInclude, serializeInvoice } from "@/lib/invoice-query";

export async function GET(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "認証が必要です" }, { status: 401 });

  const caseId = req.nextUrl.searchParams.get("caseId");
  const invoices = await prisma.invoice.findMany({
    where: caseId ? { caseId } : undefined,
    include: invoiceInclude,
    orderBy: { invoiceNumber: "desc" },
  });
  return NextResponse.json(invoices.map(serializeInvoice));
}

interface CreateInvoiceBody {
  caseId?: string;
  issueDate?: string;
  feeItems?: { description: string; amount: number }[];
  applyTax?: boolean;
  applyWithholding?: boolean;
  expenseAmount?: number;
  notes?: string;
  billTimeChargeIds?: string[];
}

export async function POST(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "認証が必要です" }, { status: 401 });

  const body = (await req.json()) as CreateInvoiceBody;
  if (!body.caseId || !body.issueDate || !body.feeItems?.length) {
    return NextResponse.json({ error: "案件・発行日・弁護士報酬項目は必須です" }, { status: 400 });
  }

  const targetCase = await getAccessibleCaseOrNull(body.caseId, user.id);
  if (!targetCase) return NextResponse.json({ error: "案件が見つかりません" }, { status: 404 });

  const last = await prisma.invoice.findFirst({ orderBy: { invoiceNumber: "desc" } });
  const invoiceNumber = (last?.invoiceNumber ?? 0) + 1;

  const created = await prisma.$transaction(async (tx) => {
    const invoice = await tx.invoice.create({
      data: {
        invoiceNumber,
        caseId: body.caseId!,
        clientName: targetCase.clientName, // 既に暗号化済みの値をそのままスナップショットとしてコピー
        caseTitle: targetCase.title,
        issueDate: body.issueDate!,
        applyTax: body.applyTax ?? true,
        applyWithholding: body.applyWithholding ?? true,
        expenseAmount: Math.round(Number(body.expenseAmount) || 0),
        notes: body.notes?.trim() || "",
        feeItems: { create: body.feeItems!.map((f) => ({ description: f.description, amount: Math.round(f.amount) })) },
      },
      include: invoiceInclude,
    });

    if (body.billTimeChargeIds?.length) {
      await tx.timeCharge.updateMany({
        where: { id: { in: body.billTimeChargeIds }, caseId: body.caseId!, billed: false },
        data: { billed: true, invoiceId: invoice.id },
      });
    }
    return invoice;
  });

  return NextResponse.json(serializeInvoice(created), { status: 201 });
}
