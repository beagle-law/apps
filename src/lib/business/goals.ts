import { PERSONAL_TASK_TABS } from "@/lib/constants";
import { currentYearMonth } from "@/lib/dates";
import type { CaseTask } from "@/lib/types";

/** 今月に完了したタスクの、担当者別「難易度点」合計。目標画面の上部バーで使用。 */
export function monthlyPointTotals(allTasks: CaseTask[]): Record<string, number> {
  const cm = currentYearMonth();
  const totals: Record<string, number> = {};
  for (const name of PERSONAL_TASK_TABS) totals[name] = 0;

  for (const t of allTasks) {
    if (t.status !== "完了" || !t.points || !t.completedAt) continue;
    if (t.completedAt.slice(0, 7) !== cm) continue;
    if (!(t.assignee in totals)) continue;
    totals[t.assignee] += Number(t.points);
  }
  return totals;
}

/** 今月の「対応レベル評価」平均点（宮村を除く担当者ごと）。 */
export function monthlyExecutionAverages(allTasks: CaseTask[]): Record<string, number> {
  const cm = currentYearMonth();
  const stats: Record<string, { total: number; count: number }> = {};
  for (const name of PERSONAL_TASK_TABS) {
    if (name === "宮村") continue;
    stats[name] = { total: 0, count: 0 };
  }

  for (const t of allTasks) {
    if (t.executionScore == null || !t.handedBackFrom || !t.completedAt) continue;
    if (t.completedAt.slice(0, 7) !== cm) continue;
    if (!(t.handedBackFrom in stats)) continue;
    stats[t.handedBackFrom].total += t.executionScore;
    stats[t.handedBackFrom].count += 1;
  }

  const averages: Record<string, number> = {};
  for (const [name, s] of Object.entries(stats)) {
    averages[name] = s.count > 0 ? s.total / s.count : 0;
  }
  return averages;
}
