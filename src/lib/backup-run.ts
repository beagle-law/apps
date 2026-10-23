import { prisma } from "@/lib/prisma";
import { buildFullBackup, backupFileName } from "@/lib/backup";
import { uploadBackupToBox, pruneOldBackups, boxConfig } from "@/lib/box";

const KEEP_DAYS = 30; // 保存日数

export interface BackupResult {
  ok: boolean;
  fileName: string;
  sizeBytes: number;
  message: string;
}

/** 全データを書き出し、Boxへ保存して、古いバックアップを削除する。結果は BackupLog に記録する。 */
export async function runBackup(trigger: "cron" | "manual"): Promise<BackupResult> {
  const fileName = backupFileName();
  let sizeBytes = 0;
  let result: BackupResult;
  try {
    if (!boxConfig()) throw new Error("Boxの連携が未設定です（環境変数 BOX_CLIENT_ID・BOX_CLIENT_SECRET・BOX_ENTERPRISE_ID・BOX_BACKUP_FOLDER_ID を設定してください）。");
    const { data, counts } = await buildFullBackup();
    const buf = Buffer.from(JSON.stringify(data), "utf-8");
    sizeBytes = buf.length;
    const { folderName } = await uploadBackupToBox(fileName, buf);
    let message = `保存しました${folderName ? `［保存先：${folderName}］` : ""}（案件${counts.cases}件・顧客${counts.clients}件・請求書${counts.invoices}件など）`;
    try {
      const deleted = await pruneOldBackups(KEEP_DAYS);
      if (deleted > 0) message += `。${KEEP_DAYS}日より古いバックアップを${deleted}件削除しました`;
    } catch (e) {
      message += `。古いバックアップの削除に失敗しました：${e instanceof Error ? e.message : ""}`;
    }
    result = { ok: true, fileName, sizeBytes, message };
  } catch (e) {
    result = { ok: false, fileName, sizeBytes, message: e instanceof Error ? e.message : "バックアップに失敗しました" };
  }
  await prisma.backupLog.create({ data: { trigger, ok: result.ok, fileName: result.fileName, sizeBytes: result.sizeBytes, message: result.message.slice(0, 500) } }).catch(() => undefined);
  return result;
}
