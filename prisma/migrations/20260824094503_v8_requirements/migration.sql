-- DropForeignKey
ALTER TABLE "CaseTask" DROP CONSTRAINT "CaseTask_caseId_fkey";

-- AlterTable
ALTER TABLE "Case" DROP COLUMN "catchAllFor",
DROP COLUMN "teamMembers";

-- DropTable
DROP TABLE "CaseTask";
