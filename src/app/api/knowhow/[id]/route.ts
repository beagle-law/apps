import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";

// v10 3.5：一覧のエントリをクリックすると編集フォームに読み込まれ、上書き保存できる。
export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "認証が必要です" }, { status: 401 });

  const { id } = await params;
  const body = (await req.json()) as { category?: string; title?: string; content?: string };
  const data: { category?: string; title?: string; content?: string } = {};
  if (body.category !== undefined) data.category = body.category;
  if (body.title !== undefined) data.title = body.title.trim();
  if (body.content !== undefined) data.content = body.content;

  const updated = await prisma.knowhowEntry.update({ where: { id }, data });
  return NextResponse.json(updated);
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "認証が必要です" }, { status: 401 });

  const { id } = await params;
  await prisma.knowhowEntry.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
