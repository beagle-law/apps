-- 案件ごとの回収額（未入力は NULL。既存データは変更しない）
ALTER TABLE "Case" ADD COLUMN "recoveredAmount" INTEGER;
