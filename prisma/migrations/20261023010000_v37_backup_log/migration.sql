-- 自動バックアップの実行記録
CREATE TABLE "BackupLog" (
    "id" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "trigger" TEXT NOT NULL DEFAULT 'cron',
    "ok" BOOLEAN NOT NULL,
    "fileName" TEXT NOT NULL DEFAULT '',
    "sizeBytes" INTEGER NOT NULL DEFAULT 0,
    "message" TEXT NOT NULL DEFAULT '',

    CONSTRAINT "BackupLog_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "BackupLog_createdAt_idx" ON "BackupLog"("createdAt");
