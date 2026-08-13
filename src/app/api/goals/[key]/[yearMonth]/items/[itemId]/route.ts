import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ itemId: string }> }) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "認証が必要です" }, { status: 401 });

  const { itemId } = await params;
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
  await prisma.goalItem.delete({ where: { id: itemId } });
  return NextResponse.json({ ok: true });
}
