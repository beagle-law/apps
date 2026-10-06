-- AlterTable
ALTER TABLE "ClaimMemoEntry" ADD COLUMN     "lane" TEXT NOT NULL DEFAULT 'memo';

-- CreateTable
CREATE TABLE "MonthlyNote" (
    "id" TEXT NOT NULL,
    "yearMonth" TEXT NOT NULL,
    "content" TEXT NOT NULL DEFAULT '',
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MonthlyNote_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MoneyCard" (
    "id" TEXT NOT NULL,
    "yearMonth" TEXT NOT NULL,
    "kind" TEXT NOT NULL DEFAULT 'expense',
    "title" TEXT NOT NULL,
    "amount" INTEGER,
    "note" TEXT NOT NULL DEFAULT '',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "MoneyCard_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "MonthlyNote_yearMonth_key" ON "MonthlyNote"("yearMonth");

-- CreateIndex
CREATE INDEX "MoneyCard_yearMonth_idx" ON "MoneyCard"("yearMonth");
