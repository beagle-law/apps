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

/**
 * 有給分を加味した勤務時間（v15）。半日有給は実績に4時間、全日有給は8時間を加算する
 * （所定労働時間はそのままで、有給取得分を実績側に上乗せする運用）。
 */
export function calcWorkedHoursWithLeave(
  clockIn: string,
  clockOut: string,
  breakStart: string,
  breakEnd: string,
  leaveType: string
): string {
  const base = calcWorkedHours(clockIn, clockOut, breakStart, breakEnd);
  const leaveHours = leaveType === "full" ? 8 : leaveType === "half" ? 4 : 0;
  if (!base && !leaveHours) return "";
  const total = (base ? Number(base) : 0) + leaveHours;
  return String(Math.round(total * 100) / 100);
}

/** その日の所定労働時間（分）。平日480分（8時間）、土日0分（v16）。 */
export function scheduledMinutesForDate(dateStr: string): number {
  const [y, m, d] = dateStr.split("-").map(Number);
  const weekday = new Date(y, m - 1, d).getDay();
  return weekday === 0 || weekday === 6 ? 0 : 480;
}

/** 実労働時間が所定労働時間を超えた分（残業時間・分）。有給分は残業に含めない（v16）。 */
export function calcOvertimeMinutes(clockIn: string, clockOut: string, breakStart: string, breakEnd: string, dateStr: string): number {
  const workedStr = calcWorkedHours(clockIn, clockOut, breakStart, breakEnd);
  if (!workedStr) return 0;
  const workedMin = Math.round(Number(workedStr) * 60);
  return Math.max(0, workedMin - scheduledMinutesForDate(dateStr));
}
