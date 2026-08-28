export const todayStr = () => new Date().toISOString().slice(0, 10);

export const plusDaysStr = (n: number) => {
  const d = new Date();
  d.setDate(d.getDate() + n);
  return d.toISOString().slice(0, 10);
};

export function formatDate(dateStr?: string | null) {
  if (!dateStr) return "";
  try {
    return new Date(dateStr + "T00:00:00").toLocaleDateString("ja-JP-u-ca-japanese", {
      era: "long",
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  } catch {
    return dateStr;
  }
}

export function formatDateShort(dateStr?: string | null) {
  if (!dateStr) return "";
  try {
    return new Date(dateStr + "T00:00:00").toLocaleDateString("ja-JP", {
      month: "long",
      day: "numeric",
    });
  } catch {
    return dateStr;
  }
}

export function formatDateTime(iso: string) {
  try {
    const d = new Date(iso);
    const datePart = d.toLocaleDateString("ja-JP-u-ca-japanese", {
      era: "long",
      year: "numeric",
      month: "long",
      day: "numeric",
    });
    const timePart = d.toLocaleTimeString("ja-JP", { hour: "2-digit", minute: "2-digit" });
    return `${datePart} ${timePart}`;
  } catch {
    return iso;
  }
}

export function relativeDayLabel(dateStr: string) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const d = new Date(dateStr + "T00:00:00");
  const diff = Math.round((d.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
  if (diff === 0) return "本日";
  if (diff === 1) return "明日";
  if (diff < 0) return `${Math.abs(diff)}日前`;
  return `${diff}日後`;
}

export const currentYearMonth = () => new Date().toISOString().slice(0, 7);

/** dateStrの月の月末日（YYYY-MM-DD）を返す。v10：請求書の支払期限デフォルト算出に使用 */
export function endOfMonth(dateStr: string): string {
  const [y, m] = dateStr.split("-").map(Number);
  if (!y || !m) return dateStr;
  const d = new Date(y, m, 0); // 翌月0日目＝当月末日
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

export function shiftYearMonth(ym: string, delta: number): string {
  const [y, m] = ym.split("-").map(Number);
  const d = new Date(y, m - 1 + delta, 1);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

export function formatYearMonth(ym: string) {
  const [y, m] = ym.split("-").map(Number);
  if (!y || !m) return ym;
  return new Date(y, m - 1, 1).toLocaleDateString("ja-JP-u-ca-japanese", {
    era: "long",
    year: "numeric",
    month: "long",
  });
}
