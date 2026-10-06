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

  const body = (await req.json()) as { content?: string; lane?: string };
  if (body.content !== undefined && !body.content.trim()) {
    return NextResponse.json({ error: "メモ内容が空です" }, { status: 400 });
  }
  if (body.lane !== undefined && body.lane !== "task" && body.lane !== "memo") {
    return NextResponse.json({ error: "不正な区分です" }, { status: 400 });
  }

  const data: { content?: string; lane?: string } = {};
  if (body.content !== undefined) data.content = body.content.trim();
  if (body.lane !== undefined) data.lane = body.lane;
  await prisma.claimMemoEntry.update({ where: { id: memoId, caseId: id }, data });
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
