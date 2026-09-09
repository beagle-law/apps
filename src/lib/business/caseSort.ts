// 「93-2」のような枝番付き案件番号も、本番号（93）が同じ通常の案件番号のすぐ後ろに並ぶよう、
// 本番号と枝番を分けて比較する（枝番なしで本番号のみが数字の場合を含む）。
function parseCaseNumber(s: string): { base: number; suffix: string } | null {
  const m = /^(\d+)(-.*)?$/.exec(s);
  if (!m) return null;
  return { base: parseInt(m[1], 10), suffix: m[2] || "" };
}

export function compareCaseNumbers(a: string, b: string): number {
  const pa = parseCaseNumber(a);
  const pb = parseCaseNumber(b);
  if (pa && pb) {
    if (pa.base !== pb.base) return pa.base - pb.base;
    return pa.suffix.localeCompare(pb.suffix, "ja");
  }
  if (pa && !pb) return -1;
  if (!pa && pb) return 1;
  return a.localeCompare(b, "ja");
}

export function sortCasesByCaseNumber<T extends { caseNumber: string }>(cases: T[]): T[] {
  return [...cases].sort((a, b) => compareCaseNumbers(a.caseNumber, b.caseNumber));
}
