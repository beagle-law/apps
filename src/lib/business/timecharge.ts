/**
 * タイムチャージの時刻入力補助（v7 4.2）。
 * 「1004」のような3〜4桁の数字入力を「10:04」形式に自動変換する。
 * 既に「H:MM」「HH:MM」形式で入力された場合はそのまま（時のみ0埋め）扱う。
 */
export function normalizeTimeInput(raw: string): string {
  const trimmed = (raw || "").trim();
  if (!trimmed) return "";
  if (/^\d{1,2}:\d{2}$/.test(trimmed)) {
    const [h, m] = trimmed.split(":");
    return `${h.padStart(2, "0")}:${m}`;
  }
  if (/^\d{3,4}$/.test(trimmed)) {
    const digits = trimmed.padStart(4, "0");
    const hh = digits.slice(0, 2);
    const mm = digits.slice(2, 4);
    if (Number(hh) <= 23 && Number(mm) <= 59) return `${hh}:${mm}`;
  }
  return trimmed;
}

/** 開始・終了時刻（"HH:MM"）から稼働時間を時間単位・小数第2位までで算出する（日をまたぐ場合は+24時間）。 */
export function calcHoursFromTimes(startTime: string, endTime: string): string {
  if (!startTime || !endTime) return "";
  const [sh, sm] = startTime.split(":").map(Number);
  const [eh, em] = endTime.split(":").map(Number);
  if ([sh, sm, eh, em].some((n) => Number.isNaN(n))) return "";
  let diffMinutes = eh * 60 + em - (sh * 60 + sm);
  if (diffMinutes < 0) diffMinutes += 24 * 60;
  return String(Math.round((diffMinutes / 60) * 100) / 100);
}
