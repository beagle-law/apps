import type { Prisma } from "@prisma/client";
import { decryptField } from "@/lib/crypto";

export const invoiceInclude = {
  feeItems: true,
} satisfies Prisma.InvoiceInclude;

export type FullInvoice = Prisma.InvoiceGetPayload<{ include: typeof invoiceInclude }>;

export function serializeInvoice(inv: FullInvoice) {
  return {
    id: inv.id,
    invoiceNumber: inv.invoiceNumber,
    caseId: inv.caseId,
    clientName: decryptField(inv.clientName),
    caseTitle: inv.caseTitle,
    issueDate: inv.issueDate,
    applyTax: inv.applyTax,
    applyWithholding: inv.applyWithholding,
    expenseAmount: inv.expenseAmount,
    notes: inv.notes,
    paid: inv.paid,
    paidAt: inv.paidAt,
    createdAt: inv.createdAt.toISOString(),
    feeItems: inv.feeItems.map((f) => ({ id: f.id, description: f.description, amount: f.amount })),
  };
}
