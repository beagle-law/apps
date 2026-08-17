import { todayStr, plusDaysStr } from "@/lib/dates";
import type { Case, Hearing } from "@/lib/types";

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
