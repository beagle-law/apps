import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser, canAccessGoalKey } from "@/lib/auth";

async function getItemGoalKeyOrNull(itemId: string) {
  const item = await prisma.goalItem.findUnique({ where: { id: itemId }, include: { goalRecord: true } });
  return item?.goalRecord.key ?? null;
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ itemId: string }> }) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "認証が必要です" }, { status: 401 });

  const { itemId } = await params;
  const key = await getItemGoalKeyOrNull(itemId);
  if (key === null) return NextResponse.json({ error: "項目が見つかりません" }, { status: 404 });
  if (!canAccessGoalKey(user, key)) {
    return NextResponse.json({ error: "この目標は編集できません" }, { status: 403 });
  }

  const body = (await req.json()) as { result?: string; note?: string };
  const data: { result?: string; note?: string } = {};
  if (body.result !== undefined) data.result = body.result;
  if (body.note !== undefined) data.note = body.note;

  const updated = await prisma.goalItem.update({ where: { id: itemId }, data });
  return NextResponse.json(updated);
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ itemId: string }> }) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "認証が必要です" }, { status: 401 });

  const { itemId } = await params;
  const key = await getItemGoalKeyOrNull(itemId);
  if (key === null) return NextResponse.json({ error: "項目が見つかりません" }, { status: 404 });
  if (!canAccessGoalKey(user, key)) {
    return NextResponse.json({ error: "この目標は編集できません" }, { status: 403 });
  }

  await prisma.goalItem.delete({ where: { id: itemId } });
  return NextResponse.json({ ok: true });
}
