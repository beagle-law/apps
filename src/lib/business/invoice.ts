export interface InvoiceSectionItemInput {
  description: string;
  amount: number;
}

export interface InvoiceSectionInput {
  type: string;
  applyTax: boolean;
  applyWithholding: boolean;
  items: InvoiceSectionItemInput[];
}

export interface InvoiceSectionTotal extends InvoiceSectionInput {
  subtotal: number;
  tax: number;
  withholding: number;
  total: number;
}

/**
 * 源泉所得税の計算式（要件定義書v6 3.5）：
 * 弁護士報酬合計が100万円以下 → 報酬合計 × 10.21%
 * 100万円超 → （報酬合計－100万円）× 20.42% ＋ 102,100円
 */
export function withholdingTax(feeSubtotal: number): number {
  if (feeSubtotal <= 0) return 0;
  if (feeSubtotal <= 1_000_000) {
    return Math.round(feeSubtotal * 0.1021);
  }
  return Math.round((feeSubtotal - 1_000_000) * 0.2042) + 102_100;
}

/** 区分1件分の小計・消費税・源泉徴収・区分合計を計算する。消費税・源泉徴収は「弁護士報酬」区分にのみ適用される（v9 3.8）。 */
export function sectionTotal<T extends InvoiceSectionInput>(sec: T): T & { subtotal: number; tax: number; withholding: number; total: number } {
  const subtotal = sec.items.reduce((sum, item) => sum + (Number(item.amount) || 0), 0);
  const isFeeSection = sec.type === "弁護士報酬";
  const tax = isFeeSection && sec.applyTax ? Math.round(subtotal * 0.1) : 0;
  const withholding = isFeeSection && sec.applyWithholding ? withholdingTax(subtotal) : 0;
  const total = subtotal + tax - withholding;
  return { ...sec, subtotal, tax, withholding, total };
}

/** 請求書全体（区分の配列）の集計。 */
export function invoiceTotal<T extends InvoiceSectionInput>(sections: T[]) {
  const computedSections = sections.map((sec) => sectionTotal(sec));
  const total = computedSections.reduce((sum, sec) => sum + sec.total, 0);
  return { sections: computedSections, total };
}

/** 金額を「-¥1,000」のように符号付きで表示用にフォーマットする（マイナス額の返金等に対応、v9 3.8）。 */
export function formatYen(n: number): string {
  const sign = n < 0 ? "-" : "";
  return `${sign}¥${Math.abs(Math.round(n)).toLocaleString("ja-JP")}`;
}

/** 未請求のタイムチャージから「稼働報酬」項目を1件生成する。 */
export function buildTimeChargeItem(unbilledHoursTotal: number, hourlyRate: number): InvoiceSectionItemInput {
  const rate = Number(hourlyRate) || 0;
  const amount = Math.round(unbilledHoursTotal * rate);
  return {
    description: `稼働報酬（${unbilledHoursTotal}時間 × ¥${rate.toLocaleString("ja-JP")}/時間）`,
    amount,
  };
}
