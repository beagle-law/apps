-- DropForeignKey
ALTER TABLE "FeeItem" DROP CONSTRAINT "FeeItem_invoiceId_fkey";

-- AlterTable
ALTER TABLE "Invoice" DROP COLUMN "applyTax",
DROP COLUMN "applyWithholding",
DROP COLUMN "expenseAmount";

-- DropTable
DROP TABLE "FeeItem";
