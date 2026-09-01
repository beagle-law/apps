import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";
import { caseVisibilityFilter } from "@/lib/case-access";
import { invoiceInclude, serializeInvoice } from "@/lib/invoice-query";
import { endOfMonth } from "@/lib/dates";
import { EXPENSE_LIKE_SECTION_TYPES } from "@/lib/constants";
import { encryptField } from "@/lib/crypto";

export async function GET(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "認証が必要です" }, { status: 401 });

  const clientId = req.nextUrl.searchParams.get("clientId");
  const caseId = req.nextUrl.searchParams.get("caseId");
  const invoices = await prisma.invoice.findMany({
    where: clientId ? { clientId } : caseId ? { caseId } : undefined,
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
  clientId?: string;
  addressee?: string;
  issueDate?: string;
  honorific?: string;
  dueDate?: string;
  sections?: CreateInvoiceSectionBody[];
  notes?: string;
  billTimeChargeIds?: string[];
  billExpenseIds?: string[];
}

// v12 3.1：請求書は「顧客」に紐づけて作成する。1顧客の複数案件をまたいで
// タイムチャージ・実費を合算できる。
export async function POST(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "認証が必要です" }, { status: 401 });

  const body = (await req.json()) as CreateInvoiceBody;
  const sections = (body.sections || []).filter((s) => s.items.some((i) => i.description.trim() && i.amount !== undefined));
  if (!body.clientId || !body.issueDate || !sections.length) {
    return NextResponse.json({ error: "顧客・発行日・区分の項目は必須です" }, { status: 400 });
  }

  const [client, last] = await Promise.all([
    prisma.client.findUnique({ where: { id: body.clientId } }),
    prisma.invoice.findFirst({ orderBy: { invoiceNumber: "desc" } }),
  ]);
  if (!client) return NextResponse.json({ error: "顧客が見つかりません" }, { status: 404 });

  const invoiceNumber = (last?.invoiceNumber ?? 0) + 1;

  // 宛先は自由入力欄（空欄なら顧客名）。宛名の敬称は依頼者の区分（法人/個人）から自動判定（v10 3.2）。
  const addressee = body.addressee?.trim() || "";
  const printedName = addressee || client.companyName;
  let honorific = body.honorific?.trim();
  if (!honorific) {
    honorific = client.clientType === "個人" ? "様" : "御中";
  }
  const dueDate = body.dueDate?.trim() || endOfMonth(body.issueDate!);

  const hasExpenseLikeSection = sections.some((s) => EXPENSE_LIKE_SECTION_TYPES.includes(s.type));
  const billExpenseIds = hasExpenseLikeSection ? body.billExpenseIds || [] : [];

  const created = await prisma.$transaction(async (tx) => {
    const invoice = await tx.invoice.create({
      data: {
        invoiceNumber,
        clientId: body.clientId!,
        clientName: encryptField(printedName),
        addressee,
        issueDate: body.issueDate!,
        honorific,
        dueDate,
        notes: body.notes?.trim() || "",
        sourceExpenseIds: billExpenseIds,
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
        where: {
          id: { in: body.billTimeChargeIds },
          billed: false,
          case: { clientId: body.clientId!, ...caseVisibilityFilter(user.id) },
        },
        data: { billed: true, invoiceId: invoice.id },
      });
    }
    if (billExpenseIds.length) {
      await tx.expense.updateMany({
        where: {
          id: { in: billExpenseIds },
          billedInInvoiceId: null,
          case: { clientId: body.clientId!, ...caseVisibilityFilter(user.id) },
        },
        data: { billedInInvoiceId: invoice.id, checkedForBilling: false },
      });
    }
    return invoice;
  });

  const withBilling = await prisma.invoice.findUnique({ where: { id: created.id }, include: invoiceInclude });
  return NextResponse.json(serializeInvoice(withBilling!), { status: 201 });
}
