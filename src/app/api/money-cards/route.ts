import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";

// v22：経費入力ボードの「お金の情報」カード（月に紐づかないフリー入力）。
export async function GET() {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "認証が必要です" }, { status: 401 });

  const cards = await prisma.moneyCard.findMany({ orderBy: { createdAt: "asc" } });
  return NextResponse.json(cards.map((c) => ({ id: c.id, content: c.content, createdAt: c.createdAt.toISOString() })));
}

export async function POST(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "認証が必要です" }, { status: 401 });

  const body = (await req.json()) as { content?: string };
  const card = await prisma.moneyCard.create({ data: { content: body.content ?? "" } });
  return NextResponse.json({ id: card.id, content: card.content, createdAt: card.createdAt.toISOString() }, { status: 201 });
}
