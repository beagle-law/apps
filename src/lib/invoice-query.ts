import type { Prisma } from "@prisma/client";
import { decryptField } from "@/lib/crypto";

export const invoiceInclude = {
  sections: {
    orderBy: { sortOrder: "asc" },
    include: { items: { orderBy: { sortOrder: "asc" } } },
  },
  timeCharges: { orderBy: { date: "asc" } },
  expenses: { orderBy: { date: "asc" } },
} satisfies Prisma.InvoiceInclude;

export type FullInvoice = Prisma.InvoiceGetPayload<{ include: typeof invoiceInclude }>;

export function serializeInvoice(inv: FullInvoice) {
  return {
    id: inv.id,
    invoiceNumber: inv.invoiceNumber,
    clientId: inv.clientId,
    caseId: inv.caseId,
    clientName: decryptField(inv.clientName),
    addressee: inv.addressee,
    caseTitle: inv.caseTitle,
    issueDate: inv.issueDate,
    honorific: inv.honorific,
    dueDate: inv.dueDate,
    notes: inv.notes,
    sourceExpenseIds: Array.isArray(inv.sourceExpenseIds) ? inv.sourceExpenseIds : [],
    paid: inv.paid,
    paidAt: inv.paidAt,
    createdAt: inv.createdAt.toISOString(),
    sections: inv.sections.map((sec) => ({
      id: sec.id,
      type: sec.type,
      customTypeLabel: sec.customTypeLabel,
      applyTax: sec.applyTax,
      applyWithholding: sec.applyWithholding,
      items: sec.items.map((item) => ({ id: item.id, description: item.description, amount: item.amount })),
    })),
    // 別紙「タイムチャージ明細」用（v10 3.2）
    timeCharges: inv.timeCharges.map((tc) => ({
      id: tc.id,
      date: tc.date,
      startTime: tc.startTime,
      endTime: tc.endTime,
      hours: tc.hours,
      content: tc.content,
      personName: tc.personName,
    })),
    // 別紙「実費一覧」用（v10 3.2、v12 3.3で列を日付／金額／目的／経路に変更）
    expenses: inv.expenses.map((e) => ({
      id: e.id,
      date: e.date,
      category: e.category,
      amount: e.amount,
      origin: e.origin,
      destination: e.destination,
      route: e.route,
      notes: e.notes,
    })),
  };
}
