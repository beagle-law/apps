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

/**
 * 人事評価点（v4追加、賞与の基礎点）：タスクごとに 難易度点 × 対応評価点 × 2 × 0.1 を算出し、
 * 当月に完了し、かつ難易度点・対応評価点の両方が設定されているタスク分を、handedBackFrom
 * （実際に対応した人）に紐づけて合算する。宮村を除く担当者ごとに表示。
 */
export function monthlyPersonnelScores(allTasks: CaseTask[]): Record<string, number> {
  const cm = currentYearMonth();
  const totals: Record<string, number> = {};
  for (const name of PERSONAL_TASK_TABS) {
    if (name === "宮村") continue;
    totals[name] = 0;
  }

  for (const t of allTasks) {
    if (t.points == null || t.executionScore == null || !t.handedBackFrom || !t.completedAt) continue;
    if (t.completedAt.slice(0, 7) !== cm) continue;
    if (!(t.handedBackFrom in totals)) continue;
    totals[t.handedBackFrom] += Number(t.points) * Number(t.executionScore) * 2 * 0.1;
  }
  return totals;
}
