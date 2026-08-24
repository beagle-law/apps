import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser, isAdmin } from "@/lib/auth";
import { caseVisibilityFilter } from "@/lib/case-access";
import { PERSONAL_TASK_TABS, DAILY_REPORT_STAFF } from "@/lib/constants";

export async function GET(_req: NextRequest, { params }: { params: Promise<{ name: string }> }) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "認証が必要です" }, { status: 401 });

  const { name } = await params;
  if (!PERSONAL_TASK_TABS.includes(name)) {
    return NextResponse.json({ error: "対象者が不正です" }, { status: 400 });
  }
  if (!isAdmin(user) && user.displayName !== name) {
    return NextResponse.json({ error: "他のメンバーの画面は閲覧できません" }, { status: 403 });
  }

  const [timeCharges, dailyReports] = await Promise.all([
    prisma.timeCharge.findMany({
      where: { personName: name, case: caseVisibilityFilter(user.id) },
      include: { case: { select: { id: true, title: true, caseNumber: true } } },
      orderBy: { date: "desc" },
    }),
    DAILY_REPORT_STAFF.includes(name)
      ? prisma.dailyReport.findMany({ where: { personName: name }, orderBy: { date: "desc" } })
      : Promise.resolve(null),
  ]);

  return NextResponse.json({
    personName: name,
    timeCharges: timeCharges.map((tc) => ({ ...tc, createdAt: tc.createdAt.toISOString() })),
    dailyReports: dailyReports?.map((r) => ({ ...r, createdAt: r.createdAt.toISOString() })) ?? null,
  });
}
