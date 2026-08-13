export interface InvoiceTotalInput {
  feeItems: { amount: number }[];
  applyTax: boolean;
  applyWithholding: boolean;
  expenseAmount: number;
}

export interface InvoiceTotal {
  feeSubtotal: number;
  tax: number;
  withholding: number;
  section1: number;
  section2: number;
  total: number;
}

/** Ported verbatim from the prototype's invoiceTotal(): 消費税10%・源泉徴収10.21%、それぞれ独立にroundする。 */
export function invoiceTotal(inv: InvoiceTotalInput): InvoiceTotal {
  const feeSubtotal = inv.feeItems.reduce((sum, item) => sum + item.amount, 0);
  const tax = inv.applyTax ? Math.round(feeSubtotal * 0.1) : 0;
  const withholding = inv.applyWithholding ? Math.round(feeSubtotal * 0.1021) : 0;
  const section1 = feeSubtotal + tax - withholding;
  const section2 = Number(inv.expenseAmount) || 0;
  const total = section1 + section2;
  return { feeSubtotal, tax, withholding, section1, section2, total };
}

/** 未請求のタイムチャージから「稼働報酬」項目を1件生成する。 */
export function buildTimeChargeFeeItem(unbilledHoursTotal: number, hourlyRate: number) {
  const rate = Number(hourlyRate) || 0;
  const amount = Math.round(unbilledHoursTotal * rate);
  return {
    description: `稼働報酬（${unbilledHoursTotal}時間 × ¥${rate.toLocaleString("ja-JP")}/時間）`,
    amount,
  };
}
