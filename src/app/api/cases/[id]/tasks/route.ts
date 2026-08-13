import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";
import { caseInclude, serializeCase } from "@/lib/case-query";
import { getAccessibleCaseOrNull } from "@/lib/case-access";

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "認証が必要です" }, { status: 401 });

  const { id } = await params;
  const existing = await getAccessibleCaseOrNull(id, user.id);
  if (!existing) return NextResponse.json({ error: "案件が見つかりません" }, { status: 404 });

  const body = (await req.json()) as {
    description?: string;
    assignee?: string;
    assignedBy?: string;
    dueDate?: string;
    points?: number | null;
  };
  if (!body.description?.trim()) {
    return NextResponse.json({ error: "タスク内容が空です" }, { status: 400 });
  }

  const updated = await prisma.case.update({
    where: { id },
    data: {
      tasks: {
        create: [
          {
            description: body.description.trim(),
            assignee: body.assignee?.trim() || "",
            assignedBy: body.assignedBy?.trim() || "",
            dueDate: body.dueDate?.trim() || "",
            points: body.points ?? null,
            status: "未着手",
            kind: "task",
          },
        ],
      },
    },
    include: caseInclude,
  });
  return NextResponse.json(serializeCase(updated));
}
