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

interface CreateInvoiceSectionBody {
  type: string;
  customTypeLabel?: string;
  applyTax?: boolean;
  applyWithholding?: boolean;
  items: { description: string; amount: number }[];
}

interface CreateInvoiceBody {
  caseId?: string;
  issueDate?: string;
  sections?: CreateInvoiceSectionBody[];
  notes?: string;
  billTimeChargeIds?: string[];
}

export async function POST(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "認証が必要です" }, { status: 401 });

  const body = (await req.json()) as CreateInvoiceBody;
  const sections = (body.sections || []).filter((s) => s.items.some((i) => i.description.trim() && i.amount !== undefined));
  if (!body.caseId || !body.issueDate || !sections.length) {
    return NextResponse.json({ error: "案件・発行日・区分の項目は必須です" }, { status: 400 });
  }

  const [targetCase, last] = await Promise.all([
    getAccessibleCaseOrNull(body.caseId, user.id),
    prisma.invoice.findFirst({ orderBy: { invoiceNumber: "desc" } }),
  ]);
  if (!targetCase) return NextResponse.json({ error: "案件が見つかりません" }, { status: 404 });

  const invoiceNumber = (last?.invoiceNumber ?? 0) + 1;

  const created = await prisma.$transaction(async (tx) => {
    const invoice = await tx.invoice.create({
      data: {
        invoiceNumber,
        caseId: body.caseId!,
        clientName: targetCase.clientName, // 既に暗号化済みの値をそのままスナップショットとしてコピー
        caseTitle: targetCase.title,
        issueDate: body.issueDate!,
        notes: body.notes?.trim() || "",
        sections: {
          create: sections.map((sec, secIdx) => ({
            type: sec.type,
            customTypeLabel: sec.customTypeLabel?.trim() || "",
            applyTax: sec.type === "弁護士報酬" ? !!sec.applyTax : false,
            applyWithholding: sec.type === "弁護士報酬" ? !!sec.applyWithholding : false,
            sortOrder: secIdx,
            items: {
              create: sec.items
                .filter((i) => i.description.trim() && i.amount !== undefined)
                .map((i, itemIdx) => ({ description: i.description.trim(), amount: Math.round(i.amount), sortOrder: itemIdx })),
            },
          })),
        },
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
