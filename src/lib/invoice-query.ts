import type { Prisma } from "@prisma/client";
import { decryptField } from "@/lib/crypto";

export const invoiceInclude = {
  sections: {
    orderBy: { sortOrder: "asc" },
    include: { items: { orderBy: { sortOrder: "asc" } } },
  },
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
    notes: inv.notes,
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
  };
}
