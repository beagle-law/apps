import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";

// v10 4.1：日報一覧の各エントリをクリックすると編集モードになり、過去の記録を事後的に編集できる。
export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "認証が必要です" }, { status: 401 });

  const { id } = await params;
  const existing = await prisma.dailyReport.findUnique({ where: { id } });
  if (!existing) return NextResponse.json({ error: "日報が見つかりません" }, { status: 404 });
  if (existing.personName !== user.displayName) {
    return NextResponse.json({ error: "自分の日報のみ編集できます" }, { status: 403 });
  }

  const body = (await req.json()) as {
    mostImportant?: string;
    todayTasks?: string;
    waitingCases?: string;
    workHours?: string;
    todaySuccess?: string;
  };
  const data: typeof body = {};
  if (body.mostImportant !== undefined) data.mostImportant = body.mostImportant.trim();
  if (body.todayTasks !== undefined) data.todayTasks = body.todayTasks.trim();
  if (body.waitingCases !== undefined) data.waitingCases = body.waitingCases.trim();
  if (body.workHours !== undefined) data.workHours = body.workHours.trim();
  if (body.todaySuccess !== undefined) data.todaySuccess = body.todaySuccess.trim();

  const updated = await prisma.dailyReport.update({ where: { id }, data });
  return NextResponse.json({ ...updated, createdAt: updated.createdAt.toISOString() });
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "認証が必要です" }, { status: 401 });

  const { id } = await params;
  await prisma.dailyReport.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
