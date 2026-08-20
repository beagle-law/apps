import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser, canAccessGoalKey } from "@/lib/auth";
import { GOAL_KEYS } from "@/lib/constants";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ key: string; yearMonth: string }> }
) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "認証が必要です" }, { status: 401 });

  const { key, yearMonth } = await params;
  if (!GOAL_KEYS.some((g) => g.key === key)) {
    return NextResponse.json({ error: "keyが不正です" }, { status: 400 });
  }
  if (!canAccessGoalKey(user, key)) {
    return NextResponse.json({ error: "この目標は編集できません" }, { status: 403 });
  }
  const body = (await req.json()) as { text?: string };
  if (!body.text?.trim()) return NextResponse.json({ error: "項目名が空です" }, { status: 400 });

  const record = await prisma.goalRecord.upsert({
    where: { key_yearMonth: { key, yearMonth } },
    update: {},
    create: { key, yearMonth },
  });

  const item = await prisma.goalItem.create({ data: { goalRecordId: record.id, text: body.text.trim() } });
  return NextResponse.json(item, { status: 201 });
}
