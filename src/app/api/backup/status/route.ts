import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser, isAdmin } from "@/lib/auth";
import { boxConfig } from "@/lib/box";

// 設定画面の「自動バックアップ」の表示用：Box連携が設定済みか、最近の実行結果
export async function GET() {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "認証が必要です" }, { status: 401 });
  if (!isAdmin(user)) return NextResponse.json({ error: "管理者のみ確認できます" }, { status: 403 });

  const logs = await prisma.backupLog.findMany({ orderBy: { createdAt: "desc" }, take: 10 });
  return NextResponse.json({
    boxConfigured: !!boxConfig(),
    cronConfigured: !!process.env.CRON_SECRET,
    logs: logs.map((l) => ({ id: l.id, createdAt: l.createdAt.toISOString(), trigger: l.trigger, ok: l.ok, fileName: l.fileName, sizeBytes: l.sizeBytes, message: l.message })),
  });
}
