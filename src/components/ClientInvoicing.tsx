"use client";

import { useEffect, useState } from "react";
import { X, Download, Receipt, FileText, History } from "lucide-react";
import { COLORS, FONT_MINCHO, INVOICE_SECTION_TYPES } from "@/lib/constants";
import { formatDate, formatDateShort, todayStr } from "@/lib/dates";
import { TextInput } from "@/components/ui";
import { invoiceTotal, buildTimeChargeItem, formatYen, DEFAULT_INVOICE_NOTES } from "@/lib/business/invoice";
import { downloadInvoicePdf } from "@/lib/invoice-pdf";
import * as api from "@/lib/api-client";
import type { Client, TimeCharge, Invoice, ExpenseWithCase } from "@/lib/types";

interface Props {
  client: Client;
  onError: (msg: string) => void;
}

interface SectionItemDraft {
  tempId: string;
  description: string;
  amount: string;
}

interface SectionDraft {
  tempId: string;
  type: string;
  customTypeLabel: string;
  applyTax: boolean;
  applyWithholding: boolean;
  items: SectionItemDraft[];
}

function newSectionDraft(applyWithholdingDefault: boolean): SectionDraft {
  return {
    tempId: crypto.randomUUID(),
    type: "弁護士報酬",
    customTypeLabel: "",
    applyTax: true,
    applyWithholding: applyWithholdingDefault,
    items: [],
  };
}

// v12 4.1：請求書機能を案件から顧客に紐づけ直した中核コンポーネント。実費履歴・請求書作成・請求書履歴の3カード。
export default function ClientInvoicing({ client, onError }: Props) {
  const [expenseHistory, setExpenseHistory] = useState<ExpenseWithCase[]>([]);
  const [invoiceHistory, setInvoiceHistory] = useState<Invoice[]>([]);
  const [unbilledTimeCharges, setUnbilledTimeCharges] = useState<TimeCharge[]>([]);
  const [timeChargeRateDraft, setTimeChargeRateDraft] = useState("");
  const [billTimeChargeIds, setBillTimeChargeIds] = useState<string[]>([]);
  const [invoiceForm, setInvoiceForm] = useState({ issueDate: todayStr(), dueDate: "", addressee: client.companyName, honorific: "", notes: DEFAULT_INVOICE_NOTES });
  const [invoiceSections, setInvoiceSections] = useState<SectionDraft[]>([newSectionDraft(client.clientType === "法人")]);
  const [creatingInvoice, setCreatingInvoice] = useState(false);

  const refreshExpenses = () => api.fetchClientExpenseHistory(client.id).then(setExpenseHistory).catch(() => setExpenseHistory([]));
  const refreshInvoices = () => api.fetchInvoices({ clientId: client.id }).then(setInvoiceHistory).catch(() => setInvoiceHistory([]));

  useEffect(() => {
    refreshExpenses();
    refreshInvoices();
    api.fetchClientUnbilledTimeCharges(client.id).then(setUnbilledTimeCharges).catch(() => setUnbilledTimeCharges([]));
    setBillTimeChargeIds([]);
    setInvoiceForm({ issueDate: todayStr(), dueDate: "", addressee: client.companyName, honorific: "", notes: DEFAULT_INVOICE_NOTES });
    setInvoiceSections([newSectionDraft(client.clientType === "法人")]);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [client.id]);

  const checkedUnbilled = expenseHistory.filter((e) => e.checkedForBilling && !e.billedInInvoiceId);
  const checkedTotal = checkedUnbilled.reduce((s, e) => s + e.amount, 0);
  const eligibleForSelectAll = expenseHistory.filter((e) => !e.billedInInvoiceId);
  const allSelected = eligibleForSelectAll.length > 0 && eligibleForSelectAll.every((e) => e.checkedForBilling);

  const toggleExpenseChecked = async (e: ExpenseWithCase, checked: boolean) => {
    try {
      await api.setExpenseCheckedForBilling(e.caseId, e.id, checked);
      setExpenseHistory((prev) => prev.map((x) => (x.id === e.id ? { ...x, checkedForBilling: checked } : x)));
    } catch (err) {
      onError(err instanceof Error ? err.message : "更新に失敗しました");
    }
  };
  const toggleSelectAll = async (checked: boolean) => {
    try {
      await api.selectAllClientExpenses(client.id, checked);
      refreshExpenses();
    } catch (err) {
      onError(err instanceof Error ? err.message : "更新に失敗しました");
    }
  };

  // ── 請求書作成 ──────────────────────────────────────
  const addSection = () => setInvoiceSections((prev) => [...prev, newSectionDraft(true)]);
  const removeSection = (tempId: string) =>
    setInvoiceSections((prev) => (prev.length <= 1 ? prev : prev.filter((s) => s.tempId !== tempId)));
  const updateSection = (tempId: string, updates: Partial<SectionDraft>) =>
    setInvoiceSections((prev) =>
      prev.map((s) => {
        if (s.tempId !== tempId) return s;
        const next = { ...s, ...updates };
        // v12 4.1：区分の種別で「実費」を選んだときは、チェック済みの実費合計額を自動で項目に転記する
        if (updates.type === "実費" && s.type !== "実費") {
          next.items = checkedTotal > 0 ? [{ tempId: crypto.randomUUID(), description: "実費", amount: String(checkedTotal) }] : [];
        }
        return next;
      })
    );
  const addSectionItem = (tempId: string) =>
    setInvoiceSections((prev) =>
      prev.map((s) => (s.tempId === tempId ? { ...s, items: [...s.items, { tempId: crypto.randomUUID(), description: "", amount: "" }] } : s))
    );
  const updateSectionItem = (sectionTempId: string, itemTempId: string, updates: Partial<SectionItemDraft>) =>
    setInvoiceSections((prev) =>
      prev.map((s) =>
        s.tempId === sectionTempId ? { ...s, items: s.items.map((i) => (i.tempId === itemTempId ? { ...i, ...updates } : i)) } : s
      )
    );
  const removeSectionItem = (sectionTempId: string, itemTempId: string) =>
    setInvoiceSections((prev) =>
      prev.map((s) => (s.tempId === sectionTempId ? { ...s, items: s.items.filter((i) => i.tempId !== itemTempId) } : s))
    );

  // タイムチャージから計算した項目は、最初に見つかった「弁護士報酬」区分に追加する（無ければ新規作成、v9 3.8）
  const addTimeChargeSectionItem = () => {
    const totalHours = unbilledTimeCharges.reduce((sum, t) => sum + t.hours, 0);
    if (!totalHours || !timeChargeRateDraft) return;
    const built = buildTimeChargeItem(totalHours, Number(timeChargeRateDraft) || 0);
    const newItem: SectionItemDraft = { tempId: crypto.randomUUID(), description: built.description, amount: String(built.amount) };
    setInvoiceSections((prev) => {
      const idx = prev.findIndex((s) => s.type === "弁護士報酬");
      if (idx >= 0) return prev.map((s, i) => (i === idx ? { ...s, items: [...s.items, newItem] } : s));
      return [...prev, { ...newSectionDraft(true), items: [newItem] }];
    });
    setBillTimeChargeIds(unbilledTimeCharges.map((t) => t.id));
    setTimeChargeRateDraft("");
  };

  const draftSectionsForTotal = invoiceSections.map((s) => ({
    type: s.type,
    applyTax: s.applyTax,
    applyWithholding: s.applyWithholding,
    items: s.items.filter((i) => i.description.trim() && i.amount !== "").map((i) => ({ description: i.description, amount: Number(i.amount) })),
  }));
  const previewTotals = invoiceTotal(draftSectionsForTotal);
  const hasAnyInvoiceItem = draftSectionsForTotal.some((s) => s.items.length > 0);

  const submitInvoice = async () => {
    const cleanedSections = invoiceSections
      .map((s) => ({
        type: s.type,
        customTypeLabel: s.customTypeLabel,
        applyTax: s.applyTax,
        applyWithholding: s.applyWithholding,
        items: s.items.filter((i) => i.description.trim() && i.amount !== "").map((i) => ({ description: i.description.trim(), amount: Number(i.amount) })),
      }))
      .filter((s) => s.items.length > 0);
    if (!cleanedSections.length || !invoiceForm.issueDate) return;
    setCreatingInvoice(true);
    try {
      const inv = await api.createInvoice({
        clientId: client.id,
        addressee: invoiceForm.addressee.trim(),
        issueDate: invoiceForm.issueDate,
        honorific: invoiceForm.honorific || undefined,
        dueDate: invoiceForm.dueDate || undefined,
        sections: cleanedSections,
        notes: invoiceForm.notes,
        billTimeChargeIds,
        billExpenseIds: checkedUnbilled.map((e) => e.id),
      });
      await downloadInvoicePdf(inv);
      const wasWithholdingDefault = invoiceSections[0]?.applyWithholding ?? false;
      setInvoiceSections([newSectionDraft(wasWithholdingDefault)]);
      setBillTimeChargeIds([]);
      setInvoiceForm({ issueDate: todayStr(), dueDate: "", addressee: client.companyName, honorific: "", notes: DEFAULT_INVOICE_NOTES });
      api.fetchClientUnbilledTimeCharges(client.id).then(setUnbilledTimeCharges).catch(() => setUnbilledTimeCharges([]));
      refreshExpenses();
      refreshInvoices();
    } catch (e) {
      onError(e instanceof Error ? e.message : "請求書の作成に失敗しました");
    } finally {
      setCreatingInvoice(false);
    }
  };

  // ── 請求書履歴 ──────────────────────────────────────
  const togglePaid = async (inv: Invoice) => {
    try {
      const updated = await api.markInvoicePaid(inv.id, !inv.paid);
      setInvoiceHistory((prev) => prev.map((i) => (i.id === updated.id ? updated : i)));
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
      setInvoiceHistory((prev) => prev.filter((i) => i.id !== id));
      refreshExpenses();
    } catch (e) {
      onError(e instanceof Error ? e.message : "削除に失敗しました");
    }
  };

  return (
    <>
      {/* 実費履歴 */}
      <div className="rounded p-5" style={{ backgroundColor: COLORS.card, border: `1px solid ${COLORS.brassLight}` }}>
        <h3 className="text-sm font-bold mb-3 flex items-center gap-1.5" style={{ fontFamily: FONT_MINCHO, color: COLORS.navy }}><Receipt size={15} /> 実費履歴</h3>
        {expenseHistory.length === 0 ? (
          <p className="text-sm" style={{ color: COLORS.slate }}>実費はありません。</p>
        ) : (
          <>
            <label className="flex items-center gap-2 text-xs mb-2" style={{ color: COLORS.slate }}>
              <input type="checkbox" checked={allSelected} disabled={eligibleForSelectAll.length === 0} onChange={(e) => toggleSelectAll(e.target.checked)} />
              すべて選択（未請求のみ）
            </label>
            <div className="flex flex-col gap-1.5 mb-3">
              {expenseHistory.map((e) => (
                <div key={e.id} className="flex items-center gap-2 text-sm p-2 rounded" style={{ backgroundColor: COLORS.paper }}>
                  <input
                    type="checkbox"
                    checked={e.checkedForBilling}
                    disabled={!!e.billedInInvoiceId}
                    onChange={(ev) => toggleExpenseChecked(e, ev.target.checked)}
                  />
                  <span className="text-xs flex-shrink-0" style={{ color: COLORS.slate }}>{formatDateShort(e.date)}</span>
                  <span className="text-xs flex-shrink-0 truncate" style={{ color: COLORS.slate, maxWidth: 100 }}>{e.caseTitle}</span>
                  <span className="flex-1 truncate">{e.category}</span>
                  <span className="font-bold flex-shrink-0">¥{e.amount.toLocaleString("ja-JP")}</span>
                  {e.billedInInvoiceId && <span className="text-xs flex-shrink-0" style={{ color: COLORS.moss }}>請求済</span>}
                </div>
              ))}
            </div>
            <div className="flex items-center justify-between text-sm">
              <span>実費合計（全期間）：¥{expenseHistory.reduce((s, e) => s + e.amount, 0).toLocaleString("ja-JP")}</span>
              <span className="font-bold">チェック済み合計：¥{checkedTotal.toLocaleString("ja-JP")}</span>
            </div>
          </>
        )}
      </div>

      {/* 請求書作成 */}
      <div className="rounded p-5" style={{ backgroundColor: COLORS.card, border: `1px solid ${COLORS.brassLight}` }}>
        <h3 className="text-sm font-bold mb-3 flex items-center gap-1.5" style={{ fontFamily: FONT_MINCHO, color: COLORS.navy }}><FileText size={15} /> 請求書作成</h3>

        <div className="flex flex-wrap gap-3 mb-3">
          <label className="text-xs" style={{ color: COLORS.slate }}>
            発行日
            <TextInput type="date" value={invoiceForm.issueDate} onChange={(e) => setInvoiceForm({ ...invoiceForm, issueDate: e.target.value })} className="mt-1 w-full sm:w-48" />
          </label>
          <label className="text-xs" style={{ color: COLORS.slate }}>
            支払期限（空欄で発行月末）
            <TextInput type="date" value={invoiceForm.dueDate} onChange={(e) => setInvoiceForm({ ...invoiceForm, dueDate: e.target.value })} className="mt-1 w-full sm:w-48" />
          </label>
        </div>
        <div className="flex flex-wrap gap-3 mb-3">
          <label className="text-xs flex-1" style={{ color: COLORS.slate, minWidth: 200 }}>
            宛先
            <TextInput type="text" value={invoiceForm.addressee} onChange={(e) => setInvoiceForm({ ...invoiceForm, addressee: e.target.value })} className="mt-1 w-full" />
          </label>
          <label className="text-xs" style={{ color: COLORS.slate }}>
            敬称（空欄で依頼者区分から自動判定）
            <select value={invoiceForm.honorific} onChange={(e) => setInvoiceForm({ ...invoiceForm, honorific: e.target.value })} className="mt-1 text-sm p-2 rounded outline-none block" style={{ border: `1px solid ${COLORS.brassLight}` }}>
              <option value="">自動</option>
              <option value="御中">御中</option>
              <option value="様">様</option>
            </select>
          </label>
        </div>

        {checkedUnbilled.length > 0 && (
          <div className="rounded p-3 mb-3" style={{ backgroundColor: COLORS.paper, border: `1px dashed ${COLORS.brassLight}` }}>
            <p className="text-xs font-bold mb-1.5" style={{ color: COLORS.navy }}>実費（別紙自動反映）</p>
            <p className="text-xs" style={{ color: COLORS.slate }}>
              実費履歴でチェック済みの実費 {checkedUnbilled.length}件（合計¥{checkedTotal.toLocaleString("ja-JP")}）が、
              この請求書の作成と同時に「反映済み」となり、別紙実費一覧に自動記載されます。
            </p>
          </div>
        )}

        {unbilledTimeCharges.length > 0 && (
          <div className="rounded p-3 mb-3" style={{ backgroundColor: COLORS.paper, border: `1px dashed ${COLORS.brassLight}` }}>
            <p className="text-xs font-bold mb-1.5" style={{ color: COLORS.navy }}>タイムチャージから計算して追加（任意）</p>
            <p className="text-xs mb-2" style={{ color: COLORS.slate }}>この顧客の全案件の未請求タイムチャージ：{unbilledTimeCharges.reduce((s, t) => s + t.hours, 0)}時間</p>
            <div className="flex gap-2">
              <TextInput type="number" placeholder="時間単価（円）" value={timeChargeRateDraft} onChange={(e) => setTimeChargeRateDraft(e.target.value)} className="flex-1" />
              <button onClick={addTimeChargeSectionItem} disabled={!timeChargeRateDraft} className="text-sm font-bold px-3 rounded disabled:opacity-40" style={{ backgroundColor: COLORS.navy, color: "#fff" }}>計算して追加</button>
            </div>
            <p className="text-xs mt-1.5" style={{ color: COLORS.slate }}>最初の「弁護士報酬」区分に追加されます（無ければ新規作成）。</p>
          </div>
        )}

        <div className="flex flex-col gap-4 mb-3">
          {invoiceSections.map((sec, secIdx) => (
            <div key={sec.tempId} className="rounded p-3" style={{ border: `1px solid ${COLORS.brassLight}` }}>
              <div className="flex items-center justify-between mb-2">
                <p className="text-xs font-bold" style={{ color: COLORS.navy }}>第{secIdx + 1}</p>
                {invoiceSections.length > 1 && (
                  <button onClick={() => removeSection(sec.tempId)} className="text-xs" style={{ color: COLORS.slate }}>この区分を削除</button>
                )}
              </div>
              <div className="flex flex-col sm:flex-row gap-2 mb-2">
                <select value={sec.type} onChange={(e) => updateSection(sec.tempId, { type: e.target.value })} className="text-sm p-2 rounded outline-none flex-1" style={{ border: `1px solid ${COLORS.brassLight}` }}>
                  {INVOICE_SECTION_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
                </select>
                {sec.type === "その他" && (
                  <TextInput type="text" placeholder="項目名（例：日当）" value={sec.customTypeLabel} onChange={(e) => updateSection(sec.tempId, { customTypeLabel: e.target.value })} className="flex-1" />
                )}
              </div>
              {sec.type === "弁護士報酬" && (
                <div className="flex flex-col gap-1 mb-2">
                  <label className="text-xs flex items-center gap-1.5" style={{ color: COLORS.slate }}>
                    <input type="checkbox" checked={sec.applyTax} onChange={(e) => updateSection(sec.tempId, { applyTax: e.target.checked })} />
                    消費税を加算する（10%）
                  </label>
                  <label className="text-xs flex items-center gap-1.5" style={{ color: COLORS.slate }}>
                    <input type="checkbox" checked={sec.applyWithholding} onChange={(e) => updateSection(sec.tempId, { applyWithholding: e.target.checked })} />
                    源泉所得税を控除する（100万円以下：10.21%／超過分：20.42%＋102,100円）
                  </label>
                </div>
              )}
              <div className="flex flex-col gap-1.5 mb-2">
                {sec.items.map((item) => (
                  <div key={item.tempId} className="flex items-center gap-2">
                    <TextInput type="text" placeholder="項目名" value={item.description} onChange={(e) => updateSectionItem(sec.tempId, item.tempId, { description: e.target.value })} className="flex-1" />
                    <TextInput type="number" placeholder="金額（返金等はマイナス可）" value={item.amount} onChange={(e) => updateSectionItem(sec.tempId, item.tempId, { amount: e.target.value })} style={{ width: 170 }} />
                    <button onClick={() => removeSectionItem(sec.tempId, item.tempId)} style={{ color: COLORS.slate }}><X size={13} /></button>
                  </div>
                ))}
              </div>
              <button onClick={() => addSectionItem(sec.tempId)} className="text-xs font-bold px-2.5 py-1.5 rounded" style={{ color: COLORS.navy, border: `1px solid ${COLORS.brassLight}` }}>+ 項目を追加</button>
            </div>
          ))}
        </div>

        <button onClick={addSection} className="text-xs font-bold mb-4 px-2.5 py-1.5 rounded" style={{ color: COLORS.navy, border: `1px solid ${COLORS.brassLight}` }}>
          + 区分を追加（第{invoiceSections.length + 1}）
        </button>

        <label className="text-xs block mb-3" style={{ color: COLORS.slate }}>
          備考（請求書の一番下にそのまま出力されます）
          <textarea value={invoiceForm.notes} onChange={(e) => setInvoiceForm({ ...invoiceForm, notes: e.target.value })} rows={9} className="mt-1 w-full text-sm p-2 rounded outline-none resize-none" style={{ border: `1px solid ${COLORS.brassLight}` }} />
        </label>

        {hasAnyInvoiceItem && (
          <div className="mt-1 p-3 rounded text-sm flex flex-col gap-1" style={{ backgroundColor: COLORS.paper }}>
            {previewTotals.sections.map((s, i) => (
              <div key={i} className="flex justify-between">
                <span>第{i + 1}（{s.type === "その他" ? (invoiceSections[i]?.customTypeLabel || "その他") : s.type}）小計</span>
                <span>{formatYen(s.total)}</span>
              </div>
            ))}
            <div className="flex justify-between font-bold text-base pt-1" style={{ borderTop: `1px solid ${COLORS.brassLight}` }}><span>税込ご請求額</span><span>{formatYen(previewTotals.total)}</span></div>
          </div>
        )}

        <button onClick={submitInvoice} disabled={!hasAnyInvoiceItem || creatingInvoice} className="mt-4 w-full flex items-center justify-center gap-1.5 text-sm font-bold py-2.5 rounded disabled:opacity-40" style={{ backgroundColor: COLORS.vermillion, color: "#fff" }}>
          <Download size={15} /> 請求書PDFを作成
        </button>
      </div>

      {/* 請求書履歴 */}
      <div className="rounded p-5" style={{ backgroundColor: COLORS.card, border: `1px solid ${COLORS.brassLight}` }}>
        <h3 className="text-sm font-bold mb-3 flex items-center gap-1.5" style={{ fontFamily: FONT_MINCHO, color: COLORS.navy }}><History size={15} /> 請求書履歴</h3>
        {invoiceHistory.length === 0 ? (
          <p className="text-sm" style={{ color: COLORS.slate }}>請求書はありません。</p>
        ) : (
          <div className="flex flex-col gap-2">
            {invoiceHistory.map((inv) => {
              const totals = invoiceTotal(inv.sections);
              return (
                <div key={inv.id} className="flex items-center justify-between gap-2 text-sm p-2 rounded" style={{ backgroundColor: COLORS.paper }}>
                  <div className="flex-1">
                    <p>{formatDate(inv.issueDate)}　{formatYen(totals.total)}</p>
                    {inv.dueDate && <p className="text-xs" style={{ color: COLORS.slate }}>支払期限：{formatDate(inv.dueDate)}{inv.paidAt && `　入金日：${formatDate(inv.paidAt)}`}</p>}
                  </div>
                  <button onClick={() => togglePaid(inv)} className="text-xs font-bold px-2 py-1 rounded-full flex-shrink-0" style={{ color: "#fff", backgroundColor: inv.paid ? COLORS.moss : COLORS.slate }}>
                    {inv.paid ? "入金済み" : "未入金"}
                  </button>
                  <button onClick={() => downloadPdf(inv)} className="flex-shrink-0" style={{ color: COLORS.navy }} title="PDFをダウンロード">
                    <Download size={14} />
                  </button>
                  <button onClick={() => removeInvoice(inv.id)} style={{ color: COLORS.slate }} className="flex-shrink-0" title="削除"><X size={14} /></button>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </>
  );
}
