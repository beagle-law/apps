"use client";

import { useEffect, useState } from "react";
import {
  X,
  Trash2,
  User,
  Calendar,
  Landmark,
  Phone,
  Mail,
  MapPin,
  Send,
  Receipt,
  Navigation,
  Clock,
  Eye,
  EyeOff,
  FileSpreadsheet,
  Download,
  ChevronLeft,
  ChevronRight,
  Plus,
  Save,
} from "lucide-react";
import * as XLSX from "xlsx";
import {
  COLORS,
  FONT_MINCHO,
  STAGES,
  STAGE_COLOR,
  BALL_OWNERS,
  BALL_COLOR,
  STAFF_MEMBERS,
  EXPENSE_CATEGORIES,
  POA_STATUSES,
  CONTRACT_STATUSES,
  RETAINER_STATUSES,
  INVOICE_SECTION_TYPES,
  EXPENSE_LIKE_SECTION_TYPES,
  cycleValue,
  engagementStatusColor,
} from "@/lib/constants";
import { formatDate, formatDateShort, formatDateTime, relativeDayLabel, todayStr, currentYearMonth, shiftYearMonth, formatYearMonth } from "@/lib/dates";
import type { Case, Contact, TimeCharge, Expense, CustomField, CaseClassification } from "@/lib/types";
import { emptyContact } from "@/lib/types";
import { Badge, FieldLabel, Pill, TextInput } from "@/components/ui";
import { invoiceTotal, buildTimeChargeItem, formatYen } from "@/lib/business/invoice";
import { summarizeByPerson } from "@/lib/business/timecharge";
import { downloadInvoicePdf } from "@/lib/invoice-pdf";
import * as api from "@/lib/api-client";
import InvoiceListForCase from "@/components/InvoiceListForCase";

interface Props {
  selectedCase: Case;
  onCaseUpdated: (c: Case) => void;
  onCaseDeleted: (id: string) => void;
  onOpenClient: (clientId: string) => void;
  classifications: CaseClassification[];
  onAddClassification: (name: string) => Promise<CaseClassification>;
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

function financeDraftFromCase(c: Case) {
  return {
    caseClassification: c.caseClassification,
    opposingParty: c.opposingParty,
    opposingPartyPhone: c.opposingPartyPhone,
    opposingPartyContactMethod: c.opposingPartyContactMethod,
    opposingCounselOffice: c.opposingCounselOffice,
    opposingCounselPersonName: c.opposingCounselPersonName,
    opposingCounselPhone: c.opposingCounselPhone,
    opposingCounselFax: c.opposingCounselFax,
    opposingCounselEmail: c.opposingCounselEmail,
    opposingCounselContactMethod: c.opposingCounselContactMethod,
    engagementDate: c.engagementDate,
    litigationEngagementDate: c.litigationEngagementDate,
    noticeSentDate: c.noticeSentDate,
    filingDate: c.filingDate,
    claimAmount: c.claimAmount,
    retainerFee: c.retainerFee,
    expectedFee: c.expectedFee,
    expectedFeeDate: c.expectedFeeDate,
    customFields: c.customFields,
  };
}

export default function CaseDetailPanel({ selectedCase, onCaseUpdated, onCaseDeleted, onOpenClient, classifications, onAddClassification, onError }: Props) {
  const [newUpdateText, setNewUpdateText] = useState("");
  const [claimMemoDraft, setClaimMemoDraft] = useState(selectedCase.claimMemo);
  const [financeDraft, setFinanceDraft] = useState(financeDraftFromCase(selectedCase));
  const [financeSaved, setFinanceSaved] = useState(true);
  const [claimMemoSaved, setClaimMemoSaved] = useState(true);
  const [courtInfoSaved, setCourtInfoSaved] = useState(true);
  const [newClassificationInput, setNewClassificationInput] = useState("");
  const [newHearing, setNewHearing] = useState({ date: "", content: "", docDeadline: "", nextHearingDate: "" });
  const [newExpenseForm, setNewExpenseForm] = useState({
    date: "",
    amount: "",
    category: "",
    origin: "事務所",
    destination: "",
    route: "",
    notes: "",
  });
  const [calculatingRoute, setCalculatingRoute] = useState(false);
  const [caseTimeCharges, setCaseTimeCharges] = useState<TimeCharge[]>([]);
  const [tcMonth, setTcMonth] = useState(currentYearMonth());
  const [expMonth, setExpMonth] = useState(currentYearMonth());
  const [timeChargeRateSaved, setTimeChargeRateSaved] = useState(String(selectedCase.timeChargeRate ?? ""));
  const [courtInfoDraft, setCourtInfoDraft] = useState<{ courtCaseNumber: string; courtClerk: Contact }>({
    courtCaseNumber: "",
    courtClerk: emptyContact(),
  });
  const [confirmDelete, setConfirmDelete] = useState(false);

  // 請求書作成ドラフト（v9：区分方式、v10：宛名敬称・支払期限・実費区分を追加）
  const [invoiceForm, setInvoiceForm] = useState({ issueDate: todayStr(), honorific: "", dueDate: "", notes: "" });
  const [invoiceSections, setInvoiceSections] = useState<SectionDraft[]>([newSectionDraft(false)]);
  const [unbilledTimeCharges, setUnbilledTimeCharges] = useState<TimeCharge[]>([]);
  const [unbilledExpenses, setUnbilledExpenses] = useState<Expense[]>([]);
  const [timeChargeRateDraft, setTimeChargeRateDraft] = useState("");
  const [billTimeChargeIds, setBillTimeChargeIds] = useState<string[]>([]);
  const [creatingInvoice, setCreatingInvoice] = useState(false);
  const [invoiceRefreshKey, setInvoiceRefreshKey] = useState(0);

  useEffect(() => {
    setClaimMemoDraft(selectedCase.claimMemo);
    setFinanceDraft(financeDraftFromCase(selectedCase));
    setFinanceSaved(true);
    setClaimMemoSaved(true);
    setCourtInfoSaved(true);
    setTimeChargeRateSaved(String(selectedCase.timeChargeRate ?? ""));
    setCourtInfoDraft({
      courtCaseNumber: selectedCase.courtCaseNumber || "",
      courtClerk: { ...emptyContact(), ...selectedCase.courtClerk },
    });
    setConfirmDelete(false);
    setInvoiceForm({ issueDate: todayStr(), honorific: "", dueDate: "", notes: "" });
    setBillTimeChargeIds([]);
    setTcMonth(currentYearMonth());
    setExpMonth(currentYearMonth());
    api.fetchUnbilledTimeCharges(selectedCase.id).then(setUnbilledTimeCharges).catch(() => setUnbilledTimeCharges([]));
    api.fetchCaseTimeCharges(selectedCase.id).then(setCaseTimeCharges).catch(() => setCaseTimeCharges([]));

    // 依頼者（顧客）が法人なら源泉徴収デフォルトON、個人・未連携ならデフォルトOFF（要件v6 3.5）
    if (selectedCase.clientId) {
      api
        .fetchClients()
        .then((clients) => {
          const c = clients.find((cl) => cl.id === selectedCase.clientId);
          setInvoiceSections([newSectionDraft(c?.clientType === "法人")]);
        })
        .catch(() => setInvoiceSections([newSectionDraft(false)]));
    } else {
      setInvoiceSections([newSectionDraft(false)]);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedCase.id]);

  // 実費系区分がある場合、発行月の未反映実費を取得（v10 3.2・3.3）
  useEffect(() => {
    const hasExpenseLike = invoiceSections.some((s) => EXPENSE_LIKE_SECTION_TYPES.includes(s.type));
    if (!hasExpenseLike || !invoiceForm.issueDate) {
      setUnbilledExpenses([]);
      return;
    }
    api
      .fetchUnbilledExpenses(selectedCase.id, invoiceForm.issueDate.slice(0, 7))
      .then(setUnbilledExpenses)
      .catch(() => setUnbilledExpenses([]));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedCase.id, invoiceForm.issueDate, invoiceSections.map((s) => s.type).join(",")]);

  const run = async (fn: () => Promise<Case>) => {
    try {
      const updated = await fn();
      onCaseUpdated(updated);
    } catch (e) {
      onError(e instanceof Error ? e.message : "保存に失敗しました");
    }
  };

  const changeStage = (stage: string) => {
    if (stage === selectedCase.stage) return;
    run(() => api.patchCase(selectedCase.id, { stage, autoNote: `ステータスを「${stage}」に変更` }));
  };
  const changeBallOwner = (owner: string) => {
    if (owner === selectedCase.ballOwner) return;
    run(() => api.patchCase(selectedCase.id, { ballOwner: owner, autoNote: `ボール（次のアクション）を「${owner}」に更新` }));
  };
  const changeBallAssignee = (name: string) => {
    const next = selectedCase.ballAssignee === name ? "" : name;
    run(() => api.patchCase(selectedCase.id, { ballAssignee: next }));
  };
  const toggleHidden = () => {
    run(() => api.patchCase(selectedCase.id, { hidden: !selectedCase.hidden }));
  };

  const cycleEngagement = (field: "poaStatus" | "contractStatus" | "retainerStatus", list: readonly string[]) => {
    const nextVal = cycleValue(list, selectedCase[field]);
    run(() => api.patchCase(selectedCase.id, { [field]: nextVal } as Partial<Case>));
  };

  // v10 4.2：案件情報／主張予定メモ／訴訟関係者情報の3カードは、入力中は自動保存せず
  // 右上の「保存」ボタン押下時にまとめて保存する方式に変更。
  const saveCourtInfo = () => {
    api
      .patchCase(selectedCase.id, {
        courtCaseNumber: courtInfoDraft.courtCaseNumber,
        courtClerk: courtInfoDraft.courtClerk,
      })
      .then((updated) => {
        onCaseUpdated(updated);
        setCourtInfoSaved(true);
      })
      .catch((e) => onError(e instanceof Error ? e.message : "保存に失敗しました"));
  };

  const saveClaimMemo = () => {
    api
      .patchClaimMemo(selectedCase.id, claimMemoDraft)
      .then((updated) => {
        onCaseUpdated(updated);
        setClaimMemoSaved(true);
      })
      .catch((e) => onError(e instanceof Error ? e.message : "保存に失敗しました"));
  };

  const saveFinance = () => {
    api
      .patchFinance(selectedCase.id, financeDraft)
      .then((updated) => {
        onCaseUpdated(updated);
        setFinanceSaved(true);
      })
      .catch((e) => onError(e instanceof Error ? e.message : "保存に失敗しました"));
  };

  const saveTimeChargeRate = () => {
    const rate = timeChargeRateSaved.trim() === "" ? null : Math.round(Number(timeChargeRateSaved));
    run(() => api.patchCase(selectedCase.id, { timeChargeRate: rate }));
  };

  const addClassificationInline = async () => {
    const name = newClassificationInput.trim();
    if (!name) return;
    try {
      await onAddClassification(name);
      setFinanceDraft((prev) => ({ ...prev, caseClassification: name }));
      setFinanceSaved(false);
      setNewClassificationInput("");
    } catch (e) {
      onError(e instanceof Error ? e.message : "分類の追加に失敗しました");
    }
  };

  const updateCustomField = (idx: number, updates: Partial<CustomField>) => {
    setFinanceDraft((prev) => ({
      ...prev,
      customFields: prev.customFields.map((f, i) => (i === idx ? { ...f, ...updates } : f)),
    }));
    setFinanceSaved(false);
  };
  const addCustomField = () => {
    setFinanceDraft((prev) => ({ ...prev, customFields: [...prev.customFields, { label: "", value: "" }] }));
    setFinanceSaved(false);
  };
  const removeCustomField = (idx: number) => {
    setFinanceDraft((prev) => ({ ...prev, customFields: prev.customFields.filter((_, i) => i !== idx) }));
    setFinanceSaved(false);
  };

  const addUpdateEntry = () => {
    if (!newUpdateText.trim()) return;
    run(() => api.addUpdate(selectedCase.id, newUpdateText.trim()));
    setNewUpdateText("");
  };
  const removeUpdateEntry = (updateId: string) => run(() => api.deleteUpdate(selectedCase.id, updateId));

  const addHearingEntry = () => {
    if (!newHearing.date || !newHearing.content.trim()) return;
    run(() => api.addHearing(selectedCase.id, newHearing));
    setNewHearing({ date: "", content: "", docDeadline: "", nextHearingDate: "" });
  };
  const removeHearing = (hearingId: string) => run(() => api.deleteHearing(selectedCase.id, hearingId));

  const addExpenseEntry = () => {
    if (!newExpenseForm.date || !newExpenseForm.category || !newExpenseForm.amount) return;
    run(() =>
      api.addExpense(selectedCase.id, {
        date: newExpenseForm.date,
        amount: Number(newExpenseForm.amount),
        category: newExpenseForm.category,
        origin: newExpenseForm.origin,
        destination: newExpenseForm.destination,
        route: newExpenseForm.route,
        notes: newExpenseForm.notes,
      })
    );
    setNewExpenseForm({ date: "", amount: "", category: "", origin: "事務所", destination: "", route: "", notes: "" });
  };
  const removeExpense = (expenseId: string) => run(() => api.deleteExpense(selectedCase.id, expenseId));

  const calculateRoute = async () => {
    if (!newExpenseForm.origin.trim() || !newExpenseForm.destination.trim()) return;
    setCalculatingRoute(true);
    try {
      const res = await api.aiCalculateRoute(newExpenseForm.origin, newExpenseForm.destination);
      setNewExpenseForm((prev) => ({ ...prev, route: res.route, amount: prev.amount || String(res.fare) }));
    } catch (e) {
      onError(e instanceof Error ? e.message : "経路の自動計算に失敗しました");
    } finally {
      setCalculatingRoute(false);
    }
  };

  const exportExpensesToExcel = () => {
    const rows: (string | number)[][] = [
      ["実費一覧"],
      [`案件No.${selectedCase.caseNumber}`, selectedCase.title, `依頼者：${selectedCase.clientName}`],
      [],
      ["日付", "内訳", "金額", "経路", "備考"],
      ...selectedCase.expenses.map((e) => [formatDateShort(e.date), e.category, e.amount, e.route, e.notes]),
      [],
      ["合計", "", selectedCase.expenses.reduce((sum, e) => sum + e.amount, 0), "", ""],
    ];
    const ws = XLSX.utils.aoa_to_sheet(rows);
    ws["!cols"] = [{ wch: 16 }, { wch: 14 }, { wch: 12 }, { wch: 44 }, { wch: 28 }];
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "実費一覧");
    XLSX.writeFile(wb, `実費一覧_${selectedCase.caseNumber}.xlsx`);
  };

  const doDeleteCase = async () => {
    try {
      await api.deleteCaseApi(selectedCase.id);
      onCaseDeleted(selectedCase.id);
    } catch (e) {
      onError(e instanceof Error ? e.message : "削除に失敗しました");
    }
  };

  // ── 請求書作成（v9：区分方式） ──────────────────────
  const addSection = () => setInvoiceSections((prev) => [...prev, newSectionDraft(true)]);
  const removeSection = (tempId: string) =>
    setInvoiceSections((prev) => (prev.length <= 1 ? prev : prev.filter((s) => s.tempId !== tempId)));
  const updateSection = (tempId: string, updates: Partial<SectionDraft>) =>
    setInvoiceSections((prev) => prev.map((s) => (s.tempId === tempId ? { ...s, ...updates } : s)));
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
        caseId: selectedCase.id,
        issueDate: invoiceForm.issueDate,
        honorific: invoiceForm.honorific || undefined,
        dueDate: invoiceForm.dueDate || undefined,
        sections: cleanedSections,
        notes: invoiceForm.notes,
        billTimeChargeIds,
        billExpenseIds: unbilledExpenses.map((e) => e.id),
      });
      await downloadInvoicePdf(inv);
      const wasWithholdingDefault = invoiceSections[0]?.applyWithholding ?? false;
      setInvoiceSections([newSectionDraft(wasWithholdingDefault)]);
      setBillTimeChargeIds([]);
      setInvoiceForm({ issueDate: todayStr(), honorific: "", dueDate: "", notes: "" });
      const remaining = await api.fetchUnbilledTimeCharges(selectedCase.id);
      setUnbilledTimeCharges(remaining);
      setUnbilledExpenses([]);
      setInvoiceRefreshKey((k) => k + 1);
    } catch (e) {
      onError(e instanceof Error ? e.message : "請求書の作成に失敗しました");
    } finally {
      setCreatingInvoice(false);
    }
  };

  return (
    <div className="max-w-2xl lg:max-w-none mx-auto grid grid-cols-1 lg:grid-cols-3 gap-5 items-start">
    <div className="flex flex-col gap-5">
      {/* Header */}
      <div className="rounded p-5" style={{ backgroundColor: COLORS.card, border: `1px solid ${COLORS.brassLight}` }}>
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-xs flex items-center gap-2" style={{ color: COLORS.slate }}>
              案件No. {selectedCase.caseNumber}
              {selectedCase.isPrivate && (
                <Badge color={COLORS.brass}>個人メモ</Badge>
              )}
            </p>
            <h2 className="text-xl mt-1" style={{ fontFamily: FONT_MINCHO, letterSpacing: "0.02em" }}>
              {selectedCase.title}
            </h2>
          </div>
          <div className="flex items-center gap-1 flex-shrink-0">
            <button onClick={toggleHidden} className="p-1.5 rounded hover:opacity-70" style={{ color: COLORS.slate }} title={selectedCase.hidden ? "一覧に表示する" : "一覧から非表示にする"}>
              {selectedCase.hidden ? <Eye size={16} /> : <EyeOff size={16} />}
            </button>
            {confirmDelete ? (
              <div className="flex items-center gap-1 text-xs">
                <button onClick={doDeleteCase} className="underline font-bold" style={{ color: COLORS.vermillion }}>削除確定</button>
                <button onClick={() => setConfirmDelete(false)} className="underline" style={{ color: COLORS.slate }}>取消</button>
              </div>
            ) : (
              <button onClick={() => setConfirmDelete(true)} className="p-1.5 rounded hover:opacity-70" style={{ color: COLORS.slate }} title="案件を削除">
                <Trash2 size={16} />
              </button>
            )}
          </div>
        </div>

        {!selectedCase.isPrivate && (
          <div className="flex flex-wrap gap-4 mt-4 text-sm" style={{ color: COLORS.slate }}>
            <span className="flex items-center gap-1.5">
              <User size={14} /> 依頼者：
              {selectedCase.clientId ? (
                <button onClick={() => onOpenClient(selectedCase.clientId)} className="underline hover:opacity-70" style={{ color: COLORS.navy }}>
                  {selectedCase.clientName}
                </button>
              ) : (
                selectedCase.clientName
              )}
            </span>
            {selectedCase.deadline && (
              <span className="flex items-center gap-1.5"><Calendar size={14} /> 期限：{formatDate(selectedCase.deadline)}</span>
            )}
          </div>
        )}

        <div className="mt-4">
          <FieldLabel>ステータス</FieldLabel>
          <div className="flex gap-1.5 flex-wrap">
            {STAGES.map((s) => (
              <Pill key={s} active={selectedCase.stage === s} color={STAGE_COLOR[s]} onClick={() => changeStage(s)}>{s}</Pill>
            ))}
          </div>
        </div>

        <div className="mt-5 p-3 rounded" style={{ backgroundColor: COLORS.paper, border: `1px solid ${BALL_COLOR[selectedCase.ballOwner]}` }}>
          <p className="text-xs mb-1.5 font-bold" style={{ color: COLORS.ink }}>ボール（次のアクションを持っているのは誰か）</p>
          <div className="flex gap-1.5 flex-wrap">
            {BALL_OWNERS.map((o) => (
              <Pill key={o} active={selectedCase.ballOwner === o} color={BALL_COLOR[o]} onClick={() => changeBallOwner(o)}>{o}</Pill>
            ))}
          </div>
          {selectedCase.ballOwner === "事務所" && (
            <div className="flex gap-1.5 flex-wrap mt-2">
              {STAFF_MEMBERS.map((m) => (
                <Pill key={m} active={selectedCase.ballAssignee === m} color={COLORS.vermillion} onClick={() => changeBallAssignee(m)}>{m}</Pill>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* 経過記録 */}
      <div className="rounded p-5" style={{ backgroundColor: COLORS.card, border: `1px solid ${COLORS.brassLight}` }}>
        <h3 className="text-sm font-bold mb-4" style={{ fontFamily: FONT_MINCHO, color: COLORS.navy, letterSpacing: "0.05em" }}>経過記録</h3>
        <div className="flex flex-col gap-2 mb-5">
          <textarea value={newUpdateText} onChange={(e) => setNewUpdateText(e.target.value)} placeholder="進捗・対応内容を記録..." rows={3} className="text-sm p-2 rounded outline-none resize-none" style={{ border: `1px solid ${COLORS.brassLight}` }} />
          <button onClick={addUpdateEntry} disabled={!newUpdateText.trim()} className="self-end flex items-center gap-1.5 text-sm font-bold px-3 py-1.5 rounded transition disabled:opacity-40" style={{ backgroundColor: COLORS.navy, color: "#fff" }}>
            <Send size={13} /> 記録を追加
          </button>
        </div>
        {selectedCase.updates.length === 0 ? (
          <p className="text-sm py-6 text-center" style={{ color: COLORS.slate }}>まだ記録がありません。</p>
        ) : (
          <div className="flex flex-col gap-4 pl-4" style={{ borderLeft: `2px solid ${COLORS.brassLight}` }}>
            {selectedCase.updates.map((u) => (
              <div key={u.id} className="relative group">
                <div className="absolute rounded-full" style={{ width: 9, height: 9, backgroundColor: u.auto ? COLORS.brassLight : COLORS.brass, left: -21, top: 5 }} />
                <div className="flex items-start justify-between gap-2">
                  <p className="text-xs" style={{ color: COLORS.slate }}>{formatDateTime(u.timestamp)}　<span className="font-bold">{u.author}</span></p>
                  <button onClick={() => removeUpdateEntry(u.id)} className="opacity-0 group-hover:opacity-100 transition flex-shrink-0" style={{ color: COLORS.slate }}><X size={12} /></button>
                </div>
                <p className="text-sm mt-0.5 whitespace-pre-wrap" style={u.auto ? { fontStyle: "italic", color: COLORS.slate } : {}}>{u.note}</p>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* 主張予定メモ */}
      <div className="rounded p-5" style={{ backgroundColor: COLORS.card, border: `1px solid ${COLORS.brassLight}` }}>
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-bold" style={{ fontFamily: FONT_MINCHO, color: COLORS.navy, letterSpacing: "0.05em" }}>主張予定メモ</h3>
          <button onClick={saveClaimMemo} disabled={claimMemoSaved} className="flex items-center gap-1 text-xs font-bold px-2.5 py-1 rounded disabled:opacity-40" style={{ backgroundColor: COLORS.navy, color: "#fff" }}><Save size={12} /> 保存</button>
        </div>
        <textarea
          value={claimMemoDraft}
          onChange={(e) => {
            setClaimMemoDraft(e.target.value);
            setClaimMemoSaved(false);
          }}
          rows={4}
          placeholder="主張予定のメモを自由に記入..."
          className="w-full text-sm p-2 rounded outline-none resize-none"
          style={{ border: `1px solid ${COLORS.brassLight}` }}
        />
        <p className="text-xs mt-2" style={{ color: COLORS.slate }}>「保存」ボタンでまとめて保存されます（履歴は残りません）</p>
      </div>

      {/* 受任関連チェック */}
      <div className="rounded p-5" style={{ backgroundColor: COLORS.card, border: `1px solid ${COLORS.brassLight}` }}>
        <h3 className="text-sm font-bold mb-3" style={{ fontFamily: FONT_MINCHO, color: COLORS.navy, letterSpacing: "0.05em" }}>受任関連チェック</h3>
        <div className="flex flex-col gap-3">
          <div className="flex items-center justify-between">
            <span className="text-sm">委任状</span>
            <button onClick={() => cycleEngagement("poaStatus", POA_STATUSES)} className="text-xs font-bold px-3 py-1 rounded-full" style={{ color: "#fff", backgroundColor: engagementStatusColor(selectedCase.poaStatus) }}>{selectedCase.poaStatus}</button>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-sm">委任契約書</span>
            <button onClick={() => cycleEngagement("contractStatus", CONTRACT_STATUSES)} className="text-xs font-bold px-3 py-1 rounded-full" style={{ color: "#fff", backgroundColor: engagementStatusColor(selectedCase.contractStatus) }}>{selectedCase.contractStatus}</button>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-sm">預り金</span>
            <button onClick={() => cycleEngagement("retainerStatus", RETAINER_STATUSES)} className="text-xs font-bold px-3 py-1 rounded-full" style={{ color: "#fff", backgroundColor: engagementStatusColor(selectedCase.retainerStatus) }}>{selectedCase.retainerStatus}</button>
          </div>
        </div>
        <p className="text-xs mt-3" style={{ color: COLORS.slate }}>クリックで状態を切り替えます。</p>
      </div>
    </div>

    <div className="flex flex-col gap-5">
      {/* タイムチャージ集計 */}
      {caseTimeCharges.length > 0 && (() => {
        const monthCharges = caseTimeCharges.filter((t) => t.date.startsWith(tcMonth));
        const monthHours = monthCharges.reduce((s, t) => s + t.hours, 0);
        const rateNum = Number(timeChargeRateSaved) || 0;
        return (
          <div className="rounded p-5" style={{ backgroundColor: COLORS.card, border: `1px solid ${COLORS.brassLight}` }}>
            <h3 className="text-sm font-bold mb-3 flex items-center gap-1.5" style={{ fontFamily: FONT_MINCHO, color: COLORS.navy, letterSpacing: "0.05em" }}>
              <Clock size={15} /> タイムチャージ集計
            </h3>
            <div className="flex items-center justify-between mb-3">
              <button onClick={() => setTcMonth((m) => shiftYearMonth(m, -1))} style={{ color: COLORS.slate }}><ChevronLeft size={16} /></button>
              <span className="text-sm font-bold">{formatYearMonth(tcMonth)}</span>
              <button onClick={() => setTcMonth((m) => shiftYearMonth(m, 1))} style={{ color: COLORS.slate }}><ChevronRight size={16} /></button>
            </div>
            <p className="text-sm font-bold mb-1">
              当月合計：{monthHours}時間
              <span className="font-normal text-xs" style={{ color: COLORS.slate }}>（{monthCharges.length}件）</span>
            </p>
            <p className="text-xs mb-3" style={{ color: COLORS.slate }}>
              全期間合計：{caseTimeCharges.reduce((s, t) => s + t.hours, 0)}時間（{caseTimeCharges.length}件）
            </p>
            <label className="text-xs flex items-center gap-2 mb-3" style={{ color: COLORS.slate }}>
              時間単価（円）
              <TextInput type="number" value={timeChargeRateSaved} onChange={(e) => setTimeChargeRateSaved(e.target.value)} onBlur={saveTimeChargeRate} style={{ width: 120 }} />
              {rateNum > 0 && <span style={{ color: COLORS.ink }}>稼働報酬額：{formatYen(Math.round(monthHours * rateNum))}</span>}
            </label>
            <div className="flex flex-col gap-1.5">
              {summarizeByPerson(monthCharges).map((p) => (
                <div key={p.name} className="flex items-center justify-between text-sm p-2 rounded" style={{ backgroundColor: COLORS.paper }}>
                  <span>{p.name}</span>
                  <span style={{ color: COLORS.slate }}>{p.hours}時間　<span className="text-xs">（{p.count}件）</span></span>
                </div>
              ))}
            </div>
          </div>
        );
      })()}

      {/* 実費 */}
      <div className="rounded p-5" style={{ backgroundColor: COLORS.card, border: `1px solid ${COLORS.brassLight}` }}>
        <h3 className="text-sm font-bold mb-3 flex items-center gap-1.5" style={{ fontFamily: FONT_MINCHO, color: COLORS.navy, letterSpacing: "0.05em" }}><Receipt size={15} /> 実費</h3>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 mb-2">
          <TextInput type="date" value={newExpenseForm.date} onChange={(e) => setNewExpenseForm({ ...newExpenseForm, date: e.target.value })} />
          <input list="expense-categories" type="text" placeholder="内訳" value={newExpenseForm.category} onChange={(e) => setNewExpenseForm({ ...newExpenseForm, category: e.target.value })} className="text-sm p-2 rounded outline-none" style={{ border: `1px solid ${COLORS.brassLight}` }} />
          <datalist id="expense-categories">{EXPENSE_CATEGORIES.map((c) => <option key={c} value={c} />)}</datalist>
          <TextInput type="number" placeholder="金額" value={newExpenseForm.amount} onChange={(e) => setNewExpenseForm({ ...newExpenseForm, amount: e.target.value })} />
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mb-2">
          <TextInput type="text" placeholder="出発地" value={newExpenseForm.origin} onChange={(e) => setNewExpenseForm({ ...newExpenseForm, origin: e.target.value })} />
          <TextInput type="text" placeholder="到着地" value={newExpenseForm.destination} onChange={(e) => setNewExpenseForm({ ...newExpenseForm, destination: e.target.value })} />
        </div>
        <div className="flex gap-2 mb-2">
          <button onClick={calculateRoute} disabled={calculatingRoute || !newExpenseForm.origin.trim() || !newExpenseForm.destination.trim()} className="flex items-center gap-1.5 text-xs font-bold px-3 py-2 rounded disabled:opacity-40 flex-shrink-0" style={{ backgroundColor: COLORS.brass, color: "#fff" }}>
            <Navigation size={13} /> 経路を自動計算
          </button>
          <TextInput type="text" placeholder="経路" value={newExpenseForm.route} onChange={(e) => setNewExpenseForm({ ...newExpenseForm, route: e.target.value })} className="flex-1" />
        </div>
        <div className="flex gap-2 mb-3">
          <TextInput type="text" placeholder="備考" value={newExpenseForm.notes} onChange={(e) => setNewExpenseForm({ ...newExpenseForm, notes: e.target.value })} className="flex-1" />
          <button onClick={addExpenseEntry} disabled={!newExpenseForm.date || !newExpenseForm.category || !newExpenseForm.amount} className="text-sm font-bold px-3 rounded disabled:opacity-40" style={{ backgroundColor: COLORS.navy, color: "#fff" }}>追加</button>
        </div>

        <div className="flex items-center justify-between mb-2">
          <button onClick={() => setExpMonth((m) => shiftYearMonth(m, -1))} style={{ color: COLORS.slate }}><ChevronLeft size={16} /></button>
          <span className="text-sm font-bold">{formatYearMonth(expMonth)}</span>
          <button onClick={() => setExpMonth((m) => shiftYearMonth(m, 1))} style={{ color: COLORS.slate }}><ChevronRight size={16} /></button>
        </div>
        {(() => {
          const monthExpenses = selectedCase.expenses.filter((e) => e.date.startsWith(expMonth));
          if (monthExpenses.length === 0) {
            return <p className="text-sm py-2" style={{ color: COLORS.slate }}>この月の実費はありません。</p>;
          }
          return (
            <>
              <div className="flex flex-col gap-2 mb-3">
                {monthExpenses.map((e) => (
                  <div key={e.id} className="flex items-center justify-between gap-2 text-sm p-2 rounded" style={{ backgroundColor: COLORS.paper }}>
                    <div className="flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-xs" style={{ color: COLORS.slate }}>{formatDateShort(e.date)}</span>
                        <Badge color={COLORS.brass}>{e.category}</Badge>
                        <span className="font-bold">¥{e.amount.toLocaleString("ja-JP")}</span>
                        <Badge color={e.billedInInvoiceId ? COLORS.moss : COLORS.slate}>{e.billedInInvoiceId ? "請求書反映済" : "請求書未作成"}</Badge>
                      </div>
                      {e.route && <p className="text-xs mt-1" style={{ color: COLORS.slate }}>{e.route}</p>}
                      {e.notes && <p className="text-xs mt-0.5" style={{ color: COLORS.slate }}>{e.notes}</p>}
                    </div>
                    <button onClick={() => removeExpense(e.id)} style={{ color: COLORS.slate }}><X size={14} /></button>
                  </div>
                ))}
              </div>
              <div className="flex items-center justify-between">
                <p className="text-sm font-bold">当月合計：¥{monthExpenses.reduce((s, e) => s + e.amount, 0).toLocaleString("ja-JP")}</p>
                <button onClick={exportExpensesToExcel} className="flex items-center gap-1.5 text-xs font-bold px-3 py-1.5 rounded" style={{ backgroundColor: COLORS.moss, color: "#fff" }}>
                  <FileSpreadsheet size={13} /> Excelで出力
                </button>
              </div>
            </>
          );
        })()}
      </div>

      {/* 請求書作成 */}
      <div className="rounded p-5" style={{ backgroundColor: COLORS.card, border: `1px solid ${COLORS.brassLight}` }}>
        <h3 className="text-sm font-bold mb-3 flex items-center gap-1.5" style={{ fontFamily: FONT_MINCHO, color: COLORS.navy, letterSpacing: "0.05em" }}><Download size={15} /> 請求書作成</h3>

        <div className="flex flex-wrap gap-3 mb-3">
          <label className="text-xs" style={{ color: COLORS.slate }}>
            発行日
            <TextInput type="date" value={invoiceForm.issueDate} onChange={(e) => setInvoiceForm({ ...invoiceForm, issueDate: e.target.value })} className="mt-1 w-full sm:w-48" />
          </label>
          <label className="text-xs" style={{ color: COLORS.slate }}>
            支払期限（空欄で発行月末）
            <TextInput type="date" value={invoiceForm.dueDate} onChange={(e) => setInvoiceForm({ ...invoiceForm, dueDate: e.target.value })} className="mt-1 w-full sm:w-48" />
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

        {unbilledExpenses.length > 0 && (
          <div className="rounded p-3 mb-3" style={{ backgroundColor: COLORS.paper, border: `1px dashed ${COLORS.brassLight}` }}>
            <p className="text-xs font-bold mb-1.5" style={{ color: COLORS.navy }}>実費（別紙自動反映）</p>
            <p className="text-xs" style={{ color: COLORS.slate }}>
              発行月と同月の未反映の実費 {unbilledExpenses.length}件（合計¥{unbilledExpenses.reduce((s, e) => s + e.amount, 0).toLocaleString("ja-JP")}）が、
              この請求書の作成と同時に「反映済み」となり、別紙実費一覧に自動記載されます。
            </p>
          </div>
        )}

        {unbilledTimeCharges.length > 0 && (
          <div className="rounded p-3 mb-3" style={{ backgroundColor: COLORS.paper, border: `1px dashed ${COLORS.brassLight}` }}>
            <p className="text-xs font-bold mb-1.5" style={{ color: COLORS.navy }}>タイムチャージから計算して追加（任意）</p>
            <p className="text-xs mb-2" style={{ color: COLORS.slate }}>この案件の未請求タイムチャージ：{unbilledTimeCharges.reduce((s, t) => s + t.hours, 0)}時間</p>
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
          備考
          <textarea value={invoiceForm.notes} onChange={(e) => setInvoiceForm({ ...invoiceForm, notes: e.target.value })} rows={2} className="mt-1 w-full text-sm p-2 rounded outline-none resize-none" style={{ border: `1px solid ${COLORS.brassLight}` }} />
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

        <InvoiceListForCase caseId={selectedCase.id} refreshKey={invoiceRefreshKey} onError={onError} />
      </div>
    </div>

    <div className="flex flex-col gap-5">
      {/* 案件情報 */}
      <div className="rounded p-5" style={{ backgroundColor: COLORS.card, border: `1px solid ${COLORS.brassLight}` }}>
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-bold" style={{ fontFamily: FONT_MINCHO, color: COLORS.navy, letterSpacing: "0.05em" }}>案件情報</h3>
          <button onClick={saveFinance} disabled={financeSaved} className="flex items-center gap-1 text-xs font-bold px-2.5 py-1 rounded disabled:opacity-40" style={{ backgroundColor: COLORS.navy, color: "#fff" }}><Save size={12} /> 保存</button>
        </div>

        <label className="flex items-center gap-2 text-xs mb-4" style={{ color: COLORS.slate }}>
          <input
            type="checkbox"
            checked={!!selectedCase.isTimeChargeCase}
            onChange={(e) => run(() => api.patchCase(selectedCase.id, { isTimeChargeCase: e.target.checked }))}
          />
          タイムチャージ案件（タイムチャージ入力の案件選択に表示する）
        </label>

        <FieldLabel>相手方（会社名・屋号・氏名）</FieldLabel>
        <TextInput type="text" value={financeDraft.opposingParty} onChange={(e) => { setFinanceDraft({ ...financeDraft, opposingParty: e.target.value }); setFinanceSaved(false); }} className="w-full mb-3" />

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-3">
          <label className="text-xs" style={{ color: COLORS.slate }}>
            相手方電話番号
            <TextInput type="text" value={financeDraft.opposingPartyPhone} onChange={(e) => { setFinanceDraft({ ...financeDraft, opposingPartyPhone: e.target.value }); setFinanceSaved(false); }} className="mt-1 w-full" />
          </label>
          <label className="text-xs" style={{ color: COLORS.slate }}>
            相手方連絡方法
            <TextInput type="text" placeholder="例：メール／電話" value={financeDraft.opposingPartyContactMethod} onChange={(e) => { setFinanceDraft({ ...financeDraft, opposingPartyContactMethod: e.target.value }); setFinanceSaved(false); }} className="mt-1 w-full" />
          </label>
        </div>

        <p className="text-xs font-bold mb-2" style={{ color: COLORS.slate }}>相手方代理人</p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-3">
          <label className="text-xs" style={{ color: COLORS.slate }}>
            事務所
            <TextInput type="text" value={financeDraft.opposingCounselOffice} onChange={(e) => { setFinanceDraft({ ...financeDraft, opposingCounselOffice: e.target.value }); setFinanceSaved(false); }} className="mt-1 w-full" />
          </label>
          <label className="text-xs" style={{ color: COLORS.slate }}>
            氏名
            <TextInput type="text" value={financeDraft.opposingCounselPersonName} onChange={(e) => { setFinanceDraft({ ...financeDraft, opposingCounselPersonName: e.target.value }); setFinanceSaved(false); }} className="mt-1 w-full" />
          </label>
          <label className="text-xs" style={{ color: COLORS.slate }}>
            電話番号
            <TextInput type="text" value={financeDraft.opposingCounselPhone} onChange={(e) => { setFinanceDraft({ ...financeDraft, opposingCounselPhone: e.target.value }); setFinanceSaved(false); }} className="mt-1 w-full" />
          </label>
          <label className="text-xs" style={{ color: COLORS.slate }}>
            連絡方法
            <TextInput type="text" value={financeDraft.opposingCounselContactMethod} onChange={(e) => { setFinanceDraft({ ...financeDraft, opposingCounselContactMethod: e.target.value }); setFinanceSaved(false); }} className="mt-1 w-full" />
          </label>
          <label className="text-xs" style={{ color: COLORS.slate }}>
            FAX
            <TextInput type="text" value={financeDraft.opposingCounselFax} onChange={(e) => { setFinanceDraft({ ...financeDraft, opposingCounselFax: e.target.value }); setFinanceSaved(false); }} className="mt-1 w-full" />
          </label>
          <label className="text-xs" style={{ color: COLORS.slate }}>
            メールアドレス
            <TextInput type="text" value={financeDraft.opposingCounselEmail} onChange={(e) => { setFinanceDraft({ ...financeDraft, opposingCounselEmail: e.target.value }); setFinanceSaved(false); }} className="mt-1 w-full" />
          </label>
        </div>

        <div className="grid grid-cols-2 gap-3 mb-3">
          <label className="text-xs" style={{ color: COLORS.slate }}>
            受任日
            <TextInput type="date" value={financeDraft.engagementDate} onChange={(e) => { setFinanceDraft({ ...financeDraft, engagementDate: e.target.value }); setFinanceSaved(false); }} className="mt-1 w-full" />
          </label>
          <label className="text-xs" style={{ color: COLORS.slate }}>
            訴訟受任日
            <TextInput type="date" value={financeDraft.litigationEngagementDate} onChange={(e) => { setFinanceDraft({ ...financeDraft, litigationEngagementDate: e.target.value }); setFinanceSaved(false); }} className="mt-1 w-full" />
          </label>
          <label className="text-xs" style={{ color: COLORS.slate }}>
            通知書発送日
            <TextInput type="date" value={financeDraft.noticeSentDate} onChange={(e) => { setFinanceDraft({ ...financeDraft, noticeSentDate: e.target.value }); setFinanceSaved(false); }} className="mt-1 w-full" />
          </label>
          <label className="text-xs" style={{ color: COLORS.slate }}>
            提訴日
            <TextInput type="date" value={financeDraft.filingDate} onChange={(e) => { setFinanceDraft({ ...financeDraft, filingDate: e.target.value }); setFinanceSaved(false); }} className="mt-1 w-full" />
          </label>
        </div>

        <div className="grid grid-cols-2 gap-3 mb-3">
          <label className="text-xs" style={{ color: COLORS.slate }}>
            請求額(税込)
            <TextInput type="number" value={financeDraft.claimAmount} onChange={(e) => { setFinanceDraft({ ...financeDraft, claimAmount: e.target.value === "" ? "" : Number(e.target.value) }); setFinanceSaved(false); }} className="mt-1 w-full" />
          </label>
          <label className="text-xs" style={{ color: COLORS.slate }}>
            着手金(税込)
            <TextInput type="number" value={financeDraft.retainerFee} onChange={(e) => { setFinanceDraft({ ...financeDraft, retainerFee: e.target.value === "" ? "" : Number(e.target.value) }); setFinanceSaved(false); }} className="mt-1 w-full" />
          </label>
          <label className="text-xs" style={{ color: COLORS.slate }}>
            見込報酬額(税込)
            <TextInput type="number" value={financeDraft.expectedFee} onChange={(e) => { setFinanceDraft({ ...financeDraft, expectedFee: e.target.value === "" ? "" : Number(e.target.value) }); setFinanceSaved(false); }} className="mt-1 w-full" />
          </label>
          <label className="text-xs" style={{ color: COLORS.slate }}>
            報酬見込日
            <TextInput type="date" value={financeDraft.expectedFeeDate} onChange={(e) => { setFinanceDraft({ ...financeDraft, expectedFeeDate: e.target.value }); setFinanceSaved(false); }} className="mt-1 w-full" />
          </label>
        </div>

        <FieldLabel>案件分類</FieldLabel>
        <input
          list="case-classifications"
          type="text"
          value={financeDraft.caseClassification}
          onChange={(e) => { setFinanceDraft({ ...financeDraft, caseClassification: e.target.value }); setFinanceSaved(false); }}
          className="text-sm p-2 rounded outline-none w-full mb-2"
          style={{ border: `1px solid ${COLORS.brassLight}` }}
        />
        <datalist id="case-classifications">
          {classifications.map((c) => <option key={c.id} value={c.name} />)}
        </datalist>
        <div className="flex gap-2 mb-4">
          <TextInput type="text" placeholder="新しい分類名" value={newClassificationInput} onChange={(e) => setNewClassificationInput(e.target.value)} className="flex-1" />
          <button onClick={addClassificationInline} disabled={!newClassificationInput.trim()} className="flex items-center gap-1 text-xs font-bold px-2.5 rounded disabled:opacity-40" style={{ border: `1px solid ${COLORS.brassLight}`, color: COLORS.navy }}><Plus size={12} /> 分類を追加</button>
        </div>

        <FieldLabel>その他の項目</FieldLabel>
        <div className="flex flex-col gap-2 mb-2">
          {financeDraft.customFields.map((f, idx) => (
            <div key={idx} className="flex items-center gap-2">
              <TextInput type="text" placeholder="項目名" value={f.label} onChange={(e) => updateCustomField(idx, { label: e.target.value })} style={{ width: 120 }} />
              <TextInput type="text" placeholder="内容" value={f.value} onChange={(e) => updateCustomField(idx, { value: e.target.value })} className="flex-1" />
              <button onClick={() => removeCustomField(idx)} style={{ color: COLORS.slate }}><X size={13} /></button>
            </div>
          ))}
        </div>
        <button onClick={addCustomField} className="text-xs font-bold px-2.5 py-1.5 rounded" style={{ color: COLORS.navy, border: `1px solid ${COLORS.brassLight}` }}>+ 項目を追加</button>
      </div>

      {/* 訴訟関係者情報 */}
      <div className="rounded p-5" style={{ backgroundColor: COLORS.card, border: `1px solid ${COLORS.brassLight}` }}>
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-bold flex items-center gap-1.5" style={{ fontFamily: FONT_MINCHO, color: COLORS.navy, letterSpacing: "0.05em" }}>
            <Landmark size={15} /> 訴訟関係者情報
          </h3>
          <button onClick={saveCourtInfo} disabled={courtInfoSaved} className="flex items-center gap-1 text-xs font-bold px-2.5 py-1 rounded disabled:opacity-40" style={{ backgroundColor: COLORS.navy, color: "#fff" }}><Save size={12} /> 保存</button>
        </div>
        <FieldLabel>事件番号</FieldLabel>
        <TextInput type="text" value={courtInfoDraft.courtCaseNumber} onChange={(e) => { setCourtInfoDraft({ ...courtInfoDraft, courtCaseNumber: e.target.value }); setCourtInfoSaved(false); }} placeholder="例：東京地方裁判所 令和8年(ワ)第1234号" className="w-full mb-4" />

        <p className="text-xs font-bold mb-2" style={{ color: COLORS.slate }}>担当書記官</p>
        <div className="flex flex-col gap-2 max-w-sm">
          <TextInput type="text" placeholder="氏名" value={courtInfoDraft.courtClerk.name} onChange={(e) => { setCourtInfoDraft({ ...courtInfoDraft, courtClerk: { ...courtInfoDraft.courtClerk, name: e.target.value } }); setCourtInfoSaved(false); }} className="w-full" />
          <TextInput type="text" placeholder="所属（部・係）" value={courtInfoDraft.courtClerk.affiliation} onChange={(e) => { setCourtInfoDraft({ ...courtInfoDraft, courtClerk: { ...courtInfoDraft.courtClerk, affiliation: e.target.value } }); setCourtInfoSaved(false); }} className="w-full" />
          <div className="flex items-center gap-1.5"><Phone size={13} color={COLORS.slate} /><TextInput type="text" placeholder="電話番号" value={courtInfoDraft.courtClerk.phone} onChange={(e) => { setCourtInfoDraft({ ...courtInfoDraft, courtClerk: { ...courtInfoDraft.courtClerk, phone: e.target.value } }); setCourtInfoSaved(false); }} className="w-full" /></div>
          <div className="flex items-center gap-1.5"><span className="text-xs" style={{ color: COLORS.slate, width: 30 }}>FAX</span><TextInput type="text" placeholder="FAX番号" value={courtInfoDraft.courtClerk.fax} onChange={(e) => { setCourtInfoDraft({ ...courtInfoDraft, courtClerk: { ...courtInfoDraft.courtClerk, fax: e.target.value } }); setCourtInfoSaved(false); }} className="w-full" /></div>
          <div className="flex items-center gap-1.5"><Mail size={13} color={COLORS.slate} /><TextInput type="text" placeholder="メールアドレス" value={courtInfoDraft.courtClerk.email} onChange={(e) => { setCourtInfoDraft({ ...courtInfoDraft, courtClerk: { ...courtInfoDraft.courtClerk, email: e.target.value } }); setCourtInfoSaved(false); }} className="w-full" /></div>
        </div>
      </div>

      {/* 期日 */}
      <div className="rounded p-5" style={{ backgroundColor: COLORS.card, border: `1px solid ${COLORS.brassLight}` }}>
        <h3 className="text-sm font-bold mb-3 flex items-center gap-1.5" style={{ fontFamily: FONT_MINCHO, color: COLORS.navy, letterSpacing: "0.05em" }}>
          <Calendar size={15} /> 期日
        </h3>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 mb-2">
          <label className="text-xs" style={{ color: COLORS.slate }}>
            期日
            <TextInput type="date" value={newHearing.date} onChange={(e) => setNewHearing({ ...newHearing, date: e.target.value })} className="mt-1 w-full" />
          </label>
          <label className="text-xs" style={{ color: COLORS.slate }}>
            書面提出期限
            <TextInput type="date" value={newHearing.docDeadline} onChange={(e) => setNewHearing({ ...newHearing, docDeadline: e.target.value })} className="mt-1 w-full" />
          </label>
          <label className="text-xs" style={{ color: COLORS.slate }}>
            次回裁判期日
            <TextInput type="date" value={newHearing.nextHearingDate} onChange={(e) => setNewHearing({ ...newHearing, nextHearingDate: e.target.value })} className="mt-1 w-full" />
          </label>
        </div>
        <label className="text-xs" style={{ color: COLORS.slate }}>
          内容
          <textarea value={newHearing.content} onChange={(e) => setNewHearing({ ...newHearing, content: e.target.value })} placeholder="内容（例：第2回口頭弁論期日）" rows={5} className="mt-1 w-full text-sm p-2 rounded outline-none resize-none" style={{ border: `1px solid ${COLORS.brassLight}` }} />
        </label>
        <div className="flex gap-2 my-3">
          <button onClick={addHearingEntry} disabled={!newHearing.date || !newHearing.content.trim()} className="text-sm font-bold px-3 py-2 rounded disabled:opacity-40" style={{ backgroundColor: COLORS.navy, color: "#fff" }}>期日を追加</button>
        </div>

        {selectedCase.hearings.length === 0 ? (
          <p className="text-sm py-2" style={{ color: COLORS.slate }}>登録された期日はありません。</p>
        ) : (
          <div className="flex flex-col gap-2">
            {[...selectedCase.hearings].sort((a, b) => (a.date < b.date ? 1 : -1)).map((h) => (
              <div key={h.id} className="flex items-start justify-between gap-2 text-sm p-2.5 rounded" style={{ backgroundColor: COLORS.paper }}>
                <div>
                  <p className="font-bold" style={{ color: COLORS.slate }}>{formatDate(h.date)}（{relativeDayLabel(h.date)}）記録</p>
                  <p className="mt-0.5 whitespace-pre-wrap">{h.content}</p>
                  {h.docDeadline && (
                    <p className="text-xs mt-0.5" style={{ color: h.docDeadline < todayStr() ? COLORS.vermillion : COLORS.slate }}>書面提出期限：{formatDate(h.docDeadline)}</p>
                  )}
                  {h.nextHearingDate && (
                    <p className="text-xs mt-0.5 flex items-center gap-1" style={{ color: COLORS.vermillion }}><Calendar size={11} /> 次回裁判期日：{formatDate(h.nextHearingDate)}</p>
                  )}
                </div>
                <button onClick={() => removeHearing(h.id)} style={{ color: COLORS.slate }} className="flex-shrink-0"><X size={14} /></button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
    </div>
  );
}
