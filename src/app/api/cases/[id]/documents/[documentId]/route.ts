import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { caseInclude, serializeCase } from "@/lib/case-query";

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string; documentId: string }> }
) {
  const { id, documentId } = await params;
  const body = (await req.json()) as { status?: string };
  if (!body.status) {
    return NextResponse.json({ error: "statusが必要です" }, { status: 400 });
  }
  await prisma.caseDocument.update({
    where: { id: documentId, caseId: id },
    data: { status: body.status },
  });
  const c = await prisma.case.findUnique({ where: { id }, include: caseInclude });
  if (!c) return NextResponse.json({ error: "案件が見つかりません" }, { status: 404 });
  return NextResponse.json(serializeCase(c));
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string; documentId: string }> }
) {
  const { id, documentId } = await params;
  await prisma.caseDocument.delete({ where: { id: documentId, caseId: id } });
  const c = await prisma.case.findUnique({ where: { id }, include: caseInclude });
  if (!c) return NextResponse.json({ error: "案件が見つかりません" }, { status: 404 });
  return NextResponse.json(serializeCase(c));
}
