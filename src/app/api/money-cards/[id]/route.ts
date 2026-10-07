import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "認証が必要です" }, { status: 401 });

  const { id } = await params;
  const body = (await req.json()) as { content?: string };
  const existing = await prisma.moneyCard.findUnique({ where: { id } });
  if (!existing) return NextResponse.json({ error: "カードが見つかりません" }, { status: 404 });

  const card = await prisma.moneyCard.update({ where: { id }, data: { content: body.content ?? "" } });
  return NextResponse.json({ id: card.id, content: card.content, createdAt: card.createdAt.toISOString() });
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "認証が必要です" }, { status: 401 });

  const { id } = await params;
  await prisma.moneyCard.deleteMany({ where: { id } });
  return NextResponse.json({ ok: true });
}
