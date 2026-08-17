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

  const [allTasks, timeCharges, dailyReports] = await Promise.all([
    prisma.caseTask.findMany({
      where: { case: caseVisibilityFilter(user.id) },
      include: { case: { select: { id: true, title: true, caseNumber: true } } },
      orderBy: { dueDate: "asc" },
    }),
    prisma.timeCharge.findMany({
      where: { personName: name, case: caseVisibilityFilter(user.id) },
      include: { case: { select: { id: true, title: true, caseNumber: true } } },
      orderBy: { date: "desc" },
    }),
    DAILY_REPORT_STAFF.includes(name)
      ? prisma.dailyReport.findMany({ where: { personName: name }, orderBy: { date: "desc" } })
      : Promise.resolve(null),
  ]);

  const includeUnassigned = name === "宮村";
  const ownOpen = allTasks.filter(
    (t) =>
      t.status !== "完了" &&
      (t.assignee === name || (includeUnassigned && !t.assignee.trim()))
  );

  const tasks = ownOpen.filter((t) => t.kind !== "waiting");
  const waiting = ownOpen.filter((t) => t.kind === "waiting");
  const confirmations = allTasks.filter((t) => t.handedBackFrom === name && t.status !== "完了");
  const instructions =
    name === "宮村"
      ? allTasks
          .filter((t) => t.isInstruction)
          .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
      : [];

  const serializeTask = (t: (typeof allTasks)[number]) => ({
    ...t,
    completedAt: t.completedAt,
    createdAt: t.createdAt.toISOString(),
  });

  return NextResponse.json({
    personName: name,
    tasks: tasks.map(serializeTask),
    waiting: waiting.map(serializeTask),
    confirmations: confirmations.map(serializeTask),
    instructions: instructions.map(serializeTask),
    timeCharges: timeCharges.map((tc) => ({ ...tc, createdAt: tc.createdAt.toISOString() })),
    dailyReports: dailyReports?.map((r) => ({ ...r, createdAt: r.createdAt.toISOString() })) ?? null,
  });
}
