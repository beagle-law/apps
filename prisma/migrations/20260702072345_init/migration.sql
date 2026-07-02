-- CreateTable
CREATE TABLE "Case" (
    "id" TEXT NOT NULL,
    "caseNumber" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "clientName" TEXT NOT NULL,
    "caseCategory" TEXT NOT NULL,
    "stage" TEXT NOT NULL,
    "responseTypes" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "priority" TEXT NOT NULL DEFAULT '通常',
    "ballOwner" TEXT NOT NULL DEFAULT '事務所',
    "teamMembers" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "deadline" TEXT,
    "courtCaseNumber" TEXT NOT NULL DEFAULT '',
    "opposingCounselName" TEXT NOT NULL DEFAULT '',
    "opposingCounselAffiliation" TEXT NOT NULL DEFAULT '',
    "opposingCounselPhone" TEXT NOT NULL DEFAULT '',
    "opposingCounselEmail" TEXT NOT NULL DEFAULT '',
    "courtClerkName" TEXT NOT NULL DEFAULT '',
    "courtClerkAffiliation" TEXT NOT NULL DEFAULT '',
    "courtClerkPhone" TEXT NOT NULL DEFAULT '',
    "courtClerkEmail" TEXT NOT NULL DEFAULT '',
    "poaStatus" TEXT NOT NULL DEFAULT '未発送',
    "contractStatus" TEXT NOT NULL DEFAULT '未発送',
    "retainerStatus" TEXT NOT NULL DEFAULT '不要',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Case_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Hearing" (
    "id" TEXT NOT NULL,
    "caseId" TEXT NOT NULL,
    "date" TEXT NOT NULL,
    "time" TEXT NOT NULL DEFAULT '',
    "location" TEXT NOT NULL DEFAULT '',
    "url" TEXT NOT NULL DEFAULT '',
    "purpose" TEXT NOT NULL,
    "notes" TEXT NOT NULL DEFAULT '',

    CONSTRAINT "Hearing_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CaseTask" (
    "id" TEXT NOT NULL,
    "caseId" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "assignee" TEXT NOT NULL DEFAULT '',
    "status" TEXT NOT NULL DEFAULT '未着手',
    "dueDate" TEXT NOT NULL DEFAULT '',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CaseTask_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Question" (
    "id" TEXT NOT NULL,
    "caseId" TEXT NOT NULL,
    "text" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT '質問中',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Question_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CaseDocument" (
    "id" TEXT NOT NULL,
    "caseId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT '未着手',

    CONSTRAINT "CaseDocument_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "UpdateLog" (
    "id" TEXT NOT NULL,
    "caseId" TEXT NOT NULL,
    "timestamp" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "author" TEXT NOT NULL,
    "note" TEXT NOT NULL,
    "auto" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "UpdateLog_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Case_stage_idx" ON "Case"("stage");

-- CreateIndex
CREATE INDEX "Case_caseNumber_idx" ON "Case"("caseNumber");

-- CreateIndex
CREATE INDEX "Hearing_caseId_idx" ON "Hearing"("caseId");

-- CreateIndex
CREATE INDEX "Hearing_date_idx" ON "Hearing"("date");

-- CreateIndex
CREATE INDEX "CaseTask_caseId_idx" ON "CaseTask"("caseId");

-- CreateIndex
CREATE INDEX "CaseTask_status_idx" ON "CaseTask"("status");

-- CreateIndex
CREATE INDEX "Question_caseId_idx" ON "Question"("caseId");

-- CreateIndex
CREATE INDEX "CaseDocument_caseId_idx" ON "CaseDocument"("caseId");

-- CreateIndex
CREATE INDEX "UpdateLog_caseId_idx" ON "UpdateLog"("caseId");

-- AddForeignKey
ALTER TABLE "Hearing" ADD CONSTRAINT "Hearing_caseId_fkey" FOREIGN KEY ("caseId") REFERENCES "Case"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CaseTask" ADD CONSTRAINT "CaseTask_caseId_fkey" FOREIGN KEY ("caseId") REFERENCES "Case"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Question" ADD CONSTRAINT "Question_caseId_fkey" FOREIGN KEY ("caseId") REFERENCES "Case"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CaseDocument" ADD CONSTRAINT "CaseDocument_caseId_fkey" FOREIGN KEY ("caseId") REFERENCES "Case"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UpdateLog" ADD CONSTRAINT "UpdateLog_caseId_fkey" FOREIGN KEY ("caseId") REFERENCES "Case"("id") ON DELETE CASCADE ON UPDATE CASCADE;
