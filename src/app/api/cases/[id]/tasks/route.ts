import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { caseInclude, serializeCase } from "@/lib/case-query";

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const body = (await req.json()) as { description?: string; assignee?: string; dueDate?: string };

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
            dueDate: body.dueDate?.trim() || "",
            status: "未着手",
          },
        ],
      },
    },
    include: caseInclude,
  });
  return NextResponse.json(serializeCase(updated));
}
