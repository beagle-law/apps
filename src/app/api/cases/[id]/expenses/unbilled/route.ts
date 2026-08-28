import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";
import { getAccessibleCaseOrNull } from "@/lib/case-access";

// 発行月と同月・未反映（billedInInvoiceIdがnull）の実費一覧（v10 3.3）
export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "認証が必要です" }, { status: 401 });

  const { id } = await params;
  const existing = await getAccessibleCaseOrNull(id, user.id);
  if (!existing) return NextResponse.json({ error: "案件が見つかりません" }, { status: 404 });

  const month = req.nextUrl.searchParams.get("month"); // YYYY-MM
  if (!month) return NextResponse.json({ error: "monthは必須です" }, { status: 400 });

  const expenses = await prisma.expense.findMany({
    where: { caseId: id, billedInInvoiceId: null, date: { startsWith: month } },
    orderBy: { date: "asc" },
  });
  return NextResponse.json(expenses.map((e) => ({ ...e, createdAt: e.createdAt.toISOString() })));
}
