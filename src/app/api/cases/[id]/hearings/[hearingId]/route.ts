import { NextRequest, NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";
import { caseInclude, serializeCase } from "@/lib/case-query";
import { getAccessibleCaseOrNull } from "@/lib/case-access";

// 過去に登録した期日メモ・日時をあとから修正できるようにする。
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string; hearingId: string }> }
) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "認証が必要です" }, { status: 401 });

  const { id, hearingId } = await params;
  const existing = await getAccessibleCaseOrNull(id, user.id);
  if (!existing) return NextResponse.json({ error: "案件が見つかりません" }, { status: 404 });

  const body = (await req.json()) as {
    date?: string;
    content?: string;
    docDeadline?: string;
    nextHearingDate?: string;
  };
  if (body.date !== undefined && !body.date) {
    return NextResponse.json({ error: "日付は必須です" }, { status: 400 });
  }
  if (body.content !== undefined && !body.content.trim()) {
    return NextResponse.json({ error: "内容は必須です" }, { status: 400 });
  }

  const data: Prisma.HearingUpdateInput = {};
  if (body.date !== undefined) data.date = body.date;
  if (body.content !== undefined) data.content = body.content.trim();
  if (body.docDeadline !== undefined) data.docDeadline = body.docDeadline.trim();
  if (body.nextHearingDate !== undefined) data.nextHearingDate = body.nextHearingDate.trim();

  await prisma.hearing.update({ where: { id: hearingId, caseId: id }, data });
  const c = await prisma.case.findUnique({ where: { id }, include: caseInclude });
  return NextResponse.json(serializeCase(c!));
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string; hearingId: string }> }
) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "認証が必要です" }, { status: 401 });

  const { id, hearingId } = await params;
  const existing = await getAccessibleCaseOrNull(id, user.id);
  if (!existing) return NextResponse.json({ error: "案件が見つかりません" }, { status: 404 });

  await prisma.hearing.delete({ where: { id: hearingId, caseId: id } });
  const c = await prisma.case.findUnique({ where: { id }, include: caseInclude });
  return NextResponse.json(serializeCase(c!));
}
