import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";
import { caseInclude, serializeCase } from "@/lib/case-query";
import { getAccessibleCaseOrNull } from "@/lib/case-access";

// v13：主張予定メモを単一テキストから積み重ね式の一覧に変更（経過記録と同様のパターン）。
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "認証が必要です" }, { status: 401 });

  const { id } = await params;
  const existing = await getAccessibleCaseOrNull(id, user.id);
  if (!existing) return NextResponse.json({ error: "案件が見つかりません" }, { status: 404 });

  const body = (await req.json()) as { content?: string };
  if (!body.content?.trim()) {
    return NextResponse.json({ error: "メモ内容が空です" }, { status: 400 });
  }

  const updated = await prisma.case.update({
    where: { id },
    data: { claimMemos: { create: [{ author: user.displayName, content: body.content.trim() }] } },
    include: caseInclude,
  });
  return NextResponse.json(serializeCase(updated));
}
