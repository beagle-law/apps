import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";
import { caseVisibilityFilter } from "@/lib/case-access";

// 顧客詳細「実費履歴」：その顧客に紐づく全案件の実費を横断表示する（v12 3.2・4.1）
export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "認証が必要です" }, { status: 401 });

  const { id } = await params;
  const expenses = await prisma.expense.findMany({
    where: { case: { clientId: id, ...caseVisibilityFilter(user.id) } },
    include: { case: { select: { id: true, title: true, caseNumber: true } } },
    orderBy: { date: "desc" },
  });
  return NextResponse.json(
    expenses.map((e) => ({
      id: e.id,
      date: e.date,
      amount: e.amount,
      category: e.category,
      origin: e.origin,
      destination: e.destination,
      route: e.route,
      notes: e.notes,
      billedInInvoiceId: e.billedInInvoiceId,
      checkedForBilling: e.checkedForBilling,
      createdAt: e.createdAt.toISOString(),
      caseId: e.case.id,
      caseTitle: e.case.title,
      caseNumber: e.case.caseNumber,
    }))
  );
}
