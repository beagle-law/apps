/*
  Warnings:

  - You are about to drop the column `opposingCounselContactAffiliation` on the `Case` table. All the data in the column will be lost.
  - You are about to drop the column `opposingCounselContactEmail` on the `Case` table. All the data in the column will be lost.
  - You are about to drop the column `opposingCounselContactFax` on the `Case` table. All the data in the column will be lost.
  - You are about to drop the column `opposingCounselContactName` on the `Case` table. All the data in the column will be lost.
  - You are about to drop the column `opposingCounselContactPhone` on the `Case` table. All the data in the column will be lost.
  - You are about to drop the column `opposingCounselName` on the `Case` table. All the data in the column will be lost.
  - You are about to drop the column `tradeName` on the `Client` table. All the data in the column will be lost.
  - You are about to drop the `CaseDocument` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `Question` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropForeignKey
ALTER TABLE "CaseDocument" DROP CONSTRAINT "CaseDocument_caseId_fkey";

-- DropForeignKey
ALTER TABLE "Question" DROP CONSTRAINT "Question_caseId_fkey";

-- AlterTable
ALTER TABLE "Case" DROP COLUMN "opposingCounselContactAffiliation",
DROP COLUMN "opposingCounselContactEmail",
DROP COLUMN "opposingCounselContactFax",
DROP COLUMN "opposingCounselContactName",
DROP COLUMN "opposingCounselContactPhone",
DROP COLUMN "opposingCounselName",
ADD COLUMN     "opposingCounselContactMethod" TEXT NOT NULL DEFAULT '',
ADD COLUMN     "opposingCounselEmail" TEXT NOT NULL DEFAULT '',
ADD COLUMN     "opposingCounselFax" TEXT NOT NULL DEFAULT '',
ADD COLUMN     "opposingCounselOffice" TEXT NOT NULL DEFAULT '',
ADD COLUMN     "opposingCounselPersonName" TEXT NOT NULL DEFAULT '',
ADD COLUMN     "opposingCounselPhone" TEXT NOT NULL DEFAULT '',
ADD COLUMN     "opposingPartyContactMethod" TEXT NOT NULL DEFAULT '',
ADD COLUMN     "opposingPartyPhone" TEXT NOT NULL DEFAULT '';

-- AlterTable
ALTER TABLE "Client" DROP COLUMN "tradeName";

-- DropTable
DROP TABLE "CaseDocument";

-- DropTable
DROP TABLE "Question";
