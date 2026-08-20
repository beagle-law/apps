import { Prisma } from "@prisma/client";
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";
import { caseInclude, serializeCase } from "@/lib/case-query";
import { getAccessibleCaseOrNull } from "@/lib/case-access";

interface PatchTaskBody {
  status?: string; // クライアントが「次のステータス」（サイクル後の値）を送ってくる
  description?: string;
  assignee?: string;
  dueDate?: string;
  points?: number | null;
  caseId?: string; // 別案件を選ぶと、そのタスクが選んだ案件へ移動する（v6 3.2）
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string; taskId: string }> }
) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "認証が必要です" }, { status: 401 });

  const { id, taskId } = await params;
  const existing = await getAccessibleCaseOrNull(id, user.id);
  if (!existing) return NextResponse.json({ error: "案件が見つかりません" }, { status: 404 });

  const body = (await req.json()) as PatchTaskBody;
  const data: Prisma.CaseTaskUpdateInput = {};
  if (body.status !== undefined) {
    data.status = body.status;
    data.completedAt = body.status === "完了" ? new Date().toISOString() : "";
  }
  if (body.description !== undefined && body.description.trim()) data.description = body.description.trim();
  if (body.assignee !== undefined) data.assignee = body.assignee;
  if (body.dueDate !== undefined) data.dueDate = body.dueDate;
  if (body.points !== undefined) data.points = body.points;

  let targetCaseId = id;
  if (body.caseId !== undefined && body.caseId !== id) {
    const destination = await getAccessibleCaseOrNull(body.caseId, user.id);
    if (!destination) return NextResponse.json({ error: "移動先の案件が見つかりません" }, { status: 404 });
    data.case = { connect: { id: body.caseId } };
    targetCaseId = body.caseId;
  }

  if (Object.keys(data).length === 0) {
    return NextResponse.json({ error: "更新する項目がありません" }, { status: 400 });
  }

  await prisma.caseTask.update({ where: { id: taskId, caseId: id }, data });
  const c = await prisma.case.findUnique({ where: { id: targetCaseId }, include: caseInclude });
  return NextResponse.json(serializeCase(c!));
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string; taskId: string }> }
) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "認証が必要です" }, { status: 401 });

  const { id, taskId } = await params;
  const existing = await getAccessibleCaseOrNull(id, user.id);
  if (!existing) return NextResponse.json({ error: "案件が見つかりません" }, { status: 404 });

  await prisma.caseTask.delete({ where: { id: taskId, caseId: id } });
  const c = await prisma.case.findUnique({ where: { id }, include: caseInclude });
  return NextResponse.json(serializeCase(c!));
}
