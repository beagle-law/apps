import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser, isAdmin } from "@/lib/auth";
import { caseInclude, serializeCase } from "@/lib/case-query";
import { getAccessibleCaseOrNull } from "@/lib/case-access";
import { buildInstructionTaskAndNote } from "@/lib/business/instructions";

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "認証が必要です" }, { status: 401 });
  if (!isAdmin(user)) return NextResponse.json({ error: "指示出しは管理者のみ利用できます" }, { status: 403 });

  const { id } = await params;
  const existing = await getAccessibleCaseOrNull(id, user.id);
  if (!existing) return NextResponse.json({ error: "案件が見つかりません" }, { status: 404 });

  const body = (await req.json()) as { assignee?: string; content?: string; dueDate?: string; points?: number | null };
  if (!body.assignee?.trim() || !body.content?.trim()) {
    return NextResponse.json({ error: "宛先と内容は必須です" }, { status: 400 });
  }

  const { task, note } = buildInstructionTaskAndNote({
    assignee: body.assignee.trim(),
    content: body.content,
    dueDate: body.dueDate || "",
    points: body.points ?? null,
    issuerDisplayName: user.displayName,
  });

  const updated = await prisma.case.update({
    where: { id },
    data: { tasks: { create: [task] }, updates: { create: [note] } },
    include: caseInclude,
  });
  return NextResponse.json(serializeCase(updated));
}
