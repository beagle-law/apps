"use client";

import { useEffect, useState } from "react";
import { Download, X, ChevronLeft, ChevronRight } from "lucide-react";
import { COLORS, FONT_MINCHO } from "@/lib/constants";
import { formatDate, currentYearMonth, shiftYearMonth, formatYearMonth } from "@/lib/dates";
import { invoiceTotal, formatYen } from "@/lib/business/invoice";
import { downloadInvoicePdf } from "@/lib/invoice-pdf";
import * as api from "@/lib/api-client";
import type { Invoice } from "@/lib/types";

interface Props {
  onOpenCase: (id: string) => void;
  onOpenClient: (clientId: string) => void;
  onError: (msg: string) => void;
}

// v21：今月の予定請求・支出を自由に書き込めるフリースペース（月ごとに保存）。
function MonthlyNoteCard({ onError }: { onError: (msg: string) => void }) {
  const [month, setMonth] = useState(currentYearMonth());
  const [content, setContent] = useState("");
  const [savedContent, setSavedContent] = useState("");
  const [loaded, setLoaded] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    let cancelled = false;
    setLoaded(false);
    api
      .fetchMonthlyNote(month)
      .then((n) => {
        if (cancelled) return;
        setContent(n.content);
        setSavedContent(n.content);
        setLoaded(true);
      })
      .catch((e) => onError(e instanceof Error ? e.message : "取得に失敗しました"));
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [month]);

  const save = async () => {
    if (!loaded || content === savedContent) return;
    setSaving(true);
    try {
      const n = await api.saveMonthlyNote(month, content);
      setSavedContent(n.content);
    } catch (e) {
      onError(e instanceof Error ? e.message : "保存に失敗しました");
    } finally {
      setSaving(false);
    }
  };

  const changeMonth = async (delta: number) => {
    await save();
    setMonth((m) => shiftYearMonth(m, delta));
  };

  return (
    <div className="rounded p-5 mb-5" style={{ backgroundColor: COLORS.card, border: `1px solid ${COLORS.brassLight}` }}>
      <div className="flex items-center justify-between mb-3 flex-wrap gap-2">
        <h3 className="text-sm font-bold" style={{ fontFamily: FONT_MINCHO, color: COLORS.navy, letterSpacing: "0.05em" }}>予定請求・支出メモ</h3>
        <div className="flex items-center gap-2">
          <button onClick={() => changeMonth(-1)} style={{ color: COLORS.slate }}><ChevronLeft size={16} /></button>
          <span className="text-sm font-bold">{formatYearMonth(month)}</span>
          <button onClick={() => changeMonth(1)} style={{ color: COLORS.slate }}><ChevronRight size={16} /></button>
        </div>
      </div>
      <textarea
        value={content}
        onChange={(e) => setContent(e.target.value)}
        onBlur={save}
        disabled={!loaded}
        placeholder={"その月の予定請求・支出を自由に記入できます（例）\n【請求予定】\nコレカ 10\n【支出】\n・5日 コピー機 3"}
        rows={12}
        className="w-full text-sm p-2 rounded outline-none resize-y"
        style={{ border: `1px solid ${COLORS.brassLight}`, lineHeight: 1.7 }}
      />
      <p className="text-xs mt-1 text-right" style={{ color: COLORS.slate }}>
        {saving ? "保存中..." : loaded && content === savedContent ? "保存済み（入力欄の外をクリックすると自動保存されます）" : "未保存（入力欄の外をクリックすると自動保存されます）"}
      </p>
    </div>
  );
}

export default function BillingView({ onOpenCase, onOpenClient, onError }: Props) {
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

        <MonthlyNoteCard onError={onError} />

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
                        <button onClick={() => (inv.clientId ? onOpenClient(inv.clientId) : inv.caseId ? onOpenCase(inv.caseId) : undefined)} className="flex-1 text-left">
                          <p>{inv.clientName}{inv.caseTitle ? `　${inv.caseTitle}` : ""}</p>
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
