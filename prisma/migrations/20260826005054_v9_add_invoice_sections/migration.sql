-- CreateTable
CREATE TABLE "InvoiceSection" (
    "id" TEXT NOT NULL,
    "invoiceId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "customTypeLabel" TEXT NOT NULL DEFAULT '',
    "applyTax" BOOLEAN NOT NULL DEFAULT false,
    "applyWithholding" BOOLEAN NOT NULL DEFAULT false,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "InvoiceSection_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "InvoiceSectionItem" (
    "id" TEXT NOT NULL,
    "sectionId" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "amount" INTEGER NOT NULL,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "InvoiceSectionItem_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "InvoiceSection_invoiceId_idx" ON "InvoiceSection"("invoiceId");

-- CreateIndex
CREATE INDEX "InvoiceSectionItem_sectionId_idx" ON "InvoiceSectionItem"("sectionId");

-- AddForeignKey
ALTER TABLE "InvoiceSection" ADD CONSTRAINT "InvoiceSection_invoiceId_fkey" FOREIGN KEY ("invoiceId") REFERENCES "Invoice"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InvoiceSectionItem" ADD CONSTRAINT "InvoiceSectionItem_sectionId_fkey" FOREIGN KEY ("sectionId") REFERENCES "InvoiceSection"("id") ON DELETE CASCADE ON UPDATE CASCADE;
