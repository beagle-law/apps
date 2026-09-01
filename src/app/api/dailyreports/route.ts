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

  const body = (await req.json()) as {
    date?: string;
    caseId?: string;
    mostImportant?: string;
    todayTasks?: string;
    waitingCases?: string;
    workHours?: string;
    remainingTasks?: string;
    todaySuccess?: string;
    draft?: boolean; // v11 3.2：一時保存（空欄・書きかけでも保存できる）
  };
  if (!body.date) {
    return NextResponse.json({ error: "日付は必須です" }, { status: 400 });
  }
  if (!body.draft && ![body.mostImportant, body.todayTasks, body.waitingCases, body.workHours, body.remainingTasks, body.todaySuccess].some((v) => v?.trim())) {
    return NextResponse.json({ error: "いずれかの項目を入力してください" }, { status: 400 });
  }

  const created = await prisma.dailyReport.create({
    data: {
      personName: user.displayName,
      date: body.date,
      caseId: body.caseId?.trim() || null,
      mostImportant: body.mostImportant?.trim() || "",
      todayTasks: body.todayTasks?.trim() || "",
      waitingCases: body.waitingCases?.trim() || "",
      workHours: body.workHours?.trim() || "",
      remainingTasks: body.remainingTasks?.trim() || "",
      todaySuccess: body.todaySuccess?.trim() || "",
    },
  });
  return NextResponse.json({ ...created, createdAt: created.createdAt.toISOString() }, { status: 201 });
}
