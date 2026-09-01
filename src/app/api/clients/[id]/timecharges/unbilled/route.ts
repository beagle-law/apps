import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";
import { caseVisibilityFilter } from "@/lib/case-access";

// 顧客詳細の請求書作成「タイムチャージから計算して追加」：その顧客の全案件の未請求分を合算する（v12 4.1）
export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "認証が必要です" }, { status: 401 });

  const { id } = await params;
  const unbilled = await prisma.timeCharge.findMany({
    where: { billed: false, case: { clientId: id, ...caseVisibilityFilter(user.id) } },
    orderBy: { date: "asc" },
  });
  return NextResponse.json(unbilled.map((t) => ({ ...t, createdAt: t.createdAt.toISOString() })));
}
