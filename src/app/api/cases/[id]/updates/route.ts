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

  const body = (await req.json()) as { note?: string };
  if (!body.note?.trim()) {
    return NextResponse.json({ error: "記録内容が空です" }, { status: 400 });
  }

  const updated = await prisma.case.update({
    where: { id },
    data: { updates: { create: [{ author: user.displayName, note: body.note.trim(), auto: false }] } },
    include: caseInclude,
  });
  return NextResponse.json(serializeCase(updated));
}
