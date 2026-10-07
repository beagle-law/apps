import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";

// 月ごとのメモ（YYYY-MM）／経費入力ボードのお金の情報（expense-YYYY-MM）／入金管理メモ（payment）
const YM = /^(\d{4}-\d{2}|expense-\d{4}-\d{2}|payment)$/;

// v21：請求管理画面の「今月の予定請求・支出」フリースペース（月ごとに1件）。
export async function GET(_req: NextRequest, { params }: { params: Promise<{ yearMonth: string }> }) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "認証が必要です" }, { status: 401 });

  const { yearMonth } = await params;
  if (!YM.test(yearMonth)) return NextResponse.json({ error: "メモの種類が不正です" }, { status: 400 });

  const note = await prisma.monthlyNote.findUnique({ where: { yearMonth } });
  return NextResponse.json({ yearMonth, content: note?.content ?? "" });
}

export async function PUT(req: NextRequest, { params }: { params: Promise<{ yearMonth: string }> }) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "認証が必要です" }, { status: 401 });

  const { yearMonth } = await params;
  if (!YM.test(yearMonth)) return NextResponse.json({ error: "メモの種類が不正です" }, { status: 400 });

  const body = (await req.json()) as { content?: string };
  const content = body.content ?? "";
  const note = await prisma.monthlyNote.upsert({
    where: { yearMonth },
    create: { yearMonth, content },
    update: { content },
  });
  return NextResponse.json({ yearMonth, content: note.content });
}
