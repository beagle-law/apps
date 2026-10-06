"use client";

import { useEffect, useState } from "react";
import { ChevronLeft, ChevronRight, Plus, X } from "lucide-react";
import { COLORS, FONT_MINCHO, EXPENSE_CATEGORIES } from "@/lib/constants";
import { currentYearMonth, shiftYearMonth, formatYearMonth, formatDateShort, todayStr } from "@/lib/dates";
import { sortCasesByCaseNumber } from "@/lib/business/caseSort";
import { TextInput } from "@/components/ui";
import * as api from "@/lib/api-client";
import type { Case, TimeCharge, MoneyCard } from "@/lib/types";

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
      <div className="flex items-center justify-between px-1">
        <h3 className="text-sm font-bold" style={{ fontFamily: FONT_MINCHO, color: COLORS.navy }}>{title}</h3>
        {count && <span className="text-xs" style={{ color: COLORS.slate }}>{count}</span>}
      </div>
      {children}
    </div>
  );
}

const cardStyle = { backgroundColor: COLORS.card, border: `1px solid ${COLORS.brassLight}`, boxShadow: "0 1px 2px rgba(0,0,0,0.06)" };

const emptyExpenseForm = { date: "", category: "", amount: "", notes: "" };
const emptyMoneyForm = { kind: "expense", title: "", amount: "", note: "" };

// v21：Trello風のカード形式で、タイムチャージ案件（開始〜終了時刻）・案件ごとの経費・お金に関する自由カードを月ごとに表示／入力する。
export default function ExpenseBoardView({ cases, onOpenCase, onCaseUpdated, onError }: Props) {
  const [month, setMonth] = useState(currentYearMonth());
  const [timeCharges, setTimeCharges] = useState<TimeCharge[]>([]);
  const [moneyCards, setMoneyCards] = useState<MoneyCard[]>([]);
  const [formCaseId, setFormCaseId] = useState<string | null>(null);
  const [expenseForm, setExpenseForm] = useState(emptyExpenseForm);
  const [moneyForm, setMoneyForm] = useState(emptyMoneyForm);

  useEffect(() => {
    let cancelled = false;
    api.fetchTimeChargesByMonth(month).then((r) => !cancelled && setTimeCharges(r)).catch((e) => onError(e instanceof Error ? e.message : "取得に失敗しました"));
    api.fetchMoneyCards(month).then((r) => !cancelled && setMoneyCards(r)).catch((e) => onError(e instanceof Error ? e.message : "取得に失敗しました"));
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [month]);

  const visibleCases = sortCasesByCaseNumber(cases.filter((c) => !c.hidden && !c.isPrivate));
  const timeChargeCases = visibleCases.filter((c) => c.isTimeChargeCase);
  const caseById = new Map(cases.map((c) => [c.id, c]));

  const monthExpenses = (c: Case) => c.expenses.filter((e) => e.date.startsWith(month));
  const expenseCases = visibleCases.filter((c) => monthExpenses(c).length > 0 || c.id === formCaseId);
  const expenseGrandTotal = expenseCases.reduce((s, c) => s + monthExpenses(c).reduce((a, e) => a + e.amount, 0), 0);

  const openForm = (caseId: string) => {
    setFormCaseId(caseId);
    setExpenseForm({ ...emptyExpenseForm, date: todayStr().startsWith(month) ? todayStr() : `${month}-01` });
  };

  const addExpense = async (caseId: string) => {
    if (!expenseForm.date || !expenseForm.category || !expenseForm.amount) return;
    try {
      const updated = await api.addExpense(caseId, {
        date: expenseForm.date,
        category: expenseForm.category,
        amount: Number(expenseForm.amount),
        notes: expenseForm.notes,
      });
      onCaseUpdated(updated);
      setFormCaseId(null);
      setExpenseForm(emptyExpenseForm);
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

  const addMoneyCard = async () => {
    if (!moneyForm.title.trim()) return;
    try {
      const created = await api.addMoneyCard({
        yearMonth: month,
        kind: moneyForm.kind,
        title: moneyForm.title,
        amount: moneyForm.amount === "" ? null : Number(moneyForm.amount),
        note: moneyForm.note,
      });
      setMoneyCards((prev) => [...prev, created]);
      setMoneyForm(emptyMoneyForm);
    } catch (e) {
      onError(e instanceof Error ? e.message : "登録に失敗しました");
    }
  };

  const removeMoneyCard = async (id: string) => {
    if (!window.confirm("このカードを削除します。よろしいですか？")) return;
    try {
      await api.deleteMoneyCard(id);
      setMoneyCards((prev) => prev.filter((c) => c.id !== id));
    } catch (e) {
      onError(e instanceof Error ? e.message : "削除に失敗しました");
    }
  };

  const incomeTotal = moneyCards.filter((c) => c.kind === "income").reduce((s, c) => s + (c.amount ?? 0), 0);
  const outgoTotal = moneyCards.filter((c) => c.kind !== "income").reduce((s, c) => s + (c.amount ?? 0), 0);
  const yen = (n: number) => `¥${n.toLocaleString("ja-JP")}`;

  return (
    <div className="flex-1 overflow-y-auto p-6">
      <div className="max-w-7xl mx-auto">
        <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
          <h2 className="text-lg" style={{ fontFamily: FONT_MINCHO, color: COLORS.navy }}>経費入力</h2>
          <div className="flex items-center gap-2">
            <button onClick={() => setMonth((m) => shiftYearMonth(m, -1))} style={{ color: COLORS.slate }}><ChevronLeft size={16} /></button>
            <span className="text-sm font-bold">{formatYearMonth(month)}</span>
            <button onClick={() => setMonth((m) => shiftYearMonth(m, 1))} style={{ color: COLORS.slate }}><ChevronRight size={16} /></button>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 items-start">
          {/* タイムチャージ案件：開始〜終了時刻をカードに表示 */}
          <Lane title="タイムチャージ案件" count={`${timeChargeCases.length}件`}>
            {timeChargeCases.length === 0 && <p className="text-xs px-1" style={{ color: COLORS.slate }}>タイムチャージ案件はありません。</p>}
            {timeChargeCases.map((c) => {
              const rows = timeCharges.filter((t) => t.caseId === c.id);
              const total = rows.reduce((s, t) => s + t.hours, 0);
              return (
                <div key={c.id} className="rounded p-3" style={cardStyle}>
                  <button onClick={() => onOpenCase(c.id)} className="text-left text-sm font-semibold hover:opacity-70" style={{ fontFamily: FONT_MINCHO }}>
                    {c.caseNumber}.{c.title}
                  </button>
                  {rows.length === 0 ? (
                    <p className="text-xs mt-1" style={{ color: COLORS.slate }}>この月のタイムチャージはありません。</p>
                  ) : (
                    <div className="flex flex-col gap-1 mt-2">
                      {rows.map((t) => (
                        <div key={t.id} className="text-xs flex items-baseline gap-2 flex-wrap" style={{ color: COLORS.ink }}>
                          <span style={{ color: COLORS.slate }}>{formatDateShort(t.date)}</span>
                          <span className="font-bold">{t.startTime && t.endTime ? `${t.startTime}〜${t.endTime}` : "時刻なし"}</span>
                          <span>{t.hours}時間</span>
                          <span style={{ color: COLORS.slate }}>{t.personName}</span>
                          {t.content && <span className="w-full" style={{ color: COLORS.slate }}>{t.content}</span>}
                        </div>
                      ))}
                      <p className="text-xs font-bold text-right pt-1" style={{ color: COLORS.navy, borderTop: `1px solid ${COLORS.paper}` }}>合計 {Math.round(total * 100) / 100}時間</p>
                    </div>
                  )}
                </div>
              );
            })}
          </Lane>

          {/* 経費：案件ごとのカード */}
          <Lane title="経費" count={`合計 ${yen(expenseGrandTotal)}`}>
            <select
              value=""
              onChange={(e) => e.target.value && openForm(e.target.value)}
              className="text-sm p-2 rounded outline-none"
              style={{ border: `1px solid ${COLORS.brassLight}`, backgroundColor: COLORS.card }}
            >
              <option value="">＋ 案件を選んで経費を入力</option>
              {visibleCases.map((c) => (
                <option key={c.id} value={c.id}>{c.caseNumber}.{c.title}</option>
              ))}
            </select>
            {expenseCases.length === 0 && <p className="text-xs px-1" style={{ color: COLORS.slate }}>この月の経費はありません。</p>}
            {expenseCases.map((c) => {
              const rows = monthExpenses(c);
              const total = rows.reduce((s, e) => s + e.amount, 0);
              return (
                <div key={c.id} className="rounded p-3" style={cardStyle}>
                  <div className="flex items-start justify-between gap-2">
                    <button onClick={() => onOpenCase(c.id)} className="text-left text-sm font-semibold hover:opacity-70" style={{ fontFamily: FONT_MINCHO }}>
                      {c.caseNumber}.{c.title}
                    </button>
                    <button onClick={() => (formCaseId === c.id ? setFormCaseId(null) : openForm(c.id))} title="経費を追加" style={{ color: COLORS.navy }}><Plus size={15} /></button>
                  </div>
                  {rows.length > 0 && (
                    <div className="flex flex-col gap-1.5 mt-2">
                      {rows.map((e) => (
                        <div key={e.id} className="text-xs group">
                          <div className="flex items-center gap-2">
                            <span style={{ color: COLORS.slate }}>{formatDateShort(e.date)}</span>
                            <span className="flex-1 font-semibold">{e.category}</span>
                            <span className="font-bold">{yen(e.amount)}</span>
                            <button onClick={() => removeExpense(c.id, e.id)} className="opacity-0 group-hover:opacity-100" style={{ color: COLORS.slate }}><X size={12} /></button>
                          </div>
                          {(e.route || e.origin || e.destination) && <p style={{ color: COLORS.slate }}>経路：{e.route || `${e.origin}→${e.destination}`}</p>}
                          {e.notes && <p className="whitespace-pre-wrap" style={{ color: COLORS.slate }}>{e.notes}</p>}
                        </div>
                      ))}
                      <p className="text-xs font-bold text-right pt-1" style={{ color: COLORS.navy, borderTop: `1px solid ${COLORS.paper}` }}>小計 {yen(total)}</p>
                    </div>
                  )}
                  {formCaseId === c.id && (
                    <div className="flex flex-col gap-1.5 mt-2 pt-2" style={{ borderTop: `1px solid ${COLORS.paper}` }}>
                      <div className="flex gap-1.5">
                        <TextInput type="date" value={expenseForm.date} onChange={(e) => setExpenseForm({ ...expenseForm, date: e.target.value })} className="flex-1 min-w-0" />
                        <TextInput type="number" placeholder="金額" value={expenseForm.amount} onChange={(e) => setExpenseForm({ ...expenseForm, amount: e.target.value })} className="w-24" />
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
                      <div className="flex justify-end gap-2">
                        <button onClick={() => setFormCaseId(null)} className="text-xs px-2 py-1" style={{ color: COLORS.slate }}>キャンセル</button>
                        <button onClick={() => addExpense(c.id)} disabled={!expenseForm.date || !expenseForm.category || !expenseForm.amount} className="text-xs font-bold px-3 py-1.5 rounded disabled:opacity-40" style={{ backgroundColor: COLORS.navy, color: "#fff" }}>追加</button>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
            <datalist id="expense-board-categories">{EXPENSE_CATEGORIES.map((c) => <option key={c} value={c} />)}</datalist>
          </Lane>

          {/* お金に関する情報：案件に紐づかない自由カード */}
          <Lane title="お金の情報" count={`請求予定 ${yen(incomeTotal)} ／ 支出 ${yen(outgoTotal)}`}>
            <div className="rounded p-3 flex flex-col gap-1.5" style={cardStyle}>
              <div className="flex gap-1.5">
                <select value={moneyForm.kind} onChange={(e) => setMoneyForm({ ...moneyForm, kind: e.target.value })} className="text-sm p-2 rounded outline-none" style={{ border: `1px solid ${COLORS.brassLight}` }}>
                  <option value="expense">支出</option>
                  <option value="income">予定請求</option>
                </select>
                <TextInput type="text" placeholder="タイトル（例：事務所家賃）" value={moneyForm.title} onChange={(e) => setMoneyForm({ ...moneyForm, title: e.target.value })} className="flex-1 min-w-0" />
              </div>
              <div className="flex gap-1.5">
                <TextInput type="number" placeholder="金額" value={moneyForm.amount} onChange={(e) => setMoneyForm({ ...moneyForm, amount: e.target.value })} className="w-28" />
                <TextInput type="text" placeholder="メモ（例：25日、末日など）" value={moneyForm.note} onChange={(e) => setMoneyForm({ ...moneyForm, note: e.target.value })} className="flex-1 min-w-0" />
              </div>
              <button onClick={addMoneyCard} disabled={!moneyForm.title.trim()} className="self-end text-xs font-bold px-3 py-1.5 rounded disabled:opacity-40" style={{ backgroundColor: COLORS.navy, color: "#fff" }}>カードを追加</button>
            </div>
            {moneyCards.length === 0 && <p className="text-xs px-1" style={{ color: COLORS.slate }}>この月のカードはありません。</p>}
            {moneyCards.map((m) => (
              <div key={m.id} className="rounded p-3 group" style={{ ...cardStyle, borderLeft: `4px solid ${m.kind === "income" ? COLORS.moss : COLORS.vermillion}` }}>
                <div className="flex items-start justify-between gap-2">
                  <span className="text-xs font-bold" style={{ color: m.kind === "income" ? COLORS.moss : COLORS.vermillion }}>{m.kind === "income" ? "予定請求" : "支出"}</span>
                  <button onClick={() => removeMoneyCard(m.id)} className="opacity-0 group-hover:opacity-100" style={{ color: COLORS.slate }}><X size={13} /></button>
                </div>
                <div className="flex items-baseline justify-between gap-2">
                  <p className="text-sm font-semibold">{m.title}</p>
                  {m.amount !== null && <p className="text-sm font-bold flex-shrink-0">{yen(m.amount)}</p>}
                </div>
                {m.note && <p className="text-xs mt-0.5 whitespace-pre-wrap" style={{ color: COLORS.slate }}>{m.note}</p>}
              </div>
            ))}
          </Lane>
        </div>
      </div>
    </div>
  );
}
