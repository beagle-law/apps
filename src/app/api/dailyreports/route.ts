import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";
import { DAILY_REPORT_STAFF } from "@/lib/constants";

export async function POST(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "認証が必要です" }, { status: 401 });
  if (!DAILY_REPORT_STAFF.includes(user.displayName)) {
    return NextResponse.json({ error: "日報の対象者ではありません" }, { status: 403 });
  }

  const body = (await req.json()) as { date?: string; content?: string };
  if (!body.date || !body.content?.trim()) {
    return NextResponse.json({ error: "日付と内容は必須です" }, { status: 400 });
  }

  const created = await prisma.dailyReport.create({
    data: { personName: user.displayName, date: body.date, content: body.content.trim() },
  });
  return NextResponse.json({ ...created, createdAt: created.createdAt.toISOString() }, { status: 201 });
}
