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
