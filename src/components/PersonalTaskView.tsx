"use client";

import { useEffect, useState } from "react";
import { User, Calendar, ClipboardList, Clock, Send } from "lucide-react";
import { COLORS, FONT_MINCHO, DAILY_REPORT_STAFF, TASK_POINT_OPTIONS } from "@/lib/constants";
import { formatDateShort, formatDateTime, plusDaysStr, todayStr } from "@/lib/dates";
import { normalizeTimeInput, calcHoursFromTimes } from "@/lib/business/timecharge";
import { TextInput } from "@/components/ui";
import TaskEditModal, { type ModalTask } from "@/components/TaskEditModal";
import * as api from "@/lib/api-client";
import type { PersonalSummary } from "@/lib/api-client";
import type { Case } from "@/lib/types";

type PersonalTask = PersonalSummary["tasks"][number];

interface Props {
  personName: string;
  isAdmin: boolean;
  cases: Case[];
  onOpenCase: (id: string) => void;
  onNavigateToPerson: (name: string) => void;
  onTaskSaved: (updated: Case, movedFrom: { caseId: string; taskId: string } | null) => void;
  onError: (msg: string) => void;
}

export default function PersonalTaskView({ personName, isAdmin, cases, onOpenCase, onNavigateToPerson, onTaskSaved, onError }: Props) {
  const [summary, setSummary] = useState<PersonalSummary | null>(null);
  const [instructionForm, setInstructionForm] = useState({ caseId: "", assignee: "尾崎", content: "", dueDate: plusDaysStr(7), points: "" });
  const [timeChargeForm, setTimeChargeForm] = useState({ date: todayStr(), caseId: "", startTime: "", endTime: "", hours: "", content: "" });
  const [reportForm, setReportForm] = useState({ date: todayStr(), mostImportant: "", todayTasks: "", waitingCases: "", todaySuccess: "" });
  const [editingTask, setEditingTask] = useState<ModalTask | null>(null);
  const [draggedTaskId, setDraggedTaskId] = useState<string | null>(null);

  const load = () => {
    api.fetchPersonalSummary(personName).then(setSummary).catch((e) => onError(e instanceof Error ? e.message : "取得に失敗しました"));
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [personName]);

  // 日報の引き継ぎロジック（v6 3.4）：本日分が未記入なら、todayTasks/waitingCasesを前回記録から引き継ぐ。
  // mostImportant/todaySuccessは引き継がない。
  useEffect(() => {
    if (!summary?.dailyReports) return;
    const today = todayStr();
    if (summary.dailyReports.some((r) => r.date === today)) return;
    const latest = summary.dailyReports[0];
    setReportForm({
      date: today,
      mostImportant: "",
      todayTasks: latest?.todayTasks || "",
      waitingCases: latest?.waitingCases || "",
      todaySuccess: "",
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [summary?.dailyReports]);

  const visibleCases = cases.filter((c) => !c.hidden);
  const timeChargeCases = visibleCases.filter((c) => c.isTimeChargeCase);
  // v7 3.2：難易度点の編集・採点UIは、宮村のタブから開いた場合のみ（案件詳細から開いた場合はTaskEditModal側でtrue固定）
  const isFullEditContext = personName === "宮村";

  const issueInstruction = async () => {
    if (!instructionForm.content.trim()) return;
    try {
      await api.issueInstruction({
        caseId: instructionForm.caseId || undefined,
        assignee: instructionForm.assignee,
        content: instructionForm.content,
        dueDate: instructionForm.dueDate,
        points: instructionForm.points ? Number(instructionForm.points) : null,
      });
      setInstructionForm({ caseId: "", assignee: "尾崎", content: "", dueDate: plusDaysStr(7), points: "" });
      load();
    } catch (e) {
      onError(e instanceof Error ? e.message : "指示の送信に失敗しました");
    }
  };

  const applyTimeAndRecalc = (field: "startTime" | "endTime", raw: string) => {
    const normalized = normalizeTimeInput(raw);
    setTimeChargeForm((prev) => {
      const next = { ...prev, [field]: normalized };
      const computed = calcHoursFromTimes(next.startTime, next.endTime);
      return computed ? { ...next, hours: computed } : next;
    });
  };

  const addTimeCharge = async () => {
    if (!timeChargeForm.caseId || !timeChargeForm.hours) return;
    try {
      await api.addTimeCharge({
        date: timeChargeForm.date,
        caseId: timeChargeForm.caseId,
        startTime: timeChargeForm.startTime,
        endTime: timeChargeForm.endTime,
        hours: Number(timeChargeForm.hours),
        content: timeChargeForm.content,
      });
      setTimeChargeForm({ date: todayStr(), caseId: "", startTime: "", endTime: "", hours: "", content: "" });
      load();
    } catch (e) {
      onError(e instanceof Error ? e.message : "タイムチャージの登録に失敗しました");
    }
  };
  const removeTimeCharge = async (id: string) => {
    try {
      await api.deleteTimeCharge(id);
      load();
    } catch (e) {
      onError(e instanceof Error ? e.message : "削除に失敗しました");
    }
  };

  const reportHasContent = [reportForm.mostImportant, reportForm.todayTasks, reportForm.waitingCases, reportForm.todaySuccess].some((v) => v.trim());
  const addReport = async () => {
    if (!reportHasContent) return;
    try {
      await api.addDailyReport(reportForm);
      load();
    } catch (e) {
      onError(e instanceof Error ? e.message : "日報の登録に失敗しました");
    }
  };
  const removeReport = async (id: string) => {
    try {
      await api.deleteDailyReport(id);
      load();
    } catch (e) {
      onError(e instanceof Error ? e.message : "削除に失敗しました");
    }
  };

  const handleReorderDrop = async (list: PersonalTask[], targetId: string) => {
    if (!draggedTaskId || draggedTaskId === targetId) return;
    const fromIdx = list.findIndex((x) => x.id === draggedTaskId);
    const toIdx = list.findIndex((x) => x.id === targetId);
    setDraggedTaskId(null);
    if (fromIdx === -1 || toIdx === -1) return;
    const reordered = [...list];
    const [moved] = reordered.splice(fromIdx, 1);
    reordered.splice(toIdx, 0, moved);
    try {
      await api.reorderTasks(reordered.map((t) => t.id));
      load();
    } catch (e) {
      onError(e instanceof Error ? e.message : "並び替えに失敗しました");
    }
  };

  if (!summary) return null;

  const renderTaskRow = (t: PersonalTask, list: PersonalTask[]) => {
    const awaitingScore = isFullEditContext && !!t.handedBackFrom && t.status !== "完了";
    return (
      <button
        key={t.id}
        onClick={() => setEditingTask(t)}
        draggable
        onDragStart={(e) => { e.stopPropagation(); setDraggedTaskId(t.id); }}
        onDragOver={(e) => e.preventDefault()}
        onDrop={(e) => { e.preventDefault(); handleReorderDrop(list, t.id); }}
        onDragEnd={() => setDraggedTaskId(null)}
        className="w-full text-left flex flex-col gap-2 text-sm p-2.5 rounded transition hover:opacity-90"
        style={{ backgroundColor: COLORS.paper, opacity: draggedTaskId === t.id ? 0.4 : 1, cursor: "grab" }}
      >
        <div>
          <p>{t.description}</p>
          <p className="text-xs mt-0.5" style={{ color: COLORS.slate }}>{t.case.title}（No. {t.case.caseNumber}）</p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          {t.points != null && <span className="text-xs" style={{ color: COLORS.amber }}>{t.points}点</span>}
          {t.dueDate && (
            <span className="text-xs flex items-center gap-1" style={{ color: t.dueDate < todayStr() ? COLORS.vermillion : COLORS.slate }}>
              <Calendar size={11} /> {formatDateShort(t.dueDate)}まで
            </span>
          )}
          {awaitingScore && <span className="text-xs font-bold ml-auto" style={{ color: COLORS.amber }}>採点待ち</span>}
        </div>
      </button>
    );
  };

  return (
    <div className="flex-1 overflow-y-auto p-6">
      <div className="max-w-2xl mx-auto flex flex-col gap-5">
        <div>
          <h2 className="text-lg mb-1" style={{ fontFamily: FONT_MINCHO, color: COLORS.navy }}>{personName}</h2>
          <p className="text-xs" style={{ color: COLORS.slate }}>
            {personName === "宮村"
              ? "未完了のタスクのうち、宮村さんに割り当てられているもの、および誰にも割り当てられていないものを表示しています。行をクリックすると編集できます（ドラッグで並び替え可）。"
              : "あなたに割り当てられている未完了のタスクを表示しています。行をクリックすると編集できます（ドラッグで並び替え可）。"}
          </p>
        </div>

        {isAdmin && personName === "宮村" && (
          <div className="rounded p-5" style={{ backgroundColor: COLORS.card, border: `1px solid ${COLORS.brassLight}` }}>
            <h3 className="text-sm font-bold mb-3 flex items-center gap-1.5" style={{ fontFamily: FONT_MINCHO, color: COLORS.navy }}><Send size={15} /> 指示を出す</h3>
            <div className="flex flex-col gap-2">
              <select value={instructionForm.caseId} onChange={(e) => setInstructionForm({ ...instructionForm, caseId: e.target.value })} className="text-sm p-2 rounded outline-none" style={{ border: `1px solid ${COLORS.brassLight}` }}>
                <option value="">案件未選択（{instructionForm.assignee}の「とりあえず案件」へ）</option>
                {visibleCases.map((c) => <option key={c.id} value={c.id}>No.{c.caseNumber}　{c.title}</option>)}
              </select>
              <div className="flex gap-2">
                {["尾崎", "岩下"].map((name) => (
                  <button key={name} onClick={() => setInstructionForm({ ...instructionForm, assignee: name })} className="text-xs font-bold px-3 py-1.5 rounded-full" style={{ backgroundColor: instructionForm.assignee === name ? COLORS.navy : "transparent", color: instructionForm.assignee === name ? "#fff" : COLORS.navy, border: `1px solid ${COLORS.navy}` }}>{name}</button>
                ))}
              </div>
              <TextInput type="text" placeholder="指示内容" value={instructionForm.content} onChange={(e) => setInstructionForm({ ...instructionForm, content: e.target.value })} />
              <div className="flex gap-2">
                <TextInput type="date" value={instructionForm.dueDate} onChange={(e) => setInstructionForm({ ...instructionForm, dueDate: e.target.value })} />
                <select value={instructionForm.points} onChange={(e) => setInstructionForm({ ...instructionForm, points: e.target.value })} className="text-sm p-2 rounded outline-none flex-1" style={{ border: `1px solid ${COLORS.brassLight}` }}>
                  <option value="">難易度点（任意）</option>
                  {TASK_POINT_OPTIONS.map((p) => <option key={p} value={p}>{p}点</option>)}
                </select>
              </div>
              <button onClick={issueInstruction} disabled={!instructionForm.content.trim()} className="self-end text-sm font-bold px-4 py-2 rounded disabled:opacity-40" style={{ backgroundColor: COLORS.vermillion, color: "#fff" }}>指示を送信</button>
            </div>
            {summary.instructions.length > 0 && (
              <div className="mt-4 pt-3 flex flex-col gap-2" style={{ borderTop: `1px solid ${COLORS.brassLight}` }}>
                <p className="text-xs font-bold" style={{ color: COLORS.slate }}>これまでの指示</p>
                {summary.instructions.map((t) => (
                  <button key={t.id} onClick={() => onOpenCase(t.case.id)} className="text-left text-xs p-2 rounded" style={{ backgroundColor: COLORS.paper }}>
                    {t.assignee}へ：{t.description}（{t.case.title}）　<span className="font-bold">{t.status}</span>
                  </button>
                ))}
              </div>
            )}
          </div>
        )}

        <div className="rounded p-5" style={{ backgroundColor: COLORS.card, border: `1px solid ${COLORS.brassLight}` }}>
          <h3 className="text-sm font-bold mb-3 flex items-center gap-1.5" style={{ fontFamily: FONT_MINCHO, color: COLORS.navy }}><ClipboardList size={15} /> タスク（{summary.tasks.length}）</h3>
          <div className="flex flex-col gap-2">
            {summary.tasks.length === 0 ? <p className="text-sm" style={{ color: COLORS.slate }}>未完了のタスクはありません。</p> : summary.tasks.map((t) => renderTaskRow(t, summary.tasks))}
          </div>
        </div>

        <div className="rounded p-5" style={{ backgroundColor: COLORS.card, border: `1px solid ${COLORS.brassLight}` }}>
          <h3 className="text-sm font-bold mb-3" style={{ fontFamily: FONT_MINCHO, color: COLORS.navy }}>待ちタスク（{summary.waiting.length}）</h3>
          <div className="flex flex-col gap-2">
            {summary.waiting.length === 0 ? <p className="text-sm" style={{ color: COLORS.slate }}>待ちタスクはありません。</p> : summary.waiting.map((t) => renderTaskRow(t, summary.waiting))}
          </div>
        </div>

        <div className="rounded p-5" style={{ backgroundColor: COLORS.card, border: `1px solid ${COLORS.brassLight}` }}>
          <h3 className="text-sm font-bold mb-3" style={{ fontFamily: FONT_MINCHO, color: COLORS.navy }}>確認待ち（{summary.confirmations.length}）</h3>
          <div className="flex flex-col gap-2">
            {summary.confirmations.length === 0 ? <p className="text-sm" style={{ color: COLORS.slate }}>確認待ちのタスクはありません。</p> : summary.confirmations.map((t) => renderTaskRow(t, summary.confirmations))}
          </div>
        </div>

        <div className="rounded p-5" style={{ backgroundColor: COLORS.card, border: `1px solid ${COLORS.brassLight}` }}>
          <h3 className="text-sm font-bold mb-3 flex items-center gap-1.5" style={{ fontFamily: FONT_MINCHO, color: COLORS.navy }}><Clock size={15} /> タイムチャージ</h3>
          <div className="flex flex-col sm:flex-row flex-wrap gap-2 mb-3">
            <TextInput type="date" value={timeChargeForm.date} onChange={(e) => setTimeChargeForm({ ...timeChargeForm, date: e.target.value })} />
            <select value={timeChargeForm.caseId} onChange={(e) => setTimeChargeForm({ ...timeChargeForm, caseId: e.target.value })} className="text-sm p-2 rounded outline-none flex-1" style={{ border: `1px solid ${COLORS.brassLight}` }}>
              <option value="">案件を選択</option>
              {timeChargeCases.map((c) => <option key={c.id} value={c.id}>No.{c.caseNumber}　{c.title}</option>)}
            </select>
            <TextInput type="text" placeholder="開始（例：1004）" value={timeChargeForm.startTime} onChange={(e) => setTimeChargeForm({ ...timeChargeForm, startTime: e.target.value })} onBlur={(e) => applyTimeAndRecalc("startTime", e.target.value)} className="sm:w-28" />
            <TextInput type="text" placeholder="終了（例：1230）" value={timeChargeForm.endTime} onChange={(e) => setTimeChargeForm({ ...timeChargeForm, endTime: e.target.value })} onBlur={(e) => applyTimeAndRecalc("endTime", e.target.value)} className="sm:w-28" />
            <TextInput type="number" placeholder="時間" value={timeChargeForm.hours} onChange={(e) => setTimeChargeForm({ ...timeChargeForm, hours: e.target.value })} className="sm:w-24" />
            <button onClick={addTimeCharge} disabled={!timeChargeForm.caseId || !timeChargeForm.hours} className="text-sm font-bold px-3 rounded disabled:opacity-40" style={{ backgroundColor: COLORS.navy, color: "#fff" }}>追加</button>
          </div>
          {summary.timeCharges.length === 0 ? (
            <p className="text-sm" style={{ color: COLORS.slate }}>タイムチャージはありません。</p>
          ) : (
            <div className="flex flex-col gap-2">
              {summary.timeCharges.map((t) => (
                <div key={t.id} className="flex items-center justify-between gap-2 text-sm p-2 rounded" style={{ backgroundColor: COLORS.paper }}>
                  <div className="flex-1">
                    <span className="text-xs" style={{ color: COLORS.slate }}>{formatDateShort(t.date)}　</span>
                    {t.startTime && t.endTime && <span className="text-xs" style={{ color: COLORS.slate }}>{t.startTime}〜{t.endTime}　</span>}
                    <span className="font-bold">{t.hours}時間</span>
                    {t.billed && <span className="text-xs ml-2 px-1.5 py-0.5 rounded-full" style={{ backgroundColor: COLORS.moss, color: "#fff" }}>請求済み</span>}
                    <p className="text-xs" style={{ color: COLORS.slate }}>{t.case.title}　{t.content}</p>
                  </div>
                  <button onClick={() => removeTimeCharge(t.id)} className="text-xs" style={{ color: COLORS.slate }}>削除</button>
                </div>
              ))}
              <p className="text-xs font-bold text-right" style={{ color: COLORS.slate }}>合計：{summary.timeCharges.reduce((s, t) => s + t.hours, 0)}時間</p>
            </div>
          )}
        </div>

        {DAILY_REPORT_STAFF.includes(personName) && summary.dailyReports && (
          <div className="rounded p-5" style={{ backgroundColor: COLORS.card, border: `1px solid ${COLORS.brassLight}` }}>
            <h3 className="text-sm font-bold mb-3 flex items-center gap-1.5" style={{ fontFamily: FONT_MINCHO, color: COLORS.navy }}><User size={15} /> 日報</h3>
            {summary.dailyReports.some((r) => r.date === todayStr()) ? (
              <p className="text-xs mb-3" style={{ color: COLORS.slate }}>本日分は記録済みです。書き直す場合は下の一覧から削除してください。</p>
            ) : (
              <div className="flex flex-col gap-2 mb-3">
                <TextInput type="date" value={reportForm.date} onChange={(e) => setReportForm({ ...reportForm, date: e.target.value })} className="w-full sm:w-40" />
                <label className="text-xs" style={{ color: COLORS.slate }}>
                  本日一番大事なこと
                  <textarea value={reportForm.mostImportant} onChange={(e) => setReportForm({ ...reportForm, mostImportant: e.target.value })} rows={2} className="mt-1 w-full text-sm p-2 rounded outline-none resize-none" style={{ border: `1px solid ${COLORS.brassLight}` }} />
                </label>
                <label className="text-xs" style={{ color: COLORS.slate }}>
                  本日やること
                  <textarea value={reportForm.todayTasks} onChange={(e) => setReportForm({ ...reportForm, todayTasks: e.target.value })} rows={3} className="mt-1 w-full text-sm p-2 rounded outline-none resize-none" style={{ border: `1px solid ${COLORS.brassLight}` }} />
                </label>
                <label className="text-xs" style={{ color: COLORS.slate }}>
                  待ち案件
                  <textarea value={reportForm.waitingCases} onChange={(e) => setReportForm({ ...reportForm, waitingCases: e.target.value })} rows={3} className="mt-1 w-full text-sm p-2 rounded outline-none resize-none" style={{ border: `1px solid ${COLORS.brassLight}` }} />
                </label>
                <label className="text-xs" style={{ color: COLORS.slate }}>
                  今日の成功
                  <textarea value={reportForm.todaySuccess} onChange={(e) => setReportForm({ ...reportForm, todaySuccess: e.target.value })} rows={2} className="mt-1 w-full text-sm p-2 rounded outline-none resize-none" style={{ border: `1px solid ${COLORS.brassLight}` }} />
                </label>
                <button onClick={addReport} disabled={!reportHasContent} className="self-end text-sm font-bold px-4 py-2 rounded disabled:opacity-40" style={{ backgroundColor: COLORS.navy, color: "#fff" }}>記録する</button>
              </div>
            )}
            <div className="flex flex-col gap-2">
              {summary.dailyReports.map((r) => (
                <div key={r.id} className="flex items-start justify-between gap-2 text-sm p-2 rounded" style={{ backgroundColor: COLORS.paper }}>
                  <div className="flex flex-col gap-1">
                    <p className="text-xs" style={{ color: COLORS.slate }}>{formatDateTime(r.createdAt)}</p>
                    {r.mostImportant && <p><span className="text-xs font-bold" style={{ color: COLORS.slate }}>本日一番大事なこと：</span>{r.mostImportant}</p>}
                    {r.todayTasks && <p className="whitespace-pre-wrap"><span className="text-xs font-bold" style={{ color: COLORS.slate }}>本日やること：</span>{r.todayTasks}</p>}
                    {r.waitingCases && <p className="whitespace-pre-wrap"><span className="text-xs font-bold" style={{ color: COLORS.slate }}>待ち案件：</span>{r.waitingCases}</p>}
                    {r.todaySuccess && <p className="whitespace-pre-wrap"><span className="text-xs font-bold" style={{ color: COLORS.slate }}>今日の成功：</span>{r.todaySuccess}</p>}
                  </div>
                  <button onClick={() => removeReport(r.id)} className="text-xs flex-shrink-0" style={{ color: COLORS.slate }}>削除</button>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {editingTask && (
        <TaskEditModal
          task={editingTask}
          cases={visibleCases}
          isFullEditContext={isFullEditContext}
          onClose={() => setEditingTask(null)}
          onOpenCase={(id) => {
            setEditingTask(null);
            onOpenCase(id);
          }}
          onSaved={(updated, info) => {
            onTaskSaved(updated, info.movedFrom);
            if (info.redirectToPerson) {
              onNavigateToPerson(info.redirectToPerson);
            } else {
              load();
            }
          }}
          onError={onError}
        />
      )}
    </div>
  );
}
