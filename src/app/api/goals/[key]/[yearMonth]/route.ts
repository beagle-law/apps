import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";
import { GOAL_KEYS } from "@/lib/constants";

async function ensureRecord(key: string, yearMonth: string) {
  const existing = await prisma.goalRecord.findUnique({
    where: { key_yearMonth: { key, yearMonth } },
    include: { items: true },
  });
  if (existing) return existing;
  return prisma.goalRecord.create({ data: { key, yearMonth }, include: { items: true } });
}

export async function GET(_req: NextRequest, { params }: { params: Promise<{ key: string; yearMonth: string }> }) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "認証が必要です" }, { status: 401 });

  const { key, yearMonth } = await params;
  if (!GOAL_KEYS.some((g) => g.key === key)) {
    return NextResponse.json({ error: "keyが不正です" }, { status: 400 });
  }
  const record = await ensureRecord(key, yearMonth);
  return NextResponse.json(record);
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ key: string; yearMonth: string }> }
) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "認証が必要です" }, { status: 401 });

  const { key, yearMonth } = await params;
  const body = (await req.json()) as { overallPercent?: string };
  const record = await ensureRecord(key, yearMonth);

  const updated = await prisma.goalRecord.update({
    where: { id: record.id },
    data: { overallPercent: body.overallPercent ?? "" },
    include: { items: true },
  });
  return NextResponse.json(updated);
}
