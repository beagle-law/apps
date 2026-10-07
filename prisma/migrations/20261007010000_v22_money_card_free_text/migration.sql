-- お金の情報カードを「月に紐づかないフリー入力カード」に簡略化（テーブルは未使用のため空）
DROP INDEX IF EXISTS "MoneyCard_yearMonth_idx";
ALTER TABLE "MoneyCard" DROP COLUMN "yearMonth",
DROP COLUMN "kind",
DROP COLUMN "title",
DROP COLUMN "amount",
DROP COLUMN "note",
ADD COLUMN "content" TEXT NOT NULL DEFAULT '';
