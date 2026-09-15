import { calcHoursFromTimes } from "./timecharge";

export interface ExtraSegmentInput {
  startTime: string;
  endTime: string;
}

/** 追加稼働時間（v17：退勤後に改めて作業した分など）の合計時間。不正な組は無視する。 */
export function calcExtraSegmentsHours(segments: ExtraSegmentInput[]): number {
  return segments.reduce((sum, s) => {
    const h = calcHoursFromTimes(s.startTime, s.endTime);
    return sum + (h ? Number(h) : 0);
  }, 0);
}

/** 勤務時間 = (退勤-出勤) - 休憩時間（分）。出勤・退勤のいずれかが未入力なら空文字（v14、v17で休憩は分数指定に変更）。 */
export function calcWorkedHours(clockIn: string, clockOut: string, breakMinutes: number): string {
  const totalStr = calcHoursFromTimes(clockIn, clockOut);
  if (!totalStr) return "";
  const total = Number(totalStr);
  const worked = Math.max(0, total - breakMinutes / 60);
  return String(Math.round(worked * 100) / 100);
}

/**
 * 有給・追加稼働時間を加味した勤務時間（v15、v17で追加稼働時間を追加）。
 * 半日有給は実績に4時間、全日有給は8時間を加算する
 * （所定労働時間はそのままで、有給取得分を実績側に上乗せする運用）。
 */
export function calcWorkedHoursWithLeave(
  clockIn: string,
  clockOut: string,
  breakMinutes: number,
  leaveType: string,
  extraSegments: ExtraSegmentInput[] = []
): string {
  const base = calcWorkedHours(clockIn, clockOut, breakMinutes);
  const leaveHours = leaveType === "full" ? 8 : leaveType === "half" ? 4 : 0;
  const extraHours = calcExtraSegmentsHours(extraSegments);
  const total = (base ? Number(base) : 0) + leaveHours + extraHours;
  if (total === 0) return "";
  return String(Math.round(total * 100) / 100);
}

/** その日の所定労働時間（分）。平日480分（8時間）、土日0分（v16）。 */
export function scheduledMinutesForDate(dateStr: string): number {
  const [y, m, d] = dateStr.split("-").map(Number);
  const weekday = new Date(y, m - 1, d).getDay();
  return weekday === 0 || weekday === 6 ? 0 : 480;
}

/** 実労働時間（追加稼働時間を含む）が所定労働時間を超えた分（残業時間・分）。有給分は残業に含めない（v16、v17で追加稼働時間を加算）。 */
export function calcOvertimeMinutes(
  clockIn: string,
  clockOut: string,
  breakMinutes: number,
  dateStr: string,
  extraSegments: ExtraSegmentInput[] = []
): number {
  const workedStr = calcWorkedHours(clockIn, clockOut, breakMinutes);
  const mainMin = workedStr ? Math.round(Number(workedStr) * 60) : 0;
  const extraMin = Math.round(calcExtraSegmentsHours(extraSegments) * 60);
  return Math.max(0, mainMin + extraMin - scheduledMinutesForDate(dateStr));
}
