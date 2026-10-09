-- 預り金の入金履歴（経費とは別枠）
CREATE TABLE "Deposit" (
    "id" TEXT NOT NULL,
    "caseId" TEXT NOT NULL,
    "date" TEXT NOT NULL,
    "amount" INTEGER NOT NULL,
    "notes" TEXT NOT NULL DEFAULT '',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Deposit_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Deposit_caseId_idx" ON "Deposit"("caseId");

-- AddForeignKey
ALTER TABLE "Deposit" ADD CONSTRAINT "Deposit_caseId_fkey" FOREIGN KEY ("caseId") REFERENCES "Case"("id") ON DELETE CASCADE ON UPDATE CASCADE;
