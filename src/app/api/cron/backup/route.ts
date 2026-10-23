import { NextRequest, NextResponse } from "next/server";
import { runBackup } from "@/lib/backup-run";

// 毎日0:00（日本時間）に、Vercelのスケジュール機能（vercel.json の crons）から呼ばれる。
// Vercelは環境変数 CRON_SECRET を設定していると、「Authorization: Bearer <CRON_SECRET>」を付けて呼び出す。
export const maxDuration = 60;

export async function GET(req: NextRequest) {
  const secret = process.env.CRON_SECRET;
  if (!secret || req.headers.get("authorization") !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "認証が必要です" }, { status: 401 });
  }
  const result = await runBackup("cron");
  return NextResponse.json(result, { status: result.ok ? 200 : 500 });
}
