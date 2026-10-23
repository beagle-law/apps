import { NextResponse } from "next/server";
import { getCurrentUser, isAdmin } from "@/lib/auth";
import { runBackup } from "@/lib/backup-run";

// 管理者が設定画面の「今すぐバックアップ」から実行する
export const maxDuration = 60;

export async function POST() {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "認証が必要です" }, { status: 401 });
  if (!isAdmin(user)) return NextResponse.json({ error: "管理者のみ実行できます" }, { status: 403 });

  const result = await runBackup("manual");
  return NextResponse.json(result);
}
