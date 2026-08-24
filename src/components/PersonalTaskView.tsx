"use client";

import { useEffect, useState } from "react";
import { User, Clock } from "lucide-react";
import { COLORS, FONT_MINCHO, DAILY_REPORT_STAFF } from "@/lib/constants";
import { formatDateShort, formatDateTime, todayStr } from "@/lib/dates";
import { normalizeTimeInput, calcHoursFromTimes } from "@/lib/business/timecharge";
import { TextInput } from "@/components/ui";
import * as api from "@/lib/api-client";
import type { PersonalSummary } from "@/lib/api-client";
import type { Case } from "@/lib/types";

/** 自分のタイムチャージを案件ごとに集計する（個人画面の内訳表示、v8 3.4）。 */
function caseBreakdown(timeCharges: PersonalSummary["timeCharges"]) {
  const byCase = new Map<string, { caseId: string; title: string; caseNumber: string; hours: number }>();
  for (const t of timeCharges) {
    const entry = byCase.get(t.case.id) || { caseId: t.case.id, title: t.case.title, caseNumber: t.case.caseNumber, hours: 0 };
    entry.hours += t.hours;
    byCase.set(t.case.id, entry);
  }
  return Array.from(byCase.values()).sort((a, b) => b.hours - a.hours);
}

interface Props {
  personName: string;
  cases: Case[];
  onError: (msg: string) => void;
}

export default function PersonalTaskView({ personName, cases, onError }: Props) {
  const [summary, setSummary] = useState<PersonalSummary | null>(null);
  const [timeChargeForm, setTimeChargeForm] = useState({ date: todayStr(), caseId: "", startTime: "", endTime: "", hours: "", content: "" });
  const [reportForm, setReportForm] = useState({ date: todayStr(), mostImportant: "", todayTasks: "", waitingCases: "", todaySuccess: "" });

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

  if (!summary) return null;

  return (
    <div className="flex-1 overflow-y-auto p-6">
      <div className="max-w-2xl mx-auto flex flex-col gap-5">
        <div>
          <h2 className="text-lg mb-1" style={{ fontFamily: FONT_MINCHO, color: COLORS.navy }}>{personName}</h2>
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
              <div className="flex flex-col gap-1 mt-1 pt-2" style={{ borderTop: `1px solid ${COLORS.brassLight}` }}>
                {caseBreakdown(summary.timeCharges).map((c) => (
                  <div key={c.caseId} className="flex items-center justify-between text-xs" style={{ color: COLORS.slate }}>
                    <span className="truncate">{c.title}（No.{c.caseNumber}）</span>
                    <span className="flex-shrink-0 ml-2">{c.hours}時間</span>
                  </div>
                ))}
              </div>
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
    </div>
  );
}
