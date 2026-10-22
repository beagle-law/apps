"use client";

import { useEffect, useState } from "react";
import { Download, X, ChevronLeft, ChevronRight } from "lucide-react";
import { COLORS, FONT_MINCHO } from "@/lib/constants";
import { TextInput } from "@/components/ui";
import { formatDate, currentYearMonth, shiftYearMonth, formatYearMonth, todayStr } from "@/lib/dates";
import { invoiceTotal, formatYen } from "@/lib/business/invoice";
import { downloadInvoicePdf } from "@/lib/invoice-pdf";
import AutoSaveNote from "@/components/AutoSaveNote";
import * as api from "@/lib/api-client";
import type { Invoice, Client } from "@/lib/types";

interface Props {
  onOpenCase: (id: string) => void;
  onOpenClient: (clientId: string) => void;
  onError: (msg: string) => void;
}

// v21：今月の予定請求・支出を自由に書き込めるフリースペース（月ごとに保存）。
function MonthlyNoteCard({ onError }: { onError: (msg: string) => void }) {
  const [month, setMonth] = useState(currentYearMonth());
  return (
    <div className="rounded p-5 mb-5" style={{ backgroundColor: COLORS.card, border: `1px solid ${COLORS.brassLight}` }}>
      <div className="flex items-center justify-between mb-3 flex-wrap gap-2">
        <h3 className="text-sm font-bold" style={{ fontFamily: FONT_MINCHO, color: COLORS.navy, letterSpacing: "0.05em" }}>予定請求・支出メモ</h3>
        <div className="flex items-center gap-2">
          <button onClick={() => setMonth((m) => shiftYearMonth(m, -1))} style={{ color: COLORS.slate }}><ChevronLeft size={16} /></button>
          <span className="text-sm font-bold">{formatYearMonth(month)}</span>
          <button onClick={() => setMonth((m) => shiftYearMonth(m, 1))} style={{ color: COLORS.slate }}><ChevronRight size={16} /></button>
        </div>
      </div>
      <AutoSaveNote
        noteKey={month}
        rows={12}
        placeholder={"その月の予定請求・支出を自由に記入できます（例）\n【請求予定】\nコレカ 10\n【支出】\n・5日 コピー機 3"}
        onError={onError}
      />
    </div>
  );
}

// v29：アプリ外（別のExcel等）で作成した請求書を、請求額のみで登録して入金管理する。
function ExternalInvoiceCard({ onCreated, onError }: { onCreated: (inv: Invoice) => void; onError: (msg: string) => void }) {
  const [open, setOpen] = useState(false);
  const [clients, setClients] = useState<Client[]>([]);
  const [form, setForm] = useState({ clientId: "", issueDate: todayStr(), billingMonth: "", amount: "", notes: "" });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open || clients.length > 0) return;
    api.fetchClients().then(setClients).catch((e) => onError(e instanceof Error ? e.message : "顧客の取得に失敗しました"));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const valid = !!form.clientId && !!form.issueDate && !!form.billingMonth && Number(form.amount) > 0;

  const create = async () => {
    if (!valid || saving) return;
    setSaving(true);
    try {
      const inv = await api.createExternalInvoice({ clientId: form.clientId, issueDate: form.issueDate, billingMonth: form.billingMonth, amount: Number(form.amount), notes: form.notes });
      onCreated(inv);
      setForm((prev) => ({ ...prev, amount: "", notes: "" }));
    } catch (e) {
      onError(e instanceof Error ? e.message : "登録に失敗しました");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="rounded p-4 mb-5" style={{ backgroundColor: COLORS.card, border: `1px solid ${COLORS.brassLight}` }}>
      <button onClick={() => setOpen((v) => !v)} className="w-full flex items-center justify-between text-left">
        <span className="text-sm font-bold" style={{ fontFamily: FONT_MINCHO, color: COLORS.navy, letterSpacing: "0.05em" }}>外部で作成した請求書の登録（請求額のみ）</span>
        <span className="text-xs" style={{ color: COLORS.slate }}>{open ? "閉じる" : "開く"}</span>
      </button>
      {open && (
        <div className="flex flex-col gap-2 mt-3">
          <p className="text-xs" style={{ color: COLORS.slate }}>別のExcelなどで作成した請求書を、請求額だけ登録して、他の請求と同じように入金管理できます。</p>
          <select value={form.clientId} onChange={(e) => setForm({ ...form, clientId: e.target.value })} className="text-sm p-2 rounded outline-none w-full min-w-0" style={{ border: `1px solid ${COLORS.brassLight}` }}>
            <option value="">顧客を選択</option>
            {clients.map((c) => <option key={c.id} value={c.id}>{c.clientNumber ? `No.${c.clientNumber}　` : ""}{c.companyName}</option>)}
          </select>
          <div className="flex gap-2 min-w-0 flex-wrap">
            <label className="text-xs flex-1 min-w-0" style={{ color: COLORS.slate }}>
              請求対象月（必須）
              <input type="month" value={form.billingMonth} onChange={(e) => setForm({ ...form, billingMonth: e.target.value })} className="mt-1 w-full text-sm p-2 rounded outline-none block" style={{ border: `1px solid ${COLORS.brassLight}` }} />
            </label>
            <label className="text-xs flex-1 min-w-0" style={{ color: COLORS.slate }}>
              請求日
              <TextInput type="date" value={form.issueDate} onChange={(e) => setForm({ ...form, issueDate: e.target.value })} className="mt-1 w-full" />
            </label>
            <label className="text-xs flex-1 min-w-0" style={{ color: COLORS.slate }}>
              請求額（円）
              <TextInput type="number" placeholder="例：110000" value={form.amount} onChange={(e) => setForm({ ...form, amount: e.target.value })} className="mt-1 w-full" />
            </label>
          </div>
          <TextInput type="text" placeholder="メモ（請求書の名称・番号など。任意）" value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} className="w-full" />
          <button onClick={create} disabled={!valid || saving} className="self-end text-sm font-bold px-4 py-2 rounded disabled:opacity-40" style={{ backgroundColor: COLORS.navy, color: "#fff" }}>
            {saving ? "登録中..." : "登録する"}
          </button>
        </div>
      )}
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
    // 請求対象月の請求書として表示する。対象月が未設定の過去の請求書は、請求日の月で表示する。
    const ym = (inv.billingMonth || inv.issueDate || inv.createdAt).slice(0, 7);
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

        <ExternalInvoiceCard onCreated={(inv) => setInvoices((prev) => [inv, ...prev])} onError={onError} />

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
                <div key={ym} className="rounded p-3 sm:p-5 min-w-0" style={{ backgroundColor: COLORS.card, border: `1px solid ${COLORS.brassLight}` }}>
                  <div className="flex items-center justify-between mb-3 flex-wrap gap-1">
                    <h3 className="text-sm font-bold" style={{ fontFamily: FONT_MINCHO, color: COLORS.navy }}>{ym}<span className="text-xs font-normal ml-1.5" style={{ color: COLORS.slate }}>請求対象月</span></h3>
                    <span className="text-xs" style={{ color: COLORS.slate }}>
                      未入金計 <span className="font-bold" style={{ color: COLORS.ink }}>{formatYen(unpaidTotal)}</span>
                      　入金済計 <span className="font-bold" style={{ color: COLORS.ink }}>{formatYen(paidTotal)}</span>
                      　合計 <span className="font-bold" style={{ color: COLORS.ink }}>{formatYen(unpaidTotal + paidTotal)}</span>
                    </span>
                  </div>
                  <div className="flex flex-col gap-2">
                    {rows.map((inv) => (
                      <div key={inv.id} className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 text-sm p-2.5 rounded min-w-0" style={{ backgroundColor: COLORS.paper }}>
                        <button onClick={() => (inv.clientId ? onOpenClient(inv.clientId) : inv.caseId ? onOpenCase(inv.caseId) : undefined)} className="w-full sm:flex-1 min-w-0 text-left break-words">
                          <p>{inv.clientName}{inv.caseTitle ? `　${inv.caseTitle}` : ""}{inv.isExternal && <span className="text-xs px-1.5 py-0.5 rounded ml-2 align-middle" style={{ border: `1px solid ${COLORS.brass}`, color: COLORS.brass }}>外部作成</span>}</p>
                          <p className="text-xs" style={{ color: COLORS.slate }}>
                            {formatDate(inv.issueDate)}
                            {inv.dueDate && `　支払期限：${formatDate(inv.dueDate)}`}
                            {inv.paidAt && `　入金日：${formatDate(inv.paidAt)}`}
                          </p>
                          {inv.isExternal && inv.notes && <p className="text-xs" style={{ color: COLORS.slate }}>{inv.notes}</p>}
                        </button>
                        <div className="flex items-center gap-2 flex-wrap sm:flex-nowrap sm:flex-shrink-0">
                        <span className="font-bold flex-shrink-0 mr-auto sm:mr-0">{formatYen(invoiceTotal(inv.sections).total)}</span>
                        <span className="text-xs font-bold px-2 py-1 rounded-full flex-shrink-0" style={{ backgroundColor: inv.paid ? COLORS.moss : COLORS.slate, color: "#fff" }}>
                          {inv.paid ? "入金済み" : "未入金"}
                        </span>
                        {inv.paid ? (
                          <button onClick={() => togglePaid(inv)} className="text-xs px-2 py-1 rounded flex-shrink-0 hover:opacity-70" style={{ border: `1px solid ${COLORS.brassLight}`, color: COLORS.slate }} title="入金済みを未入金に戻す">消込取消</button>
                        ) : (
                          <button onClick={() => togglePaid(inv)} className="text-xs font-bold px-3 py-1 rounded flex-shrink-0 hover:opacity-80" style={{ backgroundColor: COLORS.navy, color: "#fff" }} title="入金を確認したら押します（入金済みになり、一覧から消えます）">消込み</button>
                        )}
                        {!inv.isExternal && <button onClick={() => downloadPdf(inv)} className="flex-shrink-0" style={{ color: COLORS.navy }} title="PDFをダウンロード"><Download size={14} /></button>}
                        <button onClick={() => removeInvoice(inv.id)} className="flex-shrink-0 p-1" style={{ color: COLORS.slate }} title="削除"><X size={16} /></button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        <div className="rounded p-5 mt-5" style={{ backgroundColor: COLORS.card, border: `1px solid ${COLORS.brassLight}` }}>
          <h3 className="text-sm font-bold mb-3" style={{ fontFamily: FONT_MINCHO, color: COLORS.navy, letterSpacing: "0.05em" }}>入金管理メモ</h3>
          <AutoSaveNote noteKey="payment" rows={8} placeholder="入金の確認状況・入金予定などを自由に記入できます" onError={onError} />
        </div>
      </div>
    </div>
  );
}
