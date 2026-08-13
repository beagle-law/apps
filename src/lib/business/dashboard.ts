export type DashboardGranularity = "all" | "year" | "half" | "month";

function lastDayOfMonth(year: number, monthIndex0: number): number {
  return new Date(year, monthIndex0 + 1, 0).getDate();
}

function eraYearLabel(year: number, monthIndex0 = 0): string {
  return new Date(year, monthIndex0, 1).toLocaleDateString("ja-JP-u-ca-japanese", {
    era: "long",
    year: "numeric",
  });
}

export function getPeriodRange(
  granularity: DashboardGranularity,
  anchorStr: string
): { start: string; end: string } | null {
  if (granularity === "all") return null;
  const anchor = new Date(anchorStr + "T00:00:00");
  const y = anchor.getFullYear();
  const m = anchor.getMonth(); // 0-indexed

  if (granularity === "year") {
    return { start: `${y}-01-01`, end: `${y}-12-31` };
  }
  if (granularity === "half") {
    return m <= 5
      ? { start: `${y}-01-01`, end: `${y}-06-30` }
      : { start: `${y}-07-01`, end: `${y}-12-31` };
  }
  // month
  const mm = String(m + 1).padStart(2, "0");
  return { start: `${y}-${mm}-01`, end: `${y}-${mm}-${String(lastDayOfMonth(y, m)).padStart(2, "0")}` };
}

export function getPeriodLabel(granularity: DashboardGranularity, anchorStr: string): string {
  if (granularity === "all") return "";
  const anchor = new Date(anchorStr + "T00:00:00");
  const y = anchor.getFullYear();
  const m = anchor.getMonth();

  if (granularity === "year") return eraYearLabel(y, m);
  if (granularity === "half") return `${eraYearLabel(y, m)} ${m <= 5 ? "上期（1〜6月）" : "下期（7〜12月）"}`;
  return `${eraYearLabel(y, m)}${m + 1}月`;
}

export function shiftAnchor(granularity: DashboardGranularity, anchorStr: string, dir: 1 | -1): string {
  const anchor = new Date(anchorStr + "T00:00:00");
  if (granularity === "year") anchor.setFullYear(anchor.getFullYear() + dir);
  else if (granularity === "half") anchor.setMonth(anchor.getMonth() + dir * 6);
  else anchor.setMonth(anchor.getMonth() + dir);
  return anchor.toISOString().slice(0, 10);
}

export function isWithinPeriod(dateStr: string, range: { start: string; end: string } | null): boolean {
  if (!range) return true;
  return dateStr >= range.start && dateStr <= range.end;
}
