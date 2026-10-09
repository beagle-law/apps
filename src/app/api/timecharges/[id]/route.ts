import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser, isAdmin } from "@/lib/auth";
import { getAccessibleCaseOrNull } from "@/lib/case-access";
import { findTimeChargeOverlap } from "@/lib/timecharge-overlap";

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "認証が必要です" }, { status: 401 });

  const { id } = await params;
  await prisma.timeCharge.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}

// v23：個人画面から過去のタイムチャージを編集する（本人または管理者のみ。請求済みのものは編集不可）。
export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "認証が必要です" }, { status: 401 });

  const { id } = await params;
  const existing = await prisma.timeCharge.findUnique({ where: { id } });
  if (!existing) return NextResponse.json({ error: "タイムチャージが見つかりません" }, { status: 404 });
  if (existing.personName !== user.displayName && !isAdmin(user)) {
    return NextResponse.json({ error: "他のメンバーのタイムチャージは編集できません" }, { status: 403 });
  }
  if (existing.billed) {
    return NextResponse.json({ error: "請求済みのタイムチャージは編集できません" }, { status: 400 });
  }

  const body = (await req.json()) as {
    date?: string;
    caseId?: string;
    startTime?: string;
    endTime?: string;
    hours?: number;
    content?: string;
  };

  const data: {
    date?: string;
    caseId?: string;
    startTime?: string;
    endTime?: string;
    hours?: number;
    content?: string;
  } = {};
  if (body.date !== undefined) {
    if (!body.date) return NextResponse.json({ error: "日付は必須です" }, { status: 400 });
    data.date = body.date;
  }
  if (body.caseId !== undefined && body.caseId !== existing.caseId) {
    const target = await getAccessibleCaseOrNull(body.caseId, user.id);
    if (!target) return NextResponse.json({ error: "案件が見つかりません" }, { status: 404 });
    data.caseId = body.caseId;
  }
  if (body.startTime !== undefined) data.startTime = body.startTime.trim();
  if (body.endTime !== undefined) data.endTime = body.endTime.trim();
  if (body.hours !== undefined) {
    if (!(Number(body.hours) > 0)) return NextResponse.json({ error: "時間が不正です" }, { status: 400 });
    data.hours = Number(body.hours);
  }
  if (body.content !== undefined) data.content = body.content.trim();

  // 日付・時刻を変える場合は、同じ人の他のタイムチャージと時間帯が重ならないか確認する
  if (data.date !== undefined || data.startTime !== undefined || data.endTime !== undefined) {
    const overlap = await findTimeChargeOverlap({
      personName: existing.personName,
      date: data.date ?? existing.date,
      startTime: data.startTime ?? existing.startTime,
      endTime: data.endTime ?? existing.endTime,
      excludeId: id,
    });
    if (overlap) return NextResponse.json({ error: overlap }, { status: 409 });
  }

  const updated = await prisma.timeCharge.update({ where: { id }, data });
  return NextResponse.json({ ...updated, createdAt: updated.createdAt.toISOString() });
}
