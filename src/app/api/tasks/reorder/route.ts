import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";
import { caseVisibilityFilter } from "@/lib/case-access";

/**
 * 個人タスク画面でのドラッグ&ドロップ並び替え（v7 3.3）。
 * 渡された順序でsortOrderを振り直す。アクセス可能な（メモ案件でない、または自分のメモ案件の）タスクのみ対象。
 */
export async function POST(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "認証が必要です" }, { status: 401 });

  const body = (await req.json()) as { taskIds?: string[] };
  if (!body.taskIds?.length) {
    return NextResponse.json({ error: "taskIdsは必須です" }, { status: 400 });
  }

  const accessible = await prisma.caseTask.findMany({
    where: { id: { in: body.taskIds }, case: caseVisibilityFilter(user.id) },
    select: { id: true },
  });
  const accessibleIds = new Set(accessible.map((t) => t.id));

  await prisma.$transaction(
    body.taskIds
      .filter((id) => accessibleIds.has(id))
      .map((id, idx) => prisma.caseTask.update({ where: { id }, data: { sortOrder: idx } }))
  );

  return NextResponse.json({ ok: true });
}
