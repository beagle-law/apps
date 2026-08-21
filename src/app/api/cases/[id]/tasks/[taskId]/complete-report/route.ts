import { NextRequest, NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";
import { caseInclude, serializeCase } from "@/lib/case-query";
import { getAccessibleCaseOrNull } from "@/lib/case-access";
import { computeCompleteReport } from "@/lib/business/tasks";

interface CompleteReportBody {
  description?: string;
  assignee: string;
  dueDate?: string;
  points?: number | null;
  caseId?: string;
}

/**
 * 「タスク編集/終了報告」モーダルの「終了報告」ボタン（v7 3.2）。
 * モーダルの編集内容を保存しつつ、依頼者がいれば差し戻し、いなければ完了にする。
 */
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string; taskId: string }> }
) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "認証が必要です" }, { status: 401 });

  const { id, taskId } = await params;
  const existing = await getAccessibleCaseOrNull(id, user.id);
  if (!existing) return NextResponse.json({ error: "案件が見つかりません" }, { status: 404 });

  const task = existing.tasks.find((t) => t.id === taskId);
  if (!task) return NextResponse.json({ error: "タスクが見つかりません" }, { status: 404 });

  const body = (await req.json()) as CompleteReportBody;

  const { fields, redirectToPerson } = computeCompleteReport(task, {
    description: body.description,
    assignee: body.assignee,
    dueDate: body.dueDate,
    points: body.points,
  });

  const data: Prisma.CaseTaskUpdateInput = { ...fields };
  let targetCaseId = id;
  if (body.caseId !== undefined && body.caseId !== id) {
    const destination = await getAccessibleCaseOrNull(body.caseId, user.id);
    if (!destination) return NextResponse.json({ error: "移動先の案件が見つかりません" }, { status: 404 });
    data.case = { connect: { id: body.caseId } };
    targetCaseId = body.caseId;
  }

  await prisma.caseTask.update({ where: { id: taskId, caseId: id }, data });
  const c = await prisma.case.findUnique({ where: { id: targetCaseId }, include: caseInclude });
  return NextResponse.json({ case: serializeCase(c!), redirectToPerson });
}
