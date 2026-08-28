import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";

// 案件分類（v10 3.7）：案件情報・新規案件登録・ノウハウの分類タブで共有する拡張可能な一覧。
export async function GET() {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "認証が必要です" }, { status: 401 });

  const list = await prisma.caseClassification.findMany({ orderBy: { name: "asc" } });
  return NextResponse.json(list);
}

export async function POST(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "認証が必要です" }, { status: 401 });

  const body = (await req.json()) as { name?: string };
  const name = body.name?.trim();
  if (!name) return NextResponse.json({ error: "分類名は必須です" }, { status: 400 });

  const created = await prisma.caseClassification.upsert({
    where: { name },
    update: {},
    create: { name },
  });
  return NextResponse.json(created, { status: 201 });
}
