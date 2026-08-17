/**
 * v4案件番号ルール：既存の案件番号のうち数字のみで構成されるものの最大値を探し、
 * その次の番号を3桁ゼロ埋めで提案する（4桁以上になった場合はそのまま桁が増える）。
 * 顧客連動の採番（旧v3方式）は廃止。
 */
export function suggestedCaseNumber(existingCaseNumbers: string[]): string {
  let max = 0;
  for (const n of existingCaseNumbers) {
    if (/^\d+$/.test(n)) {
      const value = parseInt(n, 10);
      if (value > max) max = value;
    }
  }
  return String(max + 1).padStart(3, "0");
}
