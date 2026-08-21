/**
 * 案件番号の採番ルール（要件定義書v6 3.6）：
 * - 顧客を選択した場合：その顧客の1件目の案件は顧客番号そのまま（例：45）、
 *   2件目以降は「顧客番号-連番」（例：45-2、45-3）
 * - 顧客未選択の場合：既存の数字のみの案件番号のうち最大値の次を3桁ゼロ埋めで提案（例：193）
 * - 登録前に手動で書き換え可能。1つの番号に複数の案件が紐づく運用のため重複を許容する（一意キーではない）
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

/**
 * 顧客が選択された場合の案件番号提案。
 * existingCaseCountForClient: その顧客に既に紐づいている案件数（0件なら顧客番号そのまま）。
 */
export function suggestedCaseNumberForClient(
  clientNumber: number,
  existingCaseCountForClient: number
): string {
  if (existingCaseCountForClient <= 0) {
    return String(clientNumber);
  }
  return `${clientNumber}-${existingCaseCountForClient + 1}`;
}

/**
 * 新規顧客の採番の起点（要件定義書v7 3.7）。
 * 2026年8月時点の事務所の最新顧客番号が230のため、新規は231番から。
 * 将来この基準が変わった場合は要調整。
 */
export const NEW_CLIENT_NUMBER_FLOOR = 231;

/** 新規顧客番号の提案：既存の最大値+1か、NEW_CLIENT_NUMBER_FLOORのいずれか大きい方。 */
export function suggestedNewClientNumber(existingClientNumbers: number[]): number {
  const max = Math.max(0, ...existingClientNumbers);
  return Math.max(max + 1, NEW_CLIENT_NUMBER_FLOOR);
}

/**
 * 顧客番号は、その顧客に紐づく案件の実番号（数字のみのもの）のうち最小値を採用する（v7 3.7）。
 * 数字のみの案件番号が1つもない場合はnullを返す（呼び出し側で既存値を維持する等の判断に使う）。
 */
export function clientNumberFromCaseNumbers(caseNumbers: string[]): number | null {
  const numeric = caseNumbers.filter((n) => /^\d+$/.test(n)).map((n) => parseInt(n, 10));
  if (numeric.length === 0) return null;
  return Math.min(...numeric);
}
