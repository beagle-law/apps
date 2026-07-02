import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { caseInclude, serializeCase } from "@/lib/case-query";

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string; hearingId: string }> }
) {
  const { id, hearingId } = await params;
  await prisma.hearing.delete({ where: { id: hearingId, caseId: id } });
  const c = await prisma.case.findUnique({ where: { id }, include: caseInclude });
  if (!c) return NextResponse.json({ error: "案件が見つかりません" }, { status: 404 });
  return NextResponse.json(serializeCase(c));
}
