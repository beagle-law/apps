import { todayStr, plusDaysStr } from "@/lib/dates";
import type { Case, Hearing, CasePlan } from "@/lib/types";

/**
 * Mirrors the prototype's nextHearing(): among hearings whose
 * nextHearingDate is today-or-later, picks the most recently *logged*
 * one (latest createdAt) — not necessarily the soonest date — and
 * surfaces {date, content, docDeadline} from that single record.
 */
export function nextHearing(c: Pick<Case, "hearings">): Hearing | null {
  const t = todayStr();
  const future = (c.hearings || []).filter((h) => h.nextHearingDate && h.nextHearingDate >= t);
  if (future.length === 0) return null;
  return future.reduce((latest, h) => (h.createdAt > latest.createdAt ? h : latest));
}

export function upcomingHearings<T extends { hearings: Case["hearings"] }>(cases: T[]) {
  return cases
    .map((c) => ({ case: c, hearing: nextHearing(c) }))
    .filter((x): x is { case: T; hearing: Hearing } => x.hearing !== null)
    .sort((a, b) => (a.hearing.nextHearingDate < b.hearing.nextHearingDate ? -1 : 1));
}

export function hearingsNext7DaysCount<T extends { hearings: Case["hearings"] }>(cases: T[]): number {
  const t = todayStr();
  const t7 = plusDaysStr(7);
  return upcomingHearings(cases).filter((x) => x.hearing.nextHearingDate >= t && x.hearing.nextHearingDate <= t7)
    .length;
}

// v14：「今後の期日」タブに、次回裁判期日（Hearing）と次回予定（CasePlan、期日以外の予定）を
// 合わせて日付順に表示するための統合リスト。
export type UpcomingItem<T> =
  | { kind: "hearing"; case: T; date: string; content: string; docDeadline: string; id: string }
  | { kind: "plan"; case: T; date: string; content: string; id: string };

export function upcomingItems<T extends { hearings: Case["hearings"]; plans: CasePlan[] }>(cases: T[]): UpcomingItem<T>[] {
  const t = todayStr();
  const hearingItems: UpcomingItem<T>[] = upcomingHearings(cases).map(({ case: c, hearing: h }) => ({
    kind: "hearing",
    case: c,
    date: h.nextHearingDate,
    content: h.content,
    docDeadline: h.docDeadline,
    id: h.id,
  }));
  const planItems: UpcomingItem<T>[] = cases.flatMap((c) =>
    (c.plans || [])
      .filter((p) => p.date >= t)
      .map((p) => ({ kind: "plan" as const, case: c, date: p.date, content: p.content, id: p.id }))
  );
  return [...hearingItems, ...planItems].sort((a, b) => (a.date < b.date ? -1 : a.date > b.date ? 1 : 0));
}
