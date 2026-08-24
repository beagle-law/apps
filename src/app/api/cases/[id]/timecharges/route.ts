import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";
import { getAccessibleCaseOrNull } from "@/lib/case-access";

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "認証が必要です" }, { status: 401 });

  const { id } = await params;
  const existing = await getAccessibleCaseOrNull(id, user.id);
  if (!existing) return NextResponse.json({ error: "案件が見つかりません" }, { status: 404 });

  const timeCharges = await prisma.timeCharge.findMany({
    where: { caseId: id },
    orderBy: { date: "asc" },
  });
  return NextResponse.json(timeCharges.map((t) => ({ ...t, createdAt: t.createdAt.toISOString() })));
}
