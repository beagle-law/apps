import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { caseInclude, serializeCase } from "@/lib/case-query";

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const body = (await req.json()) as { name?: string };
  if (!body.name?.trim()) {
    return NextResponse.json({ error: "書類名が空です" }, { status: 400 });
  }

  const updated = await prisma.case.update({
    where: { id },
    data: { documents: { create: [{ name: body.name.trim(), status: "未着手" }] } },
    include: caseInclude,
  });
  return NextResponse.json(serializeCase(updated));
}
