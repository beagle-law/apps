import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ key: string; yearMonth: string }> }
) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "認証が必要です" }, { status: 401 });

  const { key, yearMonth } = await params;
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
