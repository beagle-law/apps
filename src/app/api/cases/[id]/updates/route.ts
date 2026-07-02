import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { caseInclude, serializeCase } from "@/lib/case-query";

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const body = (await req.json()) as { note?: string; author?: string };
  if (!body.note?.trim()) {
    return NextResponse.json({ error: "記録内容が空です" }, { status: 400 });
  }

  const updated = await prisma.case.update({
    where: { id },
    data: {
      updates: {
        create: [{ author: body.author?.trim() || "匿名", note: body.note.trim(), auto: false }],
      },
    },
    include: caseInclude,
  });
  return NextResponse.json(serializeCase(updated));
}
