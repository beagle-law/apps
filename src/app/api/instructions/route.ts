import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser, isAdmin } from "@/lib/auth";
import { caseInclude, serializeCase } from "@/lib/case-query";
import { getAccessibleCaseOrNull } from "@/lib/case-access";
import { buildInstructionTaskAndNote } from "@/lib/business/instructions";

/**
 * 案件を横断する指示出しエンドポイント（v6 3.7・4.4）。
 * caseId未指定の場合、宛先スタッフの「とりあえず案件」（Case.catchAllFor）を自動選択する。
 */
export async function POST(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "認証が必要です" }, { status: 401 });
  if (!isAdmin(user)) return NextResponse.json({ error: "指示出しは管理者のみ利用できます" }, { status: 403 });

  const body = (await req.json()) as {
    caseId?: string;
    assignee?: string;
    content?: string;
    dueDate?: string;
    points?: number | null;
  };
  if (!body.assignee?.trim() || !body.content?.trim()) {
    return NextResponse.json({ error: "宛先と内容は必須です" }, { status: 400 });
  }

  let targetCaseId = body.caseId?.trim() || "";
  if (targetCaseId) {
    const existing = await getAccessibleCaseOrNull(targetCaseId, user.id);
    if (!existing) return NextResponse.json({ error: "案件が見つかりません" }, { status: 404 });
  } else {
    const catchAll = await prisma.case.findFirst({ where: { catchAllFor: body.assignee.trim() } });
    if (!catchAll) {
      return NextResponse.json({ error: "とりあえず案件が見つかりません" }, { status: 404 });
    }
    targetCaseId = catchAll.id;
  }

  const { task, note } = buildInstructionTaskAndNote({
    assignee: body.assignee.trim(),
    content: body.content,
    dueDate: body.dueDate || "",
    points: body.points ?? null,
    issuerDisplayName: user.displayName,
  });

  const updated = await prisma.case.update({
    where: { id: targetCaseId },
    data: { tasks: { create: [task] }, updates: { create: [note] } },
    include: caseInclude,
  });
  return NextResponse.json(serializeCase(updated));
}
