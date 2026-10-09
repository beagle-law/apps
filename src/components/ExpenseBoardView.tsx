"use client";

import { useEffect, useState } from "react";
import { Check, ChevronLeft, ChevronRight, Pencil, Plus, X } from "lucide-react";
import { COLORS, FONT_MINCHO, EXPENSE_CATEGORIES } from "@/lib/constants";
import { currentYearMonth, shiftYearMonth, formatYearMonth, formatDateShort, todayStr } from "@/lib/dates";
import { compareCaseNumbers, sortCasesByCaseNumber } from "@/lib/business/caseSort";
import { formatDuration, formatTotalDuration } from "@/lib/business/timecharge";
import { TextInput, Pill } from "@/components/ui";
import TimeChargeForm from "@/components/TimeChargeForm";
import * as api from "@/lib/api-client";
import { isExpenseBilled } from "@/lib/types";
import type { Case, Expense, TimeCharge, MoneyCard } from "@/lib/types";

interface Props {
  cases: Case[];
  onOpenCase: (id: string) => void;
  onCaseUpdated: (c: Case) => void;
  onError: (msg: string) => void;
}

const LANE_BG = "#EAE4D6";

function Lane({ title, count, children }: { title: string; count?: string; children: React.ReactNode }) {
  return (
    <div className="rounded p-3 flex flex-col gap-2 min-w-0" style={{ backgroundColor: LANE_BG }}>
      <div className="flex items-center justify-between px-1 gap-2 flex-wrap">
        <h3 className="text-sm font-bold" style={{ fontFamily: FONT_MINCHO, color: COLORS.navy }}>{title}</h3>
        {count && <span className="text-xs" style={{ color: COLORS.slate }}>{count}</span>}
      </div>
      {children}
    </div>
  );
}

const cardStyle = { backgroundColor: COLORS.card, border: `1px solid ${COLORS.brassLight}`, boxShadow: "0 1px 2px rgba(0,0,0,0.06)" };

// お金の情報カード：月に紐づかないフリー入力。普段は文字だけを表示し、鉛筆で編集、×で削除する。
function MoneyCardItem({ card, onDeleted, onError }: { card: MoneyCard; onDeleted: (id: string) => void; onError: (msg: string) => void }) {
  const [saved, setSaved] = useState(card.content);
  const [draft, setDraft] = useState(card.content);
  const [editing, setEditing] = useState(card.content === ""); // 追加直後の空カードはそのまま入力できる

  const remove = async (confirm = true) => {
    if (confirm && !window.confirm("このカードを削除します。よろしいですか？")) return;
    try {
      await api.deleteMoneyCard(card.id);
      onDeleted(card.id);
    } catch (e) {
      onError(e instanceof Error ? e.message : "削除に失敗しました");
    }
  };

  const save = async () => {
    if (draft.trim() === "") {
      cancel(); // 空のまま保存した場合は取り消し扱い（新規カードは削除）
      return;
    }
    try {
      const u = await api.updateMoneyCard(card.id, draft);
      setSaved(u.content);
      setEditing(false);
    } catch (e) {
      onError(e instanceof Error ? e.message : "保存に失敗しました");
    }
  };

  const cancel = () => {
    if (saved === "") {
      remove(false); // 一度も内容を保存していない新規カードは取り消し＝削除
      return;
    }
    setDraft(saved);
    setEditing(false);
  };

  return (
    <div className="rounded px-3 py-2" style={cardStyle}>
      {editing ? (
        <>
          <textarea
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            autoFocus
            rows={3}
            placeholder="自由に記入（例：事務所家賃 25日 ¥300,000）"
            className="w-full text-sm p-2 rounded outline-none resize-y"
            style={{ border: `1px solid ${COLORS.brass}`, lineHeight: 1.6 }}
          />
          <div className="flex justify-end gap-2 mt-1.5">
            <button onClick={cancel} className="text-xs px-2 py-1" style={{ color: COLORS.slate }}>キャンセル</button>
            <button onClick={save} className="text-xs font-bold px-3 py-1 rounded flex items-center gap-1" style={{ backgroundColor: COLORS.navy, color: "#fff" }}><Check size={12} /> 保存</button>
          </div>
        </>
      ) : (
        <div className="flex items-start gap-2">
          <p className="flex-1 min-w-0 text-sm whitespace-pre-wrap break-words" style={{ lineHeight: 1.6 }}>{saved}</p>
          <button onClick={() => { setDraft(saved); setEditing(true); }} title="編集" className="flex-shrink-0 p-1 rounded hover:opacity-70" style={{ color: COLORS.navy }}><Pencil size={14} /></button>
          <button onClick={() => remove()} title="削除" className="flex-shrink-0 p-1 rounded hover:opacity-70" style={{ color: COLORS.vermillion }}><X size={14} /></button>
        </div>
      )}
    </div>
  );
}

const yen = (n: number) => `¥${n.toLocaleString("ja-JP")}`;

interface Item {
  e: Expense;
  c: Case;
}

// 顧客ごとの集計キー（顧客に紐づいていない案件は案件単位で扱う）
const clientKeyOf = (c: Case) => c.clientId || `nocl:${c.id}`;
const clientLabelOf = (c: Case) => c.clientName || "（顧客未設定）";

const sumOf = (items: Item[]) => ({
  unbilled: items.filter((i) => !isExpenseBilled(i.e)).reduce((s, i) => s + i.e.amount, 0),
  billed: items.filter((i) => isExpenseBilled(i.e)).reduce((s, i) => s + i.e.amount, 0),
});

type GroupBy = "case" | "client";
interface Selected {
  kind: GroupBy;
  id: string;
}

const emptyExpenseForm = { date: "", caseId: "", category: "", amount: "", notes: "" };

// v21：Trello風のカード形式で、タイムチャージ案件（開始〜終了時刻）・経費・お金の情報（フリー入力）を表示／入力する。
// v24：経費に「請求済み」チェックを追加。月の一覧（請求済み・未請求すべて）と、案件／顧客を選んだときの全期間表示（請求済みの表示／非表示を切替）を持つ。
export default function ExpenseBoardView({ cases, onOpenCase, onCaseUpdated, onError }: Props) {
  const [month, setMonth] = useState(currentYearMonth());
  const [timeCharges, setTimeCharges] = useState<TimeCharge[]>([]);
  const [tcReload, setTcReload] = useState(0);
  const [tcPreset, setTcPreset] = useState<{ id: string; nonce: number }>({ id: "", nonce: 0 });
  const [moneyCards, setMoneyCards] = useState<MoneyCard[]>([]);
  const [groupBy, setGroupBy] = useState<GroupBy>("case");
  const [selected, setSelected] = useState<Selected | null>(null);
  const [showBilled, setShowBilled] = useState(false);
  const [includePast, setIncludePast] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [expenseForm, setExpenseForm] = useState(emptyExpenseForm);

  useEffect(() => {
    let cancelled = false;
    api.fetchTimeChargesByMonth(month).then((r) => !cancelled && setTimeCharges(r)).catch((e) => onError(e instanceof Error ? e.message : "取得に失敗しました"));
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [month, tcReload]);

  useEffect(() => {
    api.fetchMoneyCards().then(setMoneyCards).catch((e) => onError(e instanceof Error ? e.message : "取得に失敗しました"));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const addMoneyCard = async () => {
    try {
      const created = await api.addMoneyCard("");
      setMoneyCards((prev) => [...prev, created]);
    } catch (e) {
      onError(e instanceof Error ? e.message : "登録に失敗しました");
    }
  };

  // ── タイムチャージ ──
  const tcCases = sortCasesByCaseNumber(cases.filter((c) => !c.hidden && !c.isPrivate && c.isTimeChargeCase));
  const byNewest = (a: TimeCharge, b: TimeCharge) => b.date.localeCompare(a.date) || (b.startTime || "").localeCompare(a.startTime || "");

  // ── 経費（非表示の案件も、請求漏れを防ぐため対象に含める。個人メモは除く） ──
  const expenseCases = sortCasesByCaseNumber(cases.filter((c) => !c.isPrivate));
  const allItems: Item[] = expenseCases.flatMap((c) => c.expenses.map((e) => ({ e, c })));
  const monthStart = `${month}-01`;

  const monthItems = allItems.filter((i) => i.e.date.startsWith(month));
  const pastUnbilled = includePast ? allItems.filter((i) => i.e.date < monthStart && !isExpenseBilled(i.e)) : [];
  const listItems = [...pastUnbilled, ...monthItems];

  // 一覧のグループ（案件別／顧客別）
  const groups = (() => {
    const map = new Map<string, { key: string; label: string; first: Case; items: Item[] }>();
    for (const it of listItems) {
      const key = groupBy === "case" ? it.c.id : clientKeyOf(it.c);
      const g = map.get(key) ?? { key, label: groupBy === "case" ? `${it.c.caseNumber}.${it.c.title}` : clientLabelOf(it.c), first: it.c, items: [] };
      g.items.push(it);
      map.set(key, g);
    }
    const list = [...map.values()];
    list.forEach((g) => g.items.sort((a, b) => a.e.date.localeCompare(b.e.date)));
    list.sort((a, b) =>
      groupBy === "case"
        ? compareCaseNumbers(a.first.caseNumber, b.first.caseNumber)
        : (a.first.clientNumber ?? 1e9) - (b.first.clientNumber ?? 1e9) || a.label.localeCompare(b.label, "ja")
    );
    return list;
  })();
  const listTotals = sumOf(listItems);

  // 案件／顧客を選んだときの全期間表示
  const selectedItems = selected
    ? allItems.filter((i) => (selected.kind === "case" ? i.c.id === selected.id : clientKeyOf(i.c) === selected.id))
    : [];
  const selectedLabel = selected && selectedItems.length > 0 ? (selected.kind === "case" ? `${selectedItems[0].c.caseNumber}.${selectedItems[0].c.title}` : clientLabelOf(selectedItems[0].c)) : "";
  const selectedCase = selected?.kind === "case" ? cases.find((c) => c.id === selected.id) ?? null : null;
  const selectedShown = showBilled ? selectedItems : selectedItems.filter((i) => !isExpenseBilled(i.e));
  const selectedByMonth = (() => {
    const map = new Map<string, Item[]>();
    for (const it of selectedShown) {
      const ym = it.e.date.slice(0, 7);
      map.set(ym, [...(map.get(ym) ?? []), it]);
    }
    const months = [...map.entries()].sort((a, b) => b[0].localeCompare(a[0]));
    months.forEach(([, list]) => list.sort((a, b) => b.e.date.localeCompare(a.e.date)));
    return months;
  })();
  const selectedTotals = sumOf(selectedItems);

  // 案件を選んだ状態で追加フォームを開いたときは、その案件を初期値にする
  const openForm = (caseId = "") => {
    setShowForm(true);
    setExpenseForm((prev) => ({
      ...prev,
      date: prev.date || (todayStr().startsWith(month) ? todayStr() : `${month}-01`),
      caseId: caseId || prev.caseId || selectedCase?.id || "",
    }));
  };

  const addExpense = async () => {
    if (!expenseForm.caseId || !expenseForm.date || !expenseForm.category || !expenseForm.amount) return;
    try {
      const updated = await api.addExpense(expenseForm.caseId, {
        date: expenseForm.date,
        category: expenseForm.category,
        amount: Number(expenseForm.amount),
        notes: expenseForm.notes,
      });
      onCaseUpdated(updated);
      // 続けて入力できるよう、日付と案件は残す
      setExpenseForm((prev) => ({ ...prev, category: "", amount: "", notes: "" }));
    } catch (e) {
      onError(e instanceof Error ? e.message : "登録に失敗しました");
    }
  };

  const removeExpense = async (caseId: string, expenseId: string) => {
    if (!window.confirm("この経費を削除します。よろしいですか？")) return;
    try {
      onCaseUpdated(await api.deleteExpense(caseId, expenseId));
    } catch (e) {
      onError(e instanceof Error ? e.message : "削除に失敗しました");
    }
  };

  const toggleBilled = async (it: Item, billed: boolean) => {
    try {
      onCaseUpdated(await api.setExpenseBilled(it.c.id, it.e.id, billed));
    } catch (e) {
      onError(e instanceof Error ? e.message : "更新に失敗しました");
    }
  };

  const select = (kind: GroupBy, id: string) => {
    setSelected({ kind, id });
    setShowBilled(false);
    setShowForm(false);
  };

  const formCaseOptions = expenseCases.filter((c) => !c.hidden || c.id === expenseForm.caseId);

  const renderRow = (it: Item, opts: { showCase?: boolean; fullDate?: boolean }) => {
    const { e, c } = it;
    const billed = isExpenseBilled(e);
    return (
      <div key={e.id} className="text-xs group flex items-start gap-2" style={{ opacity: billed ? 0.7 : 1 }}>
        <input
          type="checkbox"
          className="mt-0.5 flex-shrink-0"
          checked={billed}
          disabled={!!e.billedInInvoiceId}
          title={e.billedInInvoiceId ? "請求書に反映済みです" : "請求済みにする"}
          onChange={(ev) => toggleBilled(it, ev.target.checked)}
        />
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="flex-shrink-0" style={{ color: COLORS.slate }}>{opts.fullDate ? e.date.replace(/-/g, "/") : formatDateShort(e.date)}</span>
            <span className="flex-1 font-semibold truncate">{e.category}</span>
            <span className="font-bold flex-shrink-0">{yen(e.amount)}</span>
            {billed && <span className="flex-shrink-0 px-1.5 py-0.5 rounded-full" style={{ backgroundColor: COLORS.moss, color: "#fff", fontSize: 10 }}>請求済</span>}
            <button onClick={() => removeExpense(c.id, e.id)} title="削除" className="opacity-0 group-hover:opacity-100 flex-shrink-0" style={{ color: COLORS.slate }}><X size={12} /></button>
          </div>
          {opts.showCase && <p style={{ color: COLORS.slate }}>No.{c.caseNumber}　{c.title}</p>}
          {(e.route || e.origin || e.destination) && <p style={{ color: COLORS.slate }}>経路：{e.route || `${e.origin}→${e.destination}`}</p>}
          {e.notes && <p className="whitespace-pre-wrap" style={{ color: COLORS.slate }}>{e.notes}</p>}
        </div>
      </div>
    );
  };

  const totalsLine = (t: { unbilled: number; billed: number }) => (
    <>
      <span style={{ color: t.unbilled > 0 ? COLORS.vermillion : COLORS.slate }}>未請求 {yen(t.unbilled)}</span>
      <span style={{ color: COLORS.slate }}>　請求済 {yen(t.billed)}</span>
    </>
  );

  return (
    <div className="flex-1 overflow-y-auto p-6">
      <div className="max-w-[90rem] mx-auto">
        <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
          <h2 className="text-lg" style={{ fontFamily: FONT_MINCHO, color: COLORS.navy }}>経費入力</h2>
          <div className="flex items-center gap-2">
            <button onClick={() => setMonth((m) => shiftYearMonth(m, -1))} style={{ color: COLORS.slate }}><ChevronLeft size={16} /></button>
            <span className="text-sm font-bold">{formatYearMonth(month)}</span>
            <button onClick={() => setMonth((m) => shiftYearMonth(m, 1))} style={{ color: COLORS.slate }}><ChevronRight size={16} /></button>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.5fr)_minmax(0,1fr)] gap-4 items-start">
          {/* タイムチャージ案件：入力フォームと、開始〜終了時刻をカードに表示 */}
          <Lane title="タイムチャージ案件" count={`${tcCases.length}件`}>
            <div className="rounded p-3" style={cardStyle}>
              <p className="text-xs font-bold mb-1.5" style={{ color: COLORS.navy }}>タイムチャージを入力</p>
              <TimeChargeForm
                compact
                cases={tcCases}
                presetCaseId={tcPreset.id}
                presetNonce={tcPreset.nonce}
                onAdded={(date) => {
                  if (date.startsWith(month)) setTcReload((n) => n + 1);
                  else if (/^\d{4}-\d{2}/.test(date)) setMonth(date.slice(0, 7));
                }}
                onError={onError}
              />
            </div>
            {tcCases.length === 0 && <p className="text-xs px-1" style={{ color: COLORS.slate }}>タイムチャージ案件はありません。</p>}
            {tcCases.map((c) => {
              const rows = timeCharges.filter((t) => t.caseId === c.id).sort(byNewest);
              return (
                <div key={c.id} className="rounded p-3" style={cardStyle}>
                  <div className="flex items-start justify-between gap-2">
                    <button onClick={() => onOpenCase(c.id)} className="text-left text-sm font-semibold hover:opacity-70" style={{ fontFamily: FONT_MINCHO }}>
                      {c.caseNumber}.{c.title}
                    </button>
                    <button onClick={() => setTcPreset((p) => ({ id: c.id, nonce: p.nonce + 1 }))} title="この案件で入力" className="flex-shrink-0 hover:opacity-70" style={{ color: COLORS.navy }}><Plus size={15} /></button>
                  </div>
                  {rows.length === 0 ? (
                    <p className="text-xs mt-1" style={{ color: COLORS.slate }}>この月のタイムチャージはありません。</p>
                  ) : (
                    <div className="flex flex-col gap-1 mt-2">
                      {rows.map((t) => (
                        <div key={t.id} className="text-xs flex items-baseline gap-2 flex-wrap" style={{ color: COLORS.ink }}>
                          <span style={{ color: COLORS.slate }}>{formatDateShort(t.date)}</span>
                          <span className="font-bold">{t.startTime && t.endTime ? `${t.startTime}〜${t.endTime}` : "時刻なし"}</span>
                          <span>{formatDuration(t.hours)}</span>
                          <span style={{ color: COLORS.slate }}>{t.personName}</span>
                          {t.content && <span className="w-full" style={{ color: COLORS.slate }}>{t.content}</span>}
                        </div>
                      ))}
                      <p className="text-xs font-bold text-right pt-1" style={{ color: COLORS.navy, borderTop: `1px solid ${COLORS.paper}` }}>合計 {formatTotalDuration(rows.map((t) => t.hours))}</p>
                    </div>
                  )}
                </div>
              );
            })}
          </Lane>

          {/* 経費：月の一覧（請求済み・未請求すべて）／案件・顧客を選んだ全期間表示 */}
          <Lane title={selected ? `${selected.kind === "case" ? "案件" : "顧客"}の経費（全期間）` : "経費"} count={selected ? undefined : `${includePast ? "表示中" : formatYearMonth(month)}の合計 ${yen(listTotals.unbilled + listTotals.billed)}`}>
            {!selected && (
              <>
                <div className="flex items-center gap-1.5 flex-wrap">
                  <Pill active={groupBy === "case"} color={COLORS.navy} onClick={() => setGroupBy("case")}>案件別</Pill>
                  <Pill active={groupBy === "client"} color={COLORS.navy} onClick={() => setGroupBy("client")}>顧客別</Pill>
                  <label className="flex items-center gap-1 text-xs ml-auto" style={{ color: COLORS.slate }}>
                    <input type="checkbox" checked={includePast} onChange={(e) => setIncludePast(e.target.checked)} /> 過去月の未請求も表示
                  </label>
                </div>
                <p className="text-xs px-1">{totalsLine(listTotals)}</p>
              </>
            )}

            {selected && (
              <div className="rounded p-3 flex flex-col gap-1.5" style={cardStyle}>
                <button onClick={() => setSelected(null)} className="text-xs self-start underline hover:opacity-70" style={{ color: COLORS.navy }}>← {formatYearMonth(month)}の一覧に戻る</button>
                <div className="flex items-start justify-between gap-2">
                  <p className="text-sm font-semibold" style={{ fontFamily: FONT_MINCHO }}>{selectedLabel || "（経費なし）"}</p>
                  {selectedCase && <button onClick={() => onOpenCase(selectedCase.id)} className="text-xs underline flex-shrink-0 hover:opacity-70" style={{ color: COLORS.navy }}>案件を開く</button>}
                </div>
                <p className="text-xs">{totalsLine(selectedTotals)}<span style={{ color: COLORS.slate }}>（全期間）</span></p>
                <label className="flex items-center gap-1.5 text-xs" style={{ color: COLORS.slate }}>
                  <input type="checkbox" checked={showBilled} onChange={(e) => setShowBilled(e.target.checked)} /> 請求済みも表示する
                </label>
              </div>
            )}

            <button onClick={() => (showForm ? setShowForm(false) : openForm(selectedCase?.id))} className="text-sm p-2 rounded flex items-center justify-center gap-1 hover:opacity-80" style={{ border: `1px dashed ${COLORS.brass}`, color: COLORS.navy, backgroundColor: COLORS.card }}>
              <Plus size={14} /> {showForm ? "入力欄を閉じる" : "経費を追加"}
            </button>
            {showForm && (
              <div className="rounded p-3 flex flex-col gap-1.5" style={cardStyle}>
                <select value={expenseForm.caseId} onChange={(e) => setExpenseForm({ ...expenseForm, caseId: e.target.value })} className="text-sm p-2 rounded outline-none" style={{ border: `1px solid ${COLORS.brassLight}` }}>
                  <option value="">案件を選択</option>
                  {formCaseOptions.map((c) => <option key={c.id} value={c.id}>{c.caseNumber}.{c.title}</option>)}
                </select>
                <div className="flex gap-1.5">
                  <TextInput type="date" value={expenseForm.date} onChange={(e) => setExpenseForm({ ...expenseForm, date: e.target.value })} className="flex-1 min-w-0" />
                  <TextInput type="number" placeholder="金額" value={expenseForm.amount} onChange={(e) => setExpenseForm({ ...expenseForm, amount: e.target.value })} className="w-28" />
                </div>
                <input
                  list="expense-board-categories"
                  type="text"
                  placeholder="内訳"
                  value={expenseForm.category}
                  onChange={(e) => setExpenseForm({ ...expenseForm, category: e.target.value })}
                  className="text-sm p-2 rounded outline-none"
                  style={{ border: `1px solid ${COLORS.brassLight}` }}
                />
                <TextInput type="text" placeholder="備考" value={expenseForm.notes} onChange={(e) => setExpenseForm({ ...expenseForm, notes: e.target.value })} />
                <button onClick={addExpense} disabled={!expenseForm.caseId || !expenseForm.date || !expenseForm.category || !expenseForm.amount} className="self-end text-xs font-bold px-3 py-1.5 rounded disabled:opacity-40" style={{ backgroundColor: COLORS.navy, color: "#fff" }}>追加</button>
              </div>
            )}
            <datalist id="expense-board-categories">{EXPENSE_CATEGORIES.map((c) => <option key={c} value={c} />)}</datalist>

            {/* 案件・顧客を選んだ全期間表示：月ごとに新しい順。請求済みは切替で表示 */}
            {selected && (
              <>
                {selectedByMonth.length === 0 && (
                  <p className="text-xs px-1" style={{ color: COLORS.slate }}>{selectedItems.length === 0 ? "経費はありません。" : "未請求の経費はありません。"}</p>
                )}
                {selectedByMonth.map(([ym, list]) => (
                  <div key={ym} className="rounded p-3" style={cardStyle}>
                    <div className="flex items-center justify-between mb-1.5">
                      <p className="text-xs font-bold" style={{ color: COLORS.navy }}>{formatYearMonth(ym)}</p>
                      <p className="text-xs">{totalsLine(sumOf(list))}</p>
                    </div>
                    <div className="flex flex-col gap-1.5">{list.map((it) => renderRow(it, { showCase: selected.kind === "client", fullDate: true }))}</div>
                  </div>
                ))}
              </>
            )}

            {/* 月の一覧：その月に発生した経費を請求済み・未請求問わずすべて表示 */}
            {!selected && (
              <>
                {groups.length === 0 && <p className="text-xs px-1" style={{ color: COLORS.slate }}>この月の経費はありません。</p>}
                {groups.map((g) => (
                  <div key={g.key} className="rounded p-3" style={cardStyle}>
                    <div className="flex items-start justify-between gap-2">
                      <button onClick={() => select(groupBy, g.key)} title="この一覧の過去分もすべて表示" className="text-left text-sm font-semibold hover:opacity-70 underline decoration-dotted" style={{ fontFamily: FONT_MINCHO }}>
                        {g.label}
                      </button>
                      {groupBy === "case" && <button onClick={() => openForm(g.first.id)} title="この案件の経費を追加" className="flex-shrink-0 hover:opacity-70" style={{ color: COLORS.navy }}><Plus size={15} /></button>}
                    </div>
                    <div className="flex flex-col gap-1.5 mt-2">
                      {g.items.map((it) => renderRow(it, { showCase: groupBy === "client", fullDate: !it.e.date.startsWith(month) }))}
                    </div>
                    <p className="text-xs font-bold text-right pt-1 mt-1.5" style={{ borderTop: `1px solid ${COLORS.paper}` }}>{totalsLine(sumOf(g.items))}</p>
                  </div>
                ))}
              </>
            )}
          </Lane>

          {/* お金の情報：月に紐づかないフリー入力カード（月を切り替えても同じものを表示） */}
          <Lane title="お金の情報" count="月を切り替えても共通">
            <button onClick={addMoneyCard} className="text-sm p-2 rounded flex items-center justify-center gap-1 hover:opacity-80" style={{ border: `1px dashed ${COLORS.brass}`, color: COLORS.navy, backgroundColor: COLORS.card }}>
              <Plus size={14} /> カードを追加
            </button>
            {moneyCards.length === 0 && <p className="text-xs px-1" style={{ color: COLORS.slate }}>カードはありません。</p>}
            {moneyCards.map((m) => (
              <MoneyCardItem key={m.id} card={m} onDeleted={(id) => setMoneyCards((prev) => prev.filter((c) => c.id !== id))} onError={onError} />
            ))}
          </Lane>
        </div>
      </div>
    </div>
  );
}
