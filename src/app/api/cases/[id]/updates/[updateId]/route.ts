import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";
import { caseInclude, serializeCase } from "@/lib/case-query";
import { getAccessibleCaseOrNull } from "@/lib/case-access";

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string; updateId: string }> }) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "認証が必要です" }, { status: 401 });

  const { id, updateId } = await params;
  const existing = await getAccessibleCaseOrNull(id, user.id);
  if (!existing) return NextResponse.json({ error: "案件が見つかりません" }, { status: 404 });

  await prisma.updateLog.deleteMany({ where: { id: updateId, caseId: id } });

  const updated = await prisma.case.findUnique({ where: { id }, include: caseInclude });
  return NextResponse.json(serializeCase(updated!));
}
