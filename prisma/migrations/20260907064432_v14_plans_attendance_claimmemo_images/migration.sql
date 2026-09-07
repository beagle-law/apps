-- CreateTable
CREATE TABLE "CasePlan" (
    "id" TEXT NOT NULL,
    "caseId" TEXT NOT NULL,
    "date" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CasePlan_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ClaimMemoImage" (
    "id" TEXT NOT NULL,
    "claimMemoId" TEXT NOT NULL,
    "blobUrl" TEXT NOT NULL,
    "originalFileName" TEXT NOT NULL DEFAULT '',
    "fileSize" INTEGER NOT NULL DEFAULT 0,
    "mimeType" TEXT NOT NULL DEFAULT '',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ClaimMemoImage_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AttendanceRecord" (
    "id" TEXT NOT NULL,
    "personName" TEXT NOT NULL,
    "date" TEXT NOT NULL,
    "clockIn" TEXT NOT NULL DEFAULT '',
    "clockOut" TEXT NOT NULL DEFAULT '',
    "breakStart" TEXT NOT NULL DEFAULT '',
    "breakEnd" TEXT NOT NULL DEFAULT '',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AttendanceRecord_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "CasePlan_caseId_idx" ON "CasePlan"("caseId");

-- CreateIndex
CREATE INDEX "CasePlan_date_idx" ON "CasePlan"("date");

-- CreateIndex
CREATE INDEX "ClaimMemoImage_claimMemoId_idx" ON "ClaimMemoImage"("claimMemoId");

-- CreateIndex
CREATE INDEX "AttendanceRecord_personName_idx" ON "AttendanceRecord"("personName");

-- CreateIndex
CREATE UNIQUE INDEX "AttendanceRecord_personName_date_key" ON "AttendanceRecord"("personName", "date");

-- AddForeignKey
ALTER TABLE "CasePlan" ADD CONSTRAINT "CasePlan_caseId_fkey" FOREIGN KEY ("caseId") REFERENCES "Case"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ClaimMemoImage" ADD CONSTRAINT "ClaimMemoImage_claimMemoId_fkey" FOREIGN KEY ("claimMemoId") REFERENCES "ClaimMemoEntry"("id") ON DELETE CASCADE ON UPDATE CASCADE;
