import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";
import { caseInclude, serializeCase } from "@/lib/case-query";
import { getAccessibleCaseOrNull } from "@/lib/case-access";

// 次回予定（v14）：期日以外の予定（訪問・打合せ等）を記録し、「今後の期日」タブでも一覧できるようにする。
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "認証が必要です" }, { status: 401 });

  const { id } = await params;
  const existing = await getAccessibleCaseOrNull(id, user.id);
  if (!existing) return NextResponse.json({ error: "案件が見つかりません" }, { status: 404 });

  const body = (await req.json()) as { date?: string; content?: string };
  if (!body.date || !body.content?.trim()) {
    return NextResponse.json({ error: "日付と内容は必須です" }, { status: 400 });
  }

  const updated = await prisma.case.update({
    where: { id },
    data: { plans: { create: [{ date: body.date, content: body.content.trim() }] } },
    include: caseInclude,
  });
  return NextResponse.json(serializeCase(updated));
}
