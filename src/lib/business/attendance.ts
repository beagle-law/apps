import { calcHoursFromTimes } from "./timecharge";

/** 勤務時間 = (退勤-出勤) - (休憩終了-休憩開始)。出勤・退勤のいずれかが未入力なら空文字（v14）。 */
export function calcWorkedHours(clockIn: string, clockOut: string, breakStart: string, breakEnd: string): string {
  const totalStr = calcHoursFromTimes(clockIn, clockOut);
  if (!totalStr) return "";
  const total = Number(totalStr);
  const breakStr = breakStart && breakEnd ? calcHoursFromTimes(breakStart, breakEnd) : "";
  const breakHours = breakStr ? Number(breakStr) : 0;
  const worked = Math.max(0, total - breakHours);
  return String(Math.round(worked * 100) / 100);
}
