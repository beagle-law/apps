"use client";

import { useEffect, useState } from "react";
import { User, Calendar, ClipboardList, Clock, Send } from "lucide-react";
import { COLORS, FONT_MINCHO, DAILY_REPORT_STAFF, TASK_POINT_OPTIONS } from "@/lib/constants";
import { formatDateShort, formatDateTime, todayStr } from "@/lib/dates";
import { TextInput } from "@/components/ui";
import * as api from "@/lib/api-client";
import type { PersonalSummary } from "@/lib/api-client";
import type { Case } from "@/lib/types";

interface Props {
  personName: string;
  isAdmin: boolean;
  cases: Case[];
  onOpenCase: (id: string) => void;
  onError: (msg: string) => void;
}

export default function PersonalTaskView({ personName, isAdmin, cases, onOpenCase, onError }: Props) {
  const [summary, setSummary] = useState<PersonalSummary | null>(null);
  const [instructionForm, setInstructionForm] = useState({ caseId: "", assignee: "尾崎", content: "", dueDate: "", points: "" });
  const [timeChargeForm, setTimeChargeForm] = useState({ date: todayStr(), caseId: "", hours: "", content: "" });
  const [reportForm, setReportForm] = useState({ date: todayStr(), content: "" });

  const load = () => {
    api.fetchPersonalSummary(personName).then(setSummary).catch((e) => onError(e instanceof Error ? e.message : "取得に失敗しました"));
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [personName]);

  const visibleCases = cases.filter((c) => !c.hidden);

  const cycleStatus = async (caseId: string, taskId: string, currentStatus: string) => {
    try {
      await api.patchTaskStatus(caseId, taskId, currentStatus === "未着手" ? "対応中" : currentStatus === "対応中" ? "完了" : "未着手");
      load();
    } catch (e) {
      onError(e instanceof Error ? e.message : "更新に失敗しました");
    }
  };
  const doFinish = async (caseId: string, taskId: string) => {
    try {
      await api.finishTask(caseId, taskId);
      load();
    } catch (e) {
      onError(e instanceof Error ? e.message : "更新に失敗しました");
    }
  };
  const doScore = async (caseId: string, taskId: string, score: number) => {
    try {
      await api.scoreTask(caseId, taskId, score);
      load();
    } catch (e) {
      onError(e instanceof Error ? e.message : "更新に失敗しました");
    }
  };

  const issueInstruction = async () => {
    if (!instructionForm.caseId || !instructionForm.content.trim()) return;
    try {
      await api.issueInstruction(instructionForm.caseId, {
        assignee: instructionForm.assignee,
        content: instructionForm.content,
        dueDate: instructionForm.dueDate,
        points: instructionForm.points ? Number(instructionForm.points) : null,
      });
      setInstructionForm({ caseId: "", assignee: "尾崎", content: "", dueDate: "", points: "" });
      load();
    } catch (e) {
      onError(e instanceof Error ? e.message : "指示の送信に失敗しました");
    }
  };

  const addTimeCharge = async () => {
    if (!timeChargeForm.caseId || !timeChargeForm.hours) return;
    try {
      await api.addTimeCharge({
        date: timeChargeForm.date,
        caseId: timeChargeForm.caseId,
        hours: Number(timeChargeForm.hours),
        content: timeChargeForm.content,
      });
      setTimeChargeForm({ date: todayStr(), caseId: "", hours: "", content: "" });
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

  const addReport = async () => {
    if (!reportForm.content.trim()) return;
    try {
      await api.addDailyReport(reportForm);
      setReportForm({ date: todayStr(), content: "" });
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

  if (!summary) return null;

  const renderTaskRow = (t: PersonalSummary["tasks"][number]) => (
    <div key={t.id} className="flex flex-col gap-2 text-sm p-2.5 rounded" style={{ backgroundColor: COLORS.paper }}>
      <button onClick={() => onOpenCase(t.case.id)} className="text-left">
        <p>{t.description}</p>
        <p className="text-xs mt-0.5" style={{ color: COLORS.slate }}>{t.case.title}（No. {t.case.caseNumber}）</p>
      </button>
      <div className="flex items-center gap-2 flex-wrap">
        {t.points != null && <span className="text-xs" style={{ color: COLORS.amber }}>{t.points}点</span>}
        {t.dueDate && (
          <span className="text-xs flex items-center gap-1" style={{ color: t.dueDate < todayStr() ? COLORS.vermillion : COLORS.slate }}>
            <Calendar size={11} /> {formatDateShort(t.dueDate)}まで
          </span>
        )}
        {t.handedBackFrom && t.status !== "完了" ? (
          <div className="flex items-center gap-1 ml-auto">
            {[1, 2, 3, 4, 5].map((score) => (
              <button key={score} onClick={() => doScore(t.case.id, t.id, score)} className="text-xs font-bold w-6 h-6 rounded-full" style={{ backgroundColor: COLORS.navy, color: "#fff" }}>{score}</button>
            ))}
          </div>
        ) : (
          <div className="flex items-center gap-2 ml-auto">
            <button onClick={() => cycleStatus(t.case.id, t.id, t.status)} className="text-xs font-bold px-2 py-1 rounded-full" style={{ backgroundColor: COLORS.slate, color: "#fff" }}>{t.status}</button>
            {t.status !== "完了" && (
              <button onClick={() => doFinish(t.case.id, t.id)} className="text-xs font-bold px-2 py-1 rounded-full" style={{ backgroundColor: COLORS.moss, color: "#fff" }}>終了</button>
            )}
          </div>
        )}
      </div>
    </div>
  );

  return (
    <div className="flex-1 overflow-y-auto p-6">
      <div className="max-w-2xl mx-auto flex flex-col gap-5">
        <div>
          <h2 className="text-lg mb-1" style={{ fontFamily: FONT_MINCHO, color: COLORS.navy }}>{personName}</h2>
          <p className="text-xs" style={{ color: COLORS.slate }}>
            {personName === "宮村"
              ? "未完了のタスクのうち、宮村さんに割り当てられているもの、および誰にも割り当てられていないものを表示しています。"
              : "あなたに割り当てられている未完了のタスクを表示しています。"}
          </p>
        </div>

        {isAdmin && personName === "宮村" && (
          <div className="rounded p-5" style={{ backgroundColor: COLORS.card, border: `1px solid ${COLORS.brassLight}` }}>
            <h3 className="text-sm font-bold mb-3 flex items-center gap-1.5" style={{ fontFamily: FONT_MINCHO, color: COLORS.navy }}><Send size={15} /> 指示を出す</h3>
            <div className="flex flex-col gap-2">
              <select value={instructionForm.caseId} onChange={(e) => setInstructionForm({ ...instructionForm, caseId: e.target.value })} className="text-sm p-2 rounded outline-none" style={{ border: `1px solid ${COLORS.brassLight}` }}>
                <option value="">案件を選択</option>
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
                  {TASK_POINT_OPTIONS.map((o) => <option key={o.points} value={o.points}>{o.points}点（{o.level}）</option>)}
                </select>
              </div>
              <button onClick={issueInstruction} disabled={!instructionForm.caseId || !instructionForm.content.trim()} className="self-end text-sm font-bold px-4 py-2 rounded disabled:opacity-40" style={{ backgroundColor: COLORS.vermillion, color: "#fff" }}>指示を送信</button>
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
            {summary.tasks.length === 0 ? <p className="text-sm" style={{ color: COLORS.slate }}>未完了のタスクはありません。</p> : summary.tasks.map(renderTaskRow)}
          </div>
        </div>

        <div className="rounded p-5" style={{ backgroundColor: COLORS.card, border: `1px solid ${COLORS.brassLight}` }}>
          <h3 className="text-sm font-bold mb-3" style={{ fontFamily: FONT_MINCHO, color: COLORS.navy }}>待ちタスク（{summary.waiting.length}）</h3>
          <div className="flex flex-col gap-2">
            {summary.waiting.length === 0 ? <p className="text-sm" style={{ color: COLORS.slate }}>待ちタスクはありません。</p> : summary.waiting.map(renderTaskRow)}
          </div>
        </div>

        <div className="rounded p-5" style={{ backgroundColor: COLORS.card, border: `1px solid ${COLORS.brassLight}` }}>
          <h3 className="text-sm font-bold mb-3" style={{ fontFamily: FONT_MINCHO, color: COLORS.navy }}>確認待ち（{summary.confirmations.length}）</h3>
          <div className="flex flex-col gap-2">
            {summary.confirmations.length === 0 ? <p className="text-sm" style={{ color: COLORS.slate }}>確認待ちのタスクはありません。</p> : summary.confirmations.map(renderTaskRow)}
          </div>
        </div>

        <div className="rounded p-5" style={{ backgroundColor: COLORS.card, border: `1px solid ${COLORS.brassLight}` }}>
          <h3 className="text-sm font-bold mb-3 flex items-center gap-1.5" style={{ fontFamily: FONT_MINCHO, color: COLORS.navy }}><Clock size={15} /> タイムチャージ</h3>
          <div className="flex flex-col sm:flex-row gap-2 mb-3">
            <TextInput type="date" value={timeChargeForm.date} onChange={(e) => setTimeChargeForm({ ...timeChargeForm, date: e.target.value })} />
            <select value={timeChargeForm.caseId} onChange={(e) => setTimeChargeForm({ ...timeChargeForm, caseId: e.target.value })} className="text-sm p-2 rounded outline-none flex-1" style={{ border: `1px solid ${COLORS.brassLight}` }}>
              <option value="">案件を選択</option>
              {visibleCases.map((c) => <option key={c.id} value={c.id}>No.{c.caseNumber}　{c.title}</option>)}
            </select>
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
            <div className="flex flex-col gap-2 mb-3">
              <TextInput type="date" value={reportForm.date} onChange={(e) => setReportForm({ ...reportForm, date: e.target.value })} className="w-full sm:w-40" />
              <textarea value={reportForm.content} onChange={(e) => setReportForm({ ...reportForm, content: e.target.value })} rows={3} placeholder="本日の業務内容..." className="text-sm p-2 rounded outline-none resize-none" style={{ border: `1px solid ${COLORS.brassLight}` }} />
              <button onClick={addReport} disabled={!reportForm.content.trim()} className="self-end text-sm font-bold px-4 py-2 rounded disabled:opacity-40" style={{ backgroundColor: COLORS.navy, color: "#fff" }}>記録する</button>
            </div>
            <div className="flex flex-col gap-2">
              {summary.dailyReports.map((r) => (
                <div key={r.id} className="flex items-start justify-between gap-2 text-sm p-2 rounded" style={{ backgroundColor: COLORS.paper }}>
                  <div>
                    <p className="text-xs" style={{ color: COLORS.slate }}>{formatDateTime(r.createdAt)}</p>
                    <p className="whitespace-pre-wrap">{r.content}</p>
                  </div>
                  <button onClick={() => removeReport(r.id)} className="text-xs flex-shrink-0" style={{ color: COLORS.slate }}>削除</button>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
