import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";
import { caseInclude, serializeCase } from "@/lib/case-query";
import { getAccessibleCaseOrNull } from "@/lib/case-access";

// 過去に登録した主張予定メモをあとから修正できるようにする。
export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string; memoId: string }> }) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "認証が必要です" }, { status: 401 });

  const { id, memoId } = await params;
  const existing = await getAccessibleCaseOrNull(id, user.id);
  if (!existing) return NextResponse.json({ error: "案件が見つかりません" }, { status: 404 });

  const body = (await req.json()) as { content?: string };
  if (!body.content?.trim()) {
    return NextResponse.json({ error: "メモ内容が空です" }, { status: 400 });
  }

  await prisma.claimMemoEntry.update({ where: { id: memoId, caseId: id }, data: { content: body.content.trim() } });
  const c = await prisma.case.findUnique({ where: { id }, include: caseInclude });
  return NextResponse.json(serializeCase(c!));
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string; memoId: string }> }) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "認証が必要です" }, { status: 401 });

  const { id, memoId } = await params;
  const existing = await getAccessibleCaseOrNull(id, user.id);
  if (!existing) return NextResponse.json({ error: "案件が見つかりません" }, { status: 404 });

  await prisma.claimMemoEntry.deleteMany({ where: { id: memoId, caseId: id } });
  const c = await prisma.case.findUnique({ where: { id }, include: caseInclude });
  return NextResponse.json(serializeCase(c!));
}
