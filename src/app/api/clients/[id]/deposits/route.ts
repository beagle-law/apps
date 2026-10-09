import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";
import { caseVisibilityFilter } from "@/lib/case-access";

// 顧客詳細「実費履歴」に並べる、その顧客の全案件の預り金入金（v27）
export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "認証が必要です" }, { status: 401 });

  const { id } = await params;
  const deposits = await prisma.deposit.findMany({
    where: { case: { clientId: id, ...caseVisibilityFilter(user.id) } },
    include: { case: { select: { id: true, title: true, caseNumber: true } } },
    orderBy: { date: "desc" },
  });
  return NextResponse.json(
    deposits.map((d) => ({
      id: d.id,
      date: d.date,
      amount: d.amount,
      notes: d.notes,
      createdAt: d.createdAt.toISOString(),
      caseId: d.case.id,
      caseTitle: d.case.title,
      caseNumber: d.case.caseNumber,
    }))
  );
}
