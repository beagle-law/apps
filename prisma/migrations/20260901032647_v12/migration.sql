-- DropForeignKey
ALTER TABLE "Invoice" DROP CONSTRAINT "Invoice_caseId_fkey";

-- AlterTable
ALTER TABLE "Expense" ADD COLUMN     "checkedForBilling" BOOLEAN NOT NULL DEFAULT false;

-- AlterTable
ALTER TABLE "Invoice" ADD COLUMN     "addressee" TEXT NOT NULL DEFAULT '',
ADD COLUMN     "clientId" TEXT,
ADD COLUMN     "sourceExpenseIds" JSONB NOT NULL DEFAULT '[]',
ALTER COLUMN "caseId" DROP NOT NULL,
ALTER COLUMN "caseTitle" SET DEFAULT '';

-- CreateIndex
CREATE INDEX "Invoice_clientId_idx" ON "Invoice"("clientId");

-- AddForeignKey
ALTER TABLE "Invoice" ADD CONSTRAINT "Invoice_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "Client"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Invoice" ADD CONSTRAINT "Invoice_caseId_fkey" FOREIGN KEY ("caseId") REFERENCES "Case"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- DataMigration: 既存請求書のclientIdを、紐づく案件のclientIdから補完する（v12 3.1）
UPDATE "Invoice" i
SET "clientId" = c."clientId"
FROM "Case" c
WHERE i."caseId" = c.id AND c."clientId" IS NOT NULL AND i."clientId" IS NULL;
