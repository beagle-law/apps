-- 経費入力ボードの手動「請求済み」チェック（既定は未チェック）
ALTER TABLE "Expense" ADD COLUMN "billedManually" BOOLEAN NOT NULL DEFAULT false;
