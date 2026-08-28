"use client";

import { useEffect, useState } from "react";
import { Download, X } from "lucide-react";
import { COLORS, FONT_MINCHO } from "@/lib/constants";
import { formatDate } from "@/lib/dates";
import { invoiceTotal, formatYen } from "@/lib/business/invoice";
import { downloadInvoicePdf } from "@/lib/invoice-pdf";
import * as api from "@/lib/api-client";
import type { Invoice } from "@/lib/types";

interface Props {
  onOpenCase: (id: string) => void;
  onError: (msg: string) => void;
}

export default function BillingView({ onOpenCase, onError }: Props) {
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [showPaid, setShowPaid] = useState(false);

  useEffect(() => {
    api.fetchInvoices().then(setInvoices).catch((e) => onError(e instanceof Error ? e.message : "取得に失敗しました"));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const togglePaid = async (inv: Invoice) => {
    try {
      const updated = await api.markInvoicePaid(inv.id, !inv.paid);
      setInvoices((prev) => prev.map((i) => (i.id === updated.id ? updated : i)));
    } catch (e) {
      onError(e instanceof Error ? e.message : "更新に失敗しました");
    }
  };

  const downloadPdf = async (inv: Invoice) => {
    try {
      await downloadInvoicePdf(inv);
    } catch (e) {
      onError(e instanceof Error ? e.message : "PDFの作成に失敗しました");
    }
  };

  const removeInvoice = async (id: string) => {
    try {
      await api.deleteInvoice(id);
      setInvoices((prev) => prev.filter((i) => i.id !== id));
    } catch (e) {
      onError(e instanceof Error ? e.message : "削除に失敗しました");
    }
  };

  // v10 4.7：月ごとの合計は「入金済みのものも表示する」チェックの状態にかかわらず、
  // その月の全請求書を対象に「未入金計／入金済計／合計」の3種類を算出する。
  const allGroups = new Map<string, Invoice[]>();
  invoices.forEach((inv) => {
    const ym = (inv.issueDate || inv.createdAt).slice(0, 7);
    if (!allGroups.has(ym)) allGroups.set(ym, []);
    allGroups.get(ym)!.push(inv);
  });
  const sortedMonths = Array.from(allGroups.keys()).sort((a, b) => (a < b ? 1 : -1));

  return (
    <div className="flex-1 overflow-y-auto p-6">
      <div className="max-w-3xl mx-auto">
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-lg" style={{ fontFamily: FONT_MINCHO, color: COLORS.navy }}>請求管理</h2>
          <label className="flex items-center gap-1.5 text-xs" style={{ color: COLORS.slate }}>
            <input type="checkbox" checked={showPaid} onChange={(e) => setShowPaid(e.target.checked)} /> 入金済みのものも表示する
          </label>
        </div>

        {sortedMonths.length === 0 ? (
          <p className="text-sm py-10 text-center rounded" style={{ color: COLORS.slate, backgroundColor: COLORS.card, border: `1px solid ${COLORS.brassLight}` }}>請求書がありません。</p>
        ) : (
          <div className="flex flex-col gap-5">
            {sortedMonths.map((ym) => {
              const monthInvoices = allGroups.get(ym)!;
              const unpaidTotal = monthInvoices.filter((i) => !i.paid).reduce((s, inv) => s + invoiceTotal(inv.sections).total, 0);
              const paidTotal = monthInvoices.filter((i) => i.paid).reduce((s, inv) => s + invoiceTotal(inv.sections).total, 0);
              const rows = showPaid ? monthInvoices : monthInvoices.filter((i) => !i.paid);
              if (rows.length === 0) return null;
              return (
                <div key={ym} className="rounded p-5" style={{ backgroundColor: COLORS.card, border: `1px solid ${COLORS.brassLight}` }}>
                  <div className="flex items-center justify-between mb-3 flex-wrap gap-1">
                    <h3 className="text-sm font-bold" style={{ fontFamily: FONT_MINCHO, color: COLORS.navy }}>{ym}</h3>
                    <span className="text-xs" style={{ color: COLORS.slate }}>
                      未入金計 <span className="font-bold" style={{ color: COLORS.ink }}>{formatYen(unpaidTotal)}</span>
                      　入金済計 <span className="font-bold" style={{ color: COLORS.ink }}>{formatYen(paidTotal)}</span>
                      　合計 <span className="font-bold" style={{ color: COLORS.ink }}>{formatYen(unpaidTotal + paidTotal)}</span>
                    </span>
                  </div>
                  <div className="flex flex-col gap-2">
                    {rows.map((inv) => (
                      <div key={inv.id} className="flex items-center justify-between gap-2 text-sm p-2 rounded" style={{ backgroundColor: COLORS.paper }}>
                        <button onClick={() => onOpenCase(inv.caseId)} className="flex-1 text-left">
                          <p>{inv.clientName}　{inv.caseTitle}</p>
                          <p className="text-xs" style={{ color: COLORS.slate }}>
                            {formatDate(inv.issueDate)}
                            {inv.dueDate && `　支払期限：${formatDate(inv.dueDate)}`}
                            {inv.paidAt && `　入金日：${formatDate(inv.paidAt)}`}
                          </p>
                        </button>
                        <span className="font-bold flex-shrink-0">{formatYen(invoiceTotal(inv.sections).total)}</span>
                        <button onClick={() => togglePaid(inv)} className="text-xs font-bold px-2 py-1 rounded-full flex-shrink-0" style={{ backgroundColor: inv.paid ? COLORS.moss : COLORS.slate, color: "#fff" }}>
                          {inv.paid ? "入金済み" : "未入金"}
                        </button>
                        <button onClick={() => downloadPdf(inv)} className="flex-shrink-0" style={{ color: COLORS.navy }} title="PDFをダウンロード"><Download size={14} /></button>
                        <button onClick={() => removeInvoice(inv.id)} className="flex-shrink-0" style={{ color: COLORS.slate }} title="削除"><X size={14} /></button>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
