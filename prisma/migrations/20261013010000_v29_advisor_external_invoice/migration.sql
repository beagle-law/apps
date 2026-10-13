-- 顧問契約先フラグ・外部作成の請求書フラグ（いずれも既定は false。既存データは変更しない）
ALTER TABLE "Client" ADD COLUMN "isAdvisor" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "Invoice" ADD COLUMN "isExternal" BOOLEAN NOT NULL DEFAULT false;
