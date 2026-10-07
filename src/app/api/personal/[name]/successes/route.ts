import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";
import { DAILY_REPORT_STAFF } from "@/lib/constants";

// v23：目標画面「積み重ね」用。日報の「本日の成功」だけを、ログイン中の全員がメンバー全員分閲覧できる。
// （日報のその他の項目や稼働時間は返さないため、個人画面の閲覧制限は従来どおり）
export async function GET(_req: NextRequest, { params }: { params: Promise<{ name: string }> }) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "認証が必要です" }, { status: 401 });

  const { name } = await params;
  if (!DAILY_REPORT_STAFF.includes(name)) {
    return NextResponse.json({ error: "対象者が不正です" }, { status: 400 });
  }

  const reports = await prisma.dailyReport.findMany({
    where: { personName: name, todaySuccess: { not: "" } },
    select: { id: true, date: true, todaySuccess: true },
    orderBy: { date: "desc" },
  });
  return NextResponse.json(reports);
}
