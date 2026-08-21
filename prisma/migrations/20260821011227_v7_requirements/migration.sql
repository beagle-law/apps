-- AlterTable
ALTER TABLE "Case" ADD COLUMN     "isTimeChargeCase" BOOLEAN NOT NULL DEFAULT false;

-- AlterTable
ALTER TABLE "CaseTask" ADD COLUMN     "sortOrder" INTEGER;

-- AlterTable
ALTER TABLE "TimeCharge" ADD COLUMN     "endTime" TEXT NOT NULL DEFAULT '',
ADD COLUMN     "startTime" TEXT NOT NULL DEFAULT '';
