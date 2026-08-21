"use client";

import { useState } from "react";
import { X, Send } from "lucide-react";
import { COLORS, FONT_MINCHO, TASK_POINT_OPTIONS, STAFF_MEMBERS } from "@/lib/constants";
import { TextInput } from "@/components/ui";
import * as api from "@/lib/api-client";
import type { Case, CaseTask } from "@/lib/types";

export type ModalTask = CaseTask & { case: { id: string; title: string; caseNumber: string } };

interface Props {
  task: ModalTask;
  cases: Case[];
  /** 案件詳細から開いた場合、または宮村が自分のタブから開いた場合はtrue（v7 3.2）。難易度点の編集可否・採点UIの表示を制御する。 */
  isFullEditContext: boolean;
  onClose: () => void;
  onOpenCase: (caseId: string) => void;
  onSaved: (updated: Case, info: { redirectToPerson: string | null; movedFrom: { caseId: string; taskId: string } | null }) => void;
  onError: (msg: string) => void;
}

export default function TaskEditModal({ task, cases, isFullEditContext, onClose, onOpenCase, onSaved, onError }: Props) {
  const [draft, setDraft] = useState({
    description: task.description || "",
    assignee: task.assignee || "",
    dueDate: task.dueDate || "",
    points: task.points != null ? String(task.points) : "",
    caseId: task.case.id,
  });
  const [busy, setBusy] = useState(false);

  const awaitingScore = isFullEditContext && !!task.handedBackFrom && task.status !== "完了";
  const selectedCase = cases.find((c) => c.id === draft.caseId);
  const assigneeOptions = selectedCase?.teamMembers.length ? selectedCase.teamMembers : STAFF_MEMBERS;

  const buildPayload = () => ({
    description: draft.description.trim() || task.description,
    assignee: draft.assignee,
    dueDate: draft.dueDate,
    ...(isFullEditContext ? { points: draft.points ? Number(draft.points) : null } : {}),
    ...(draft.caseId !== task.case.id ? { caseId: draft.caseId } : {}),
  });

  const run = async (fn: () => Promise<{ updated: Case; redirectToPerson?: string | null }>) => {
    setBusy(true);
    try {
      const { updated, redirectToPerson } = await fn();
      const movedFrom = updated.id !== task.case.id ? { caseId: task.case.id, taskId: task.id } : null;
      onSaved(updated, { redirectToPerson: redirectToPerson ?? null, movedFrom });
      onClose();
    } catch (e) {
      onError(e instanceof Error ? e.message : "更新に失敗しました");
    } finally {
      setBusy(false);
    }
  };

  const save = () =>
    run(async () => ({ updated: await api.patchTask(task.case.id, task.id, buildPayload()) }));

  const submitCompletion = () =>
    run(async () => {
      const res = await api.completeReportTask(task.case.id, task.id, buildPayload());
      return { updated: res.case, redirectToPerson: res.redirectToPerson };
    });

  const moveToWaiting = () =>
    run(async () => ({ updated: await api.patchTask(task.case.id, task.id, { kind: "waiting" }) }));

  const remove = () => run(async () => ({ updated: await api.deleteTask(task.case.id, task.id) }));

  const score = (s: number) => run(async () => ({ updated: await api.scoreTask(task.case.id, task.id, s) }));

  return (
    <div className="fixed inset-0 flex items-start md:items-center justify-center p-4 overflow-y-auto z-20" style={{ backgroundColor: "rgba(27,42,74,0.55)" }}>
      <div className="w-full max-w-md rounded p-5 my-8" style={{ backgroundColor: COLORS.card }}>
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg" style={{ fontFamily: FONT_MINCHO, color: COLORS.navy }}>タスク編集/終了報告</h3>
          <button onClick={onClose}><X size={18} color={COLORS.slate} /></button>
        </div>
        <p className="text-xs mb-4" style={{ color: COLORS.slate }}>{task.case.title}（No. {task.case.caseNumber}）</p>

        {awaitingScore && (
          <div className="rounded p-3 mb-4" style={{ backgroundColor: COLORS.paper, border: `1px dashed ${COLORS.brassLight}` }}>
            <p className="text-xs font-bold mb-2" style={{ color: COLORS.navy }}>{task.handedBackFrom}の対応を採点</p>
            <div className="flex gap-1.5">
              {[1, 2, 3, 4, 5].map((s) => (
                <button key={s} disabled={busy} onClick={() => score(s)} className="text-sm font-bold rounded flex items-center justify-center disabled:opacity-40" style={{ width: 32, height: 32, color: COLORS.navy, border: `1px solid ${COLORS.navy}` }}>{s}</button>
              ))}
            </div>
            <p className="text-xs mt-2" style={{ color: COLORS.slate }}>採点すると、このタスクは完了になります。</p>
          </div>
        )}

        <div className="flex flex-col gap-3">
          <label className="text-xs" style={{ color: COLORS.slate }}>
            案件
            <select value={draft.caseId} onChange={(e) => setDraft({ ...draft, caseId: e.target.value })} className="mt-1 w-full text-sm p-2 rounded outline-none" style={{ border: `1px solid ${COLORS.brassLight}` }}>
              {cases.map((c) => <option key={c.id} value={c.id}>No.{c.caseNumber} {c.title}</option>)}
            </select>
          </label>
          <label className="text-xs" style={{ color: COLORS.slate }}>
            指示内容
            <textarea value={draft.description} onChange={(e) => setDraft({ ...draft, description: e.target.value })} rows={2} className="mt-1 w-full text-sm p-2 rounded outline-none resize-none" style={{ border: `1px solid ${COLORS.brassLight}` }} />
          </label>
          <label className="text-xs" style={{ color: COLORS.slate }}>
            担当者
            <select value={draft.assignee} onChange={(e) => setDraft({ ...draft, assignee: e.target.value })} className="mt-1 w-full text-sm p-2 rounded outline-none" style={{ border: `1px solid ${COLORS.brassLight}` }}>
              <option value="">未割当</option>
              {assigneeOptions.map((m) => <option key={m} value={m}>{m}</option>)}
            </select>
          </label>
          <div className="flex gap-3">
            <label className="flex-1 text-xs" style={{ color: COLORS.slate }}>
              納期
              <TextInput type="date" value={draft.dueDate} onChange={(e) => setDraft({ ...draft, dueDate: e.target.value })} className="mt-1 w-full" />
            </label>
            <label className="flex-1 text-xs" style={{ color: COLORS.slate }}>
              難易度点{!isFullEditContext && "（宮村のみ変更可）"}
              <select value={draft.points} onChange={(e) => setDraft({ ...draft, points: e.target.value })} disabled={!isFullEditContext} className="mt-1 w-full text-sm p-2 rounded outline-none disabled:opacity-60" style={{ border: `1px solid ${COLORS.brassLight}` }}>
                <option value="">点数（任意）</option>
                {TASK_POINT_OPTIONS.map((p) => <option key={p} value={p}>{p}点</option>)}
              </select>
            </label>
          </div>
        </div>

        <div className="flex items-center justify-between mt-5 mb-2">
          <button onClick={() => onOpenCase(task.case.id)} className="text-xs underline" style={{ color: COLORS.navy }}>案件を開く</button>
          <div className="flex gap-2">
            <button onClick={onClose} className="text-sm px-4 py-2 rounded" style={{ color: COLORS.slate }}>キャンセル</button>
            <button disabled={busy} onClick={save} className="text-sm font-bold px-4 py-2 rounded disabled:opacity-60" style={{ backgroundColor: COLORS.navy, color: "#fff" }}>保存</button>
          </div>
        </div>
        <button disabled={busy} onClick={submitCompletion} className="w-full flex items-center justify-center gap-1.5 text-sm font-bold px-4 py-2 rounded disabled:opacity-60" style={{ backgroundColor: COLORS.moss, color: "#fff" }}>
          <Send size={13} /> 終了報告
        </button>
        {task.kind !== "waiting" && (
          <button disabled={busy} onClick={moveToWaiting} className="w-full mt-2 flex items-center justify-center gap-1.5 text-sm font-bold px-4 py-2 rounded disabled:opacity-60" style={{ backgroundColor: "transparent", color: COLORS.amber, border: `1px solid ${COLORS.amber}` }}>
            待ちタスクへ移動
          </button>
        )}
        <button disabled={busy} onClick={remove} className="w-full text-center text-xs mt-2 disabled:opacity-60" style={{ color: COLORS.slate }}>このタスクを削除</button>
      </div>
    </div>
  );
}
