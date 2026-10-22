import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";

// v36：パスワード管理のカテゴリ一覧・追加
export async function GET() {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "認証が必要です" }, { status: 401 });

  const rows = await prisma.passwordCategory.findMany({ orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }] });
  return NextResponse.json(rows.map((r) => ({ id: r.id, name: r.name })));
}

export async function POST(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "認証が必要です" }, { status: 401 });

  const body = (await req.json()) as { name?: string };
  const name = body.name?.trim();
  if (!name) return NextResponse.json({ error: "カテゴリ名を入力してください" }, { status: 400 });
  if (name.length > 30) return NextResponse.json({ error: "カテゴリ名は30文字以内にしてください" }, { status: 400 });
  if (await prisma.passwordCategory.findUnique({ where: { name } })) {
    return NextResponse.json({ error: "同じ名前のカテゴリがすでにあります" }, { status: 409 });
  }

  const last = await prisma.passwordCategory.findFirst({ orderBy: { sortOrder: "desc" } });
  const created = await prisma.passwordCategory.create({ data: { name, sortOrder: (last?.sortOrder ?? 0) + 1 } });
  return NextResponse.json({ id: created.id, name: created.name }, { status: 201 });
}
