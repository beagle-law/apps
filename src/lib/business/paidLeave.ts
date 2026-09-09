// v15：有給休暇の付与・消化管理（宮村には有給の概念がないため対象外）。
//
// 付与スケジュールは事務所の運用ルールに従い固定値でハードコードする（尾崎・岩下のみ）。
// 各付与は「付与日から2年」で失効する。消化は失効が近い＝古い付与分から順に充当する（FIFO）。

export interface LeaveGrant {
  grantDate: string; // "YYYY-MM-DD"
  days: number;
}

export interface LeaveUsage {
  date: string; // "YYYY-MM-DD"
  days: number; // 1（全日）または 0.5（半日）
}

export interface GrantBalance extends LeaveGrant {
  remaining: number;
  expiresAt: string; // "YYYY-MM-DD"
}

function addYears(dateStr: string, years: number): string {
  const [y, m, d] = dateStr.split("-").map(Number);
  const dt = new Date(Date.UTC(y + years, m - 1, d));
  return dt.toISOString().slice(0, 10);
}

export function grantExpiresAt(grantDate: string): string {
  return addYears(grantDate, 2);
}

// 尾崎：2026/9/1時点の残日数12日は、直近（2025/11/1）の付与とみなす。
function ozakiGrants(throughYear: number): LeaveGrant[] {
  const grants: LeaveGrant[] = [
    { grantDate: "2025-11-01", days: 12 },
    { grantDate: "2026-11-01", days: 16 },
    { grantDate: "2027-11-01", days: 18 },
  ];
  for (let y = 2028; y <= throughYear; y++) grants.push({ grantDate: `${y}-11-01`, days: 20 });
  return grants;
}

// 岩下：2026/10/1に初めて10日付与。
function iwashitaGrants(throughYear: number): LeaveGrant[] {
  const grants: LeaveGrant[] = [
    { grantDate: "2026-10-01", days: 10 },
    { grantDate: "2027-11-01", days: 11 },
    { grantDate: "2028-11-01", days: 12 },
    { grantDate: "2029-11-01", days: 14 },
    { grantDate: "2030-11-01", days: 16 },
    { grantDate: "2031-11-01", days: 18 },
    { grantDate: "2032-11-01", days: 20 },
  ];
  for (let y = 2033; y <= throughYear; y++) grants.push({ grantDate: `${y}-11-01`, days: 20 });
  return grants;
}

const LEAVE_ELIGIBLE_PERSONS = new Set(["尾崎", "岩下"]);

export function isLeaveEligible(personName: string): boolean {
  return LEAVE_ELIGIBLE_PERSONS.has(personName);
}

export function grantsForPerson(personName: string, throughYear: number): LeaveGrant[] {
  if (personName === "尾崎") return ozakiGrants(throughYear);
  if (personName === "岩下") return iwashitaGrants(throughYear);
  return [];
}

/**
 * 付与分ごとにFIFO（古い付与分から）で消化を充当し、指定日（asOfDate）時点で
 * 有効な付与分とその残日数を返す。消化イベントはその発生日時点で有効な付与分にのみ充当される
 * （まだ付与されていない・既に失効した付与分には充当できない）。
 */
export function computeGrantBalances(grants: LeaveGrant[], usages: LeaveUsage[], asOfDate: string): GrantBalance[] {
  const sortedGrants = [...grants].sort((a, b) => (a.grantDate < b.grantDate ? -1 : 1));
  const remaining = new Map<number, number>(sortedGrants.map((g, i) => [i, g.days]));
  const sortedUsages = [...usages].sort((a, b) => (a.date < b.date ? -1 : 1));

  for (const usage of sortedUsages) {
    let need = usage.days;
    for (let i = 0; i < sortedGrants.length && need > 0; i++) {
      const g = sortedGrants[i];
      if (g.grantDate > usage.date) continue;
      if (grantExpiresAt(g.grantDate) <= usage.date) continue;
      const avail = remaining.get(i)!;
      if (avail <= 0) continue;
      const take = Math.min(avail, need);
      remaining.set(i, avail - take);
      need -= take;
    }
  }

  return sortedGrants
    .map((g, i) => ({ ...g, remaining: remaining.get(i)!, expiresAt: grantExpiresAt(g.grantDate) }))
    .filter((g) => g.grantDate <= asOfDate && g.expiresAt > asOfDate);
}

export interface LeaveBalanceResult {
  totalRemaining: number;
  grants: GrantBalance[];
}

export function computeLeaveBalance(personName: string, usages: LeaveUsage[], asOfDate: string): LeaveBalanceResult {
  const throughYear = Number(asOfDate.slice(0, 4)) + 1;
  const grants = grantsForPerson(personName, throughYear);
  const balances = computeGrantBalances(grants, usages, asOfDate);
  const totalRemaining = balances.reduce((s, g) => s + g.remaining, 0);
  return { totalRemaining, grants: balances };
}
