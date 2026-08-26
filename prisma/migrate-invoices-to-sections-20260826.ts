import { PrismaClient } from "@prisma/client";

// v9データ移行：旧構造（Invoice.applyTax/applyWithholding/expenseAmount + FeeItem[]）を
// 新構造（InvoiceSection[] + InvoiceSectionItem[]）に変換する。
// 「v9_add_invoice_sections」マイグレーション適用後・「v9_drop_invoice_legacy_fields」
// マイグレーション適用前に一度だけ実行すること。
// 変換規則（要件定義書v9 3.8のnormalizeInvoiceSectionsと同じ）：
//   第1 = 弁護士報酬（旧feeItems、旧applyTax/applyWithholding）
//   第2 = 実費お預かり金（旧expenseAmountが0でなければ、1項目「実費預り金」として追加）

async function main() {
  const prisma = new PrismaClient();
  try {
    const invoices: any = await prisma.$queryRawUnsafe(
      `SELECT id, "applyTax", "applyWithholding", "expenseAmount" FROM "Invoice"`
    );
    console.log(`対象請求書：${invoices.length}件`);

    for (const inv of invoices) {
      const existingSections: any = await prisma.$queryRawUnsafe(
        `SELECT id FROM "InvoiceSection" WHERE "invoiceId" = '${inv.id}'`
      );
      if (existingSections.length > 0) {
        console.log(`スキップ（既に区分あり）：${inv.id}`);
        continue;
      }

      const feeItems: any = await prisma.$queryRawUnsafe(
        `SELECT description, amount FROM "FeeItem" WHERE "invoiceId" = '${inv.id}'`
      );

      const feeSection = await prisma.invoiceSection.create({
        data: {
          invoiceId: inv.id,
          type: "弁護士報酬",
          applyTax: !!inv.applyTax,
          applyWithholding: !!inv.applyWithholding,
          sortOrder: 0,
          items: {
            create: feeItems.map((f: any, idx: number) => ({
              description: f.description,
              amount: f.amount,
              sortOrder: idx,
            })),
          },
        },
      });
      console.log(`作成：弁護士報酬区分 ${feeSection.id}（項目${feeItems.length}件）`);

      if (Number(inv.expenseAmount) !== 0) {
        const expenseSection = await prisma.invoiceSection.create({
          data: {
            invoiceId: inv.id,
            type: "実費お預かり金",
            applyTax: false,
            applyWithholding: false,
            sortOrder: 1,
            items: {
              create: [{ description: "実費預り金", amount: Number(inv.expenseAmount), sortOrder: 0 }],
            },
          },
        });
        console.log(`作成：実費お預かり金区分 ${expenseSection.id}`);
      }
    }
    console.log("移行完了");
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
