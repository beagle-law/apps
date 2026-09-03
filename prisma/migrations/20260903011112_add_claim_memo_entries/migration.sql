-- CreateTable
CREATE TABLE "ClaimMemoEntry" (
    "id" TEXT NOT NULL,
    "caseId" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "author" TEXT NOT NULL DEFAULT '',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ClaimMemoEntry_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ClaimMemoEntry_caseId_idx" ON "ClaimMemoEntry"("caseId");

-- AddForeignKey
ALTER TABLE "ClaimMemoEntry" ADD CONSTRAINT "ClaimMemoEntry_caseId_fkey" FOREIGN KEY ("caseId") REFERENCES "Case"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- DataMigration: 既存の単一テキストの主張予定メモを、積み重ね式メモの最初の1件として移行する
INSERT INTO "ClaimMemoEntry" ("id", "caseId", "content", "author", "createdAt")
SELECT gen_random_uuid()::text, "id", "claimMemo", '', "updatedAt"
FROM "Case"
WHERE "claimMemo" IS NOT NULL AND trim("claimMemo") <> '';
