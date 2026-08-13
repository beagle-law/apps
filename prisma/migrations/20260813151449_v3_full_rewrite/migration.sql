/*
  Warnings:

  - You are about to drop the column `caseCategory` on the `Case` table. All the data in the column will be lost.
  - You are about to drop the column `opposingCounselAffiliation` on the `Case` table. All the data in the column will be lost.
  - You are about to drop the column `opposingCounselEmail` on the `Case` table. All the data in the column will be lost.
  - You are about to drop the column `opposingCounselPhone` on the `Case` table. All the data in the column will be lost.
  - You are about to drop the column `responseTypes` on the `Case` table. All the data in the column will be lost.
  - You are about to drop the column `location` on the `Hearing` table. All the data in the column will be lost.
  - You are about to drop the column `notes` on the `Hearing` table. All the data in the column will be lost.
  - You are about to drop the column `purpose` on the `Hearing` table. All the data in the column will be lost.
  - You are about to drop the column `time` on the `Hearing` table. All the data in the column will be lost.
  - You are about to drop the column `url` on the `Hearing` table. All the data in the column will be lost.
  - Made the column `deadline` on table `Case` required. This step will fail if there are existing NULL values in that column.
  - Added the required column `content` to the `Hearing` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "Case" DROP COLUMN "caseCategory",
DROP COLUMN "opposingCounselAffiliation",
DROP COLUMN "opposingCounselEmail",
DROP COLUMN "opposingCounselPhone",
DROP COLUMN "responseTypes",
ADD COLUMN     "ballAssignee" TEXT NOT NULL DEFAULT '',
ADD COLUMN     "caseClassification" TEXT NOT NULL DEFAULT '',
ADD COLUMN     "claimAmount" INTEGER,
ADD COLUMN     "claimMemo" TEXT NOT NULL DEFAULT '',
ADD COLUMN     "clientId" TEXT,
ADD COLUMN     "courtClerkFax" TEXT NOT NULL DEFAULT '',
ADD COLUMN     "engagementDate" TEXT NOT NULL DEFAULT '',
ADD COLUMN     "expectedFee" INTEGER,
ADD COLUMN     "expectedFeeDate" TEXT NOT NULL DEFAULT '',
ADD COLUMN     "filingDate" TEXT NOT NULL DEFAULT '',
ADD COLUMN     "hidden" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "isPrivate" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "litigationEngagementDate" TEXT NOT NULL DEFAULT '',
ADD COLUMN     "noticeSentDate" TEXT NOT NULL DEFAULT '',
ADD COLUMN     "opposingCounselContactAffiliation" TEXT NOT NULL DEFAULT '',
ADD COLUMN     "opposingCounselContactEmail" TEXT NOT NULL DEFAULT '',
ADD COLUMN     "opposingCounselContactFax" TEXT NOT NULL DEFAULT '',
ADD COLUMN     "opposingCounselContactName" TEXT NOT NULL DEFAULT '',
ADD COLUMN     "opposingCounselContactPhone" TEXT NOT NULL DEFAULT '',
ADD COLUMN     "opposingParty" TEXT NOT NULL DEFAULT '',
ADD COLUMN     "ownerId" TEXT,
ADD COLUMN     "retainerFee" INTEGER,
ALTER COLUMN "deadline" SET NOT NULL,
ALTER COLUMN "deadline" SET DEFAULT '',
ALTER COLUMN "poaStatus" SET DEFAULT '対応不要',
ALTER COLUMN "contractStatus" SET DEFAULT '対応不要',
ALTER COLUMN "retainerStatus" SET DEFAULT '対応不要';

-- AlterTable
ALTER TABLE "CaseDocument" ADD COLUMN     "dueDate" TEXT NOT NULL DEFAULT '';

-- AlterTable
ALTER TABLE "CaseTask" ADD COLUMN     "assignedBy" TEXT NOT NULL DEFAULT '',
ADD COLUMN     "completedAt" TEXT NOT NULL DEFAULT '',
ADD COLUMN     "executionScore" INTEGER,
ADD COLUMN     "handedBackFrom" TEXT NOT NULL DEFAULT '',
ADD COLUMN     "isInstruction" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "kind" TEXT NOT NULL DEFAULT 'task',
ADD COLUMN     "points" INTEGER,
ADD COLUMN     "sourceField" TEXT,
ADD COLUMN     "waitingOn" TEXT NOT NULL DEFAULT '';

-- AlterTable
ALTER TABLE "Hearing" DROP COLUMN "location",
DROP COLUMN "notes",
DROP COLUMN "purpose",
DROP COLUMN "time",
DROP COLUMN "url",
ADD COLUMN     "content" TEXT NOT NULL,
ADD COLUMN     "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "docDeadline" TEXT NOT NULL DEFAULT '',
ADD COLUMN     "nextHearingDate" TEXT NOT NULL DEFAULT '';

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "loginId" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "displayName" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "role" TEXT NOT NULL DEFAULT 'user',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AuditLog" (
    "id" TEXT NOT NULL,
    "userId" TEXT,
    "action" TEXT NOT NULL,
    "targetType" TEXT NOT NULL DEFAULT '',
    "targetId" TEXT NOT NULL DEFAULT '',
    "note" TEXT NOT NULL DEFAULT '',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AuditLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Client" (
    "id" TEXT NOT NULL,
    "clientNumber" INTEGER NOT NULL,
    "companyName" TEXT NOT NULL,
    "tradeName" TEXT NOT NULL DEFAULT '',
    "address" TEXT NOT NULL DEFAULT '',
    "contactName" TEXT NOT NULL DEFAULT '',
    "phone" TEXT NOT NULL DEFAULT '',
    "email" TEXT NOT NULL DEFAULT '',
    "contactMethod" TEXT NOT NULL DEFAULT '',
    "source" TEXT NOT NULL DEFAULT '',
    "notes" TEXT NOT NULL DEFAULT '',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Client_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Expense" (
    "id" TEXT NOT NULL,
    "caseId" TEXT NOT NULL,
    "date" TEXT NOT NULL,
    "amount" INTEGER NOT NULL,
    "category" TEXT NOT NULL,
    "origin" TEXT NOT NULL DEFAULT '',
    "destination" TEXT NOT NULL DEFAULT '',
    "route" TEXT NOT NULL DEFAULT '',
    "notes" TEXT NOT NULL DEFAULT '',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Expense_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TimeCharge" (
    "id" TEXT NOT NULL,
    "personName" TEXT NOT NULL,
    "date" TEXT NOT NULL,
    "caseId" TEXT NOT NULL,
    "hours" DOUBLE PRECISION NOT NULL,
    "content" TEXT NOT NULL DEFAULT '',
    "billed" BOOLEAN NOT NULL DEFAULT false,
    "invoiceId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TimeCharge_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DailyReport" (
    "id" TEXT NOT NULL,
    "personName" TEXT NOT NULL,
    "date" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "DailyReport_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PasswordEntry" (
    "id" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "service" TEXT NOT NULL,
    "url" TEXT NOT NULL DEFAULT '',
    "username" TEXT NOT NULL DEFAULT '',
    "password" TEXT NOT NULL,
    "notes" TEXT NOT NULL DEFAULT '',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PasswordEntry_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "GoalRecord" (
    "id" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "yearMonth" TEXT NOT NULL,
    "overallPercent" TEXT NOT NULL DEFAULT '',

    CONSTRAINT "GoalRecord_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "GoalItem" (
    "id" TEXT NOT NULL,
    "goalRecordId" TEXT NOT NULL,
    "text" TEXT NOT NULL,
    "result" TEXT NOT NULL DEFAULT '',
    "note" TEXT NOT NULL DEFAULT '',

    CONSTRAINT "GoalItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "KnowhowEntry" (
    "id" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "KnowhowEntry_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Template" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "content" TEXT NOT NULL DEFAULT '',
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Template_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Invoice" (
    "id" TEXT NOT NULL,
    "invoiceNumber" INTEGER NOT NULL,
    "caseId" TEXT NOT NULL,
    "clientName" TEXT NOT NULL,
    "caseTitle" TEXT NOT NULL,
    "issueDate" TEXT NOT NULL,
    "applyTax" BOOLEAN NOT NULL DEFAULT true,
    "applyWithholding" BOOLEAN NOT NULL DEFAULT true,
    "expenseAmount" INTEGER NOT NULL DEFAULT 0,
    "notes" TEXT NOT NULL DEFAULT '',
    "paid" BOOLEAN NOT NULL DEFAULT false,
    "paidAt" TEXT NOT NULL DEFAULT '',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Invoice_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FeeItem" (
    "id" TEXT NOT NULL,
    "invoiceId" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "amount" INTEGER NOT NULL,

    CONSTRAINT "FeeItem_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_loginId_key" ON "User"("loginId");

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE INDEX "AuditLog_userId_idx" ON "AuditLog"("userId");

-- CreateIndex
CREATE INDEX "AuditLog_createdAt_idx" ON "AuditLog"("createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "Client_clientNumber_key" ON "Client"("clientNumber");

-- CreateIndex
CREATE INDEX "Expense_caseId_idx" ON "Expense"("caseId");

-- CreateIndex
CREATE INDEX "TimeCharge_personName_idx" ON "TimeCharge"("personName");

-- CreateIndex
CREATE INDEX "TimeCharge_caseId_idx" ON "TimeCharge"("caseId");

-- CreateIndex
CREATE INDEX "TimeCharge_invoiceId_idx" ON "TimeCharge"("invoiceId");

-- CreateIndex
CREATE INDEX "DailyReport_personName_idx" ON "DailyReport"("personName");

-- CreateIndex
CREATE INDEX "PasswordEntry_category_idx" ON "PasswordEntry"("category");

-- CreateIndex
CREATE UNIQUE INDEX "GoalRecord_key_yearMonth_key" ON "GoalRecord"("key", "yearMonth");

-- CreateIndex
CREATE INDEX "GoalItem_goalRecordId_idx" ON "GoalItem"("goalRecordId");

-- CreateIndex
CREATE INDEX "KnowhowEntry_category_idx" ON "KnowhowEntry"("category");

-- CreateIndex
CREATE UNIQUE INDEX "Invoice_invoiceNumber_key" ON "Invoice"("invoiceNumber");

-- CreateIndex
CREATE INDEX "Invoice_caseId_idx" ON "Invoice"("caseId");

-- CreateIndex
CREATE INDEX "FeeItem_invoiceId_idx" ON "FeeItem"("invoiceId");

-- CreateIndex
CREATE INDEX "Case_clientId_idx" ON "Case"("clientId");

-- CreateIndex
CREATE INDEX "Case_ownerId_idx" ON "Case"("ownerId");

-- CreateIndex
CREATE INDEX "CaseTask_assignee_idx" ON "CaseTask"("assignee");

-- AddForeignKey
ALTER TABLE "AuditLog" ADD CONSTRAINT "AuditLog_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Case" ADD CONSTRAINT "Case_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "Client"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Case" ADD CONSTRAINT "Case_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Expense" ADD CONSTRAINT "Expense_caseId_fkey" FOREIGN KEY ("caseId") REFERENCES "Case"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TimeCharge" ADD CONSTRAINT "TimeCharge_caseId_fkey" FOREIGN KEY ("caseId") REFERENCES "Case"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TimeCharge" ADD CONSTRAINT "TimeCharge_invoiceId_fkey" FOREIGN KEY ("invoiceId") REFERENCES "Invoice"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GoalItem" ADD CONSTRAINT "GoalItem_goalRecordId_fkey" FOREIGN KEY ("goalRecordId") REFERENCES "GoalRecord"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Invoice" ADD CONSTRAINT "Invoice_caseId_fkey" FOREIGN KEY ("caseId") REFERENCES "Case"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FeeItem" ADD CONSTRAINT "FeeItem_invoiceId_fkey" FOREIGN KEY ("invoiceId") REFERENCES "Invoice"("id") ON DELETE CASCADE ON UPDATE CASCADE;
