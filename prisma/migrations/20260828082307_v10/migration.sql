/*
  Warnings:

  - You are about to drop the column `content` on the `Template` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "Case" ADD COLUMN     "closedDate" TEXT NOT NULL DEFAULT '',
ADD COLUMN     "customFields" JSONB NOT NULL DEFAULT '[]',
ADD COLUMN     "timeChargeRate" INTEGER;

-- AlterTable
ALTER TABLE "Expense" ADD COLUMN     "billedInInvoiceId" TEXT;

-- AlterTable
ALTER TABLE "GoalRecord" ADD COLUMN     "memo" TEXT NOT NULL DEFAULT '';

-- AlterTable
ALTER TABLE "Invoice" ADD COLUMN     "dueDate" TEXT NOT NULL DEFAULT '',
ADD COLUMN     "honorific" TEXT NOT NULL DEFAULT '御中';

-- AlterTable
ALTER TABLE "Template" DROP COLUMN "content",
ADD COLUMN     "blobUrl" TEXT NOT NULL DEFAULT '',
ADD COLUMN     "fileSize" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "mimeType" TEXT NOT NULL DEFAULT '',
ADD COLUMN     "originalFileName" TEXT NOT NULL DEFAULT '';

-- CreateTable
CREATE TABLE "CaseClassification" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CaseClassification_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "CaseClassification_name_key" ON "CaseClassification"("name");

-- CreateIndex
CREATE INDEX "Expense_billedInInvoiceId_idx" ON "Expense"("billedInInvoiceId");

-- AddForeignKey
ALTER TABLE "Expense" ADD CONSTRAINT "Expense_billedInInvoiceId_fkey" FOREIGN KEY ("billedInInvoiceId") REFERENCES "Invoice"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- DataMigration: stageを6段階から3値（受任前/受任・対応中/終結）に統合（v10 3.1）
UPDATE "Case" SET "stage" = '受任前' WHERE "stage" IN ('新規問合せ・紹介', '初回面談調整中', '面談済み・受任検討中');
UPDATE "Case" SET "stage" = '終結' WHERE "stage" = '受任せず（終了）';
