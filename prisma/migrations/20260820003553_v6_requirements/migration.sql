/*
  Warnings:

  - You are about to drop the column `content` on the `DailyReport` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "Case" ADD COLUMN     "catchAllFor" TEXT NOT NULL DEFAULT '';

-- AlterTable
ALTER TABLE "Client" ADD COLUMN     "clientType" TEXT NOT NULL DEFAULT '法人',
ADD COLUMN     "referrerName" TEXT NOT NULL DEFAULT '';

-- AlterTable
ALTER TABLE "DailyReport" DROP COLUMN "content",
ADD COLUMN     "caseId" TEXT,
ADD COLUMN     "mostImportant" TEXT NOT NULL DEFAULT '',
ADD COLUMN     "todaySuccess" TEXT NOT NULL DEFAULT '',
ADD COLUMN     "todayTasks" TEXT NOT NULL DEFAULT '',
ADD COLUMN     "waitingCases" TEXT NOT NULL DEFAULT '';
