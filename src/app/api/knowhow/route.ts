import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";

export async function GET() {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "認証が必要です" }, { status: 401 });

  const entries = await prisma.knowhowEntry.findMany({
    orderBy: { createdAt: "desc" },
    include: { images: { orderBy: { createdAt: "asc" } } },
  });
  return NextResponse.json(entries);
}

export async function POST(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "認証が必要です" }, { status: 401 });

  const body = (await req.json()) as { category?: string; title?: string; content?: string };
  if (!body.category || !body.title?.trim()) {
    return NextResponse.json({ error: "カテゴリとタイトルは必須です" }, { status: 400 });
  }

  const created = await prisma.knowhowEntry.create({
    data: { category: body.category, title: body.title.trim(), content: body.content?.trim() || "" },
    include: { images: true },
  });
  return NextResponse.json(created, { status: 201 });
}
