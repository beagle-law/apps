"use client";

import { useState } from "react";
import { Loader2, Sparkles, X, Plus } from "lucide-react";
import { COLORS, FONT_MINCHO, STAGES, PRIORITIES, BALL_OWNERS, STAFF_MEMBERS } from "@/lib/constants";
import { TextInput, Pill } from "@/components/ui";
import * as api from "@/lib/api-client";
import type { Case } from "@/lib/types";
import type { AiExtractResult } from "@/lib/api-client";

interface Props {
  cases: Case[];
  onCaseCreated: (c: Case) => void;
  onCaseUpdated: (c: Case) => void;
  onOpenCase: (id: string) => void;
  onError: (msg: string) => void;
}

export default function AiInputView({ cases, onCaseCreated, onCaseUpdated, onOpenCase, onError }: Props) {
  const [text, setText] = useState("");
  const [extracting, setExtracting] = useState(false);
  const [error, setError] = useState("");
  const [expenseMatch, setExpenseMatch] = useState<{ result: AiExtractResult; matchedCase: Case } | null>(null);
  const [caseForm, setCaseForm] = useState<AiExtractResult | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const runExtraction = async () => {
    if (!text.trim()) return;
    setExtracting(true);
    setError("");
    setExpenseMatch(null);
    setCaseForm(null);
    try {
      const result = await api.aiExtractCase(text.trim());
      const matchedCase = result.matchedCaseNumber ? cases.find((c) => c.caseNumber === result.matchedCaseNumber) : undefined;
      if (matchedCase && result.expense.category) {
        setExpenseMatch({ result, matchedCase });
      } else {
        setCaseForm(result);
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "AIによる解析に失敗しました");
    } finally {
      setExtracting(false);
    }
  };

  const confirmExpense = async () => {
    if (!expenseMatch) return;
    setSubmitting(true);
    try {
      const updated = await api.addExpense(expenseMatch.matchedCase.id, {
        date: expenseMatch.result.expense.date || new Date().toISOString().slice(0, 10),
        amount: expenseMatch.result.expense.amount,
        category: expenseMatch.result.expense.category,
        origin: expenseMatch.result.expense.origin,
        destination: expenseMatch.result.expense.destination,
        route: expenseMatch.result.expense.route,
        notes: expenseMatch.result.expense.notes,
      });
      onCaseUpdated(updated);
      onOpenCase(updated.id);
      setExpenseMatch(null);
      setText("");
    } catch (e) {
      onError(e instanceof Error ? e.message : "実費の追加に失敗しました");
    } finally {
      setSubmitting(false);
    }
  };

  const treatAsNewCase = () => {
    if (!expenseMatch) return;
    setCaseForm(expenseMatch.result);
    setExpenseMatch(null);
  };

  const confirmCase = async () => {
    if (!caseForm || !caseForm.title.trim() || !caseForm.clientName.trim()) return;
    setSubmitting(true);
    try {
      const created = await api.createCase({
        title: caseForm.title,
        clientName: caseForm.clientName,
        deadline: caseForm.deadline,
        priority: caseForm.priority,
        teamMember: caseForm.teamMembers[0] || "",
        initialNote: caseForm.summary,
      });
      // ステータス・ボールの所在をAI抽出結果に合わせる
      const updated = await api.patchCase(created.id, { stage: caseForm.stage, ballOwner: caseForm.ballOwner });
      // AIが提案したタスクを追加
      let finalCase = updated;
      for (const t of caseForm.tasks) {
        if (!t.description.trim()) continue;
        finalCase = await api.addTask(created.id, {
          description: t.description,
          assignee: t.assignee,
          assignedBy: t.assignee ? "宮村" : "",
          dueDate: t.dueDate,
        });
      }
      onCaseCreated(finalCase);
      onOpenCase(finalCase.id);
      setCaseForm(null);
      setText("");
    } catch (e) {
      onError(e instanceof Error ? e.message : "案件の登録に失敗しました");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="flex-1 overflow-y-auto p-6">
      <div className="max-w-2xl mx-auto">
        <h2 className="text-lg mb-1 flex items-center gap-2" style={{ fontFamily: FONT_MINCHO, color: COLORS.navy }}>
          <Sparkles size={18} /> AI入力
        </h2>
        <p className="text-xs mb-5" style={{ color: COLORS.slate }}>
          新規案件の相談内容や、既存案件の実費報告を自由文で入力すると、AIが内容を解析します。
        </p>

        <div className="rounded p-5" style={{ backgroundColor: COLORS.card, border: `1px solid ${COLORS.brassLight}` }}>
          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            rows={8}
            placeholder="例：〇〇商事さんから新規相談。売買代金の未払いで△△工業を訴えたいとのこと。来週面談予定。&#10;または：新宿から霞が関まで電車で移動、片道420円。案件No.2026-014の件。"
            className="w-full text-sm p-3 rounded outline-none resize-none"
            style={{ border: `1px solid ${COLORS.brassLight}` }}
          />
          <button
            onClick={runExtraction}
            disabled={extracting || !text.trim()}
            className="mt-3 flex items-center gap-2 text-sm font-bold px-4 py-2 rounded disabled:opacity-40"
            style={{ backgroundColor: COLORS.navy, color: "#fff" }}
          >
            {extracting && <Loader2 className="animate-spin" size={14} />}
            AIで解析する
          </button>
          {error && <p className="text-xs mt-2" style={{ color: COLORS.vermillion }}>{error}</p>}
        </div>

        {expenseMatch && (
          <div className="rounded p-5 mt-4" style={{ backgroundColor: COLORS.card, border: `1px solid ${COLORS.brassLight}` }}>
            <h3 className="text-sm font-bold mb-2" style={{ color: COLORS.navy }}>既存案件の実費として登録しますか？</h3>
            <p className="text-sm mb-3">
              No.{expenseMatch.matchedCase.caseNumber}　{expenseMatch.matchedCase.title}
            </p>
            <div className="grid grid-cols-2 gap-2 text-sm mb-3">
              <p>日付：{expenseMatch.result.expense.date}</p>
              <p>内訳：{expenseMatch.result.expense.category}</p>
              <p>金額：¥{expenseMatch.result.expense.amount.toLocaleString("ja-JP")}</p>
              <p>経路：{expenseMatch.result.expense.route}</p>
            </div>
            <div className="flex gap-2">
              <button onClick={confirmExpense} disabled={submitting} className="text-sm font-bold px-4 py-2 rounded disabled:opacity-40" style={{ backgroundColor: COLORS.navy, color: "#fff" }}>この案件の実費に追加する</button>
              <button onClick={treatAsNewCase} className="text-sm px-4 py-2 rounded" style={{ color: COLORS.slate, border: `1px solid ${COLORS.brassLight}` }}>この案件ではなく新規案件として登録する</button>
            </div>
          </div>
        )}

        {caseForm && (
          <div className="rounded p-5 mt-4 flex flex-col gap-3" style={{ backgroundColor: COLORS.card, border: `1px solid ${COLORS.brassLight}` }}>
            <h3 className="text-sm font-bold" style={{ color: COLORS.navy }}>新規案件として登録</h3>
            <label className="text-xs" style={{ color: COLORS.slate }}>
              案件名 *
              <TextInput type="text" value={caseForm.title} onChange={(e) => setCaseForm({ ...caseForm, title: e.target.value })} className="mt-1 w-full" />
            </label>
            <label className="text-xs" style={{ color: COLORS.slate }}>
              依頼者 *
              <TextInput type="text" value={caseForm.clientName} onChange={(e) => setCaseForm({ ...caseForm, clientName: e.target.value })} className="mt-1 w-full" />
            </label>
            <div>
              <p className="text-xs mb-1" style={{ color: COLORS.slate }}>ステータス</p>
              <div className="flex gap-1.5 flex-wrap">
                {STAGES.map((s) => <Pill key={s} active={caseForm.stage === s} color={COLORS.navy} onClick={() => setCaseForm({ ...caseForm, stage: s })}>{s}</Pill>)}
              </div>
            </div>
            <div className="flex gap-4">
              <div>
                <p className="text-xs mb-1" style={{ color: COLORS.slate }}>優先度</p>
                <div className="flex gap-1.5">
                  {PRIORITIES.map((p) => <Pill key={p} active={caseForm.priority === p} color={COLORS.vermillion} onClick={() => setCaseForm({ ...caseForm, priority: p })}>{p}</Pill>)}
                </div>
              </div>
              <div>
                <p className="text-xs mb-1" style={{ color: COLORS.slate }}>ボール</p>
                <div className="flex gap-1.5 flex-wrap">
                  {BALL_OWNERS.map((o) => <Pill key={o} active={caseForm.ballOwner === o} color={COLORS.navy} onClick={() => setCaseForm({ ...caseForm, ballOwner: o })}>{o}</Pill>)}
                </div>
              </div>
            </div>
            <div>
              <p className="text-xs mb-1" style={{ color: COLORS.slate }}>担当メンバー</p>
              <div className="flex gap-1.5 flex-wrap">
                {STAFF_MEMBERS.map((m) => (
                  <Pill
                    key={m}
                    active={caseForm.teamMembers.includes(m)}
                    color={COLORS.navy}
                    onClick={() =>
                      setCaseForm({
                        ...caseForm,
                        teamMembers: caseForm.teamMembers.includes(m)
                          ? caseForm.teamMembers.filter((x) => x !== m)
                          : [...caseForm.teamMembers, m],
                      })
                    }
                  >
                    {m}
                  </Pill>
                ))}
              </div>
            </div>
            <label className="text-xs" style={{ color: COLORS.slate }}>
              初回メモ
              <textarea value={caseForm.summary} onChange={(e) => setCaseForm({ ...caseForm, summary: e.target.value })} rows={2} className="mt-1 w-full text-sm p-2 rounded outline-none resize-none" style={{ border: `1px solid ${COLORS.brassLight}` }} />
            </label>
            {caseForm.tasks.length > 0 && (
              <div>
                <p className="text-xs mb-1" style={{ color: COLORS.slate }}>タスク（AI提案）</p>
                <div className="flex flex-col gap-1.5">
                  {caseForm.tasks.map((t, i) => (
                    <div key={i} className="flex items-center gap-2 text-sm p-2 rounded" style={{ backgroundColor: COLORS.paper }}>
                      <span className="flex-1">{t.description}</span>
                      <span className="text-xs" style={{ color: COLORS.slate }}>{t.assignee}</span>
                      <button onClick={() => setCaseForm({ ...caseForm, tasks: caseForm.tasks.filter((_, idx) => idx !== i) })} style={{ color: COLORS.slate }}><X size={13} /></button>
                    </div>
                  ))}
                </div>
              </div>
            )}
            <div className="flex gap-2">
              <button onClick={confirmCase} disabled={submitting || !caseForm.title.trim() || !caseForm.clientName.trim()} className="flex items-center gap-2 text-sm font-bold px-4 py-2 rounded disabled:opacity-40" style={{ backgroundColor: COLORS.vermillion, color: "#fff" }}>
                {submitting && <Loader2 className="animate-spin" size={14} />} <Plus size={14} /> この内容で登録する
              </button>
              <button onClick={() => setCaseForm(null)} className="text-sm px-4 py-2 rounded" style={{ color: COLORS.slate }}>キャンセル</button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
