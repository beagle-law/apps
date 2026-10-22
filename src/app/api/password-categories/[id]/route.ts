import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";

// カテゴリ名の変更。そのカテゴリのパスワードのカテゴリ名も、あわせて変更する。
export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "認証が必要です" }, { status: 401 });

  const { id } = await params;
  const body = (await req.json()) as { name?: string };
  const name = body.name?.trim();
  if (!name) return NextResponse.json({ error: "カテゴリ名を入力してください" }, { status: 400 });
  if (name.length > 30) return NextResponse.json({ error: "カテゴリ名は30文字以内にしてください" }, { status: 400 });

  const existing = await prisma.passwordCategory.findUnique({ where: { id } });
  if (!existing) return NextResponse.json({ error: "カテゴリが見つかりません" }, { status: 404 });
  if (name !== existing.name && (await prisma.passwordCategory.findUnique({ where: { name } }))) {
    return NextResponse.json({ error: "同じ名前のカテゴリがすでにあります" }, { status: 409 });
  }

  const [updated] = await prisma.$transaction([
    prisma.passwordCategory.update({ where: { id }, data: { name } }),
    prisma.passwordEntry.updateMany({ where: { category: existing.name }, data: { category: name } }),
  ]);
  return NextResponse.json({ id: updated.id, name: updated.name });
}

// カテゴリの削除。パスワードが入っているカテゴリは、誤ってパスワードが見えなくならないよう削除できない。
export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "認証が必要です" }, { status: 401 });

  const { id } = await params;
  const existing = await prisma.passwordCategory.findUnique({ where: { id } });
  if (!existing) return NextResponse.json({ ok: true });

  const count = await prisma.passwordEntry.count({ where: { category: existing.name } });
  if (count > 0) {
    return NextResponse.json({ error: `「${existing.name}」には${count}件のパスワードが登録されています。先に別のカテゴリへ移動するか削除してください。` }, { status: 409 });
  }
  await prisma.passwordCategory.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
