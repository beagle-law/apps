"use client";

import { useEffect, useState } from "react";
import { User, Clock } from "lucide-react";
import { COLORS, FONT_MINCHO, DAILY_REPORT_STAFF, GOAL_KEYS } from "@/lib/constants";
import { formatDate, formatDateShort, todayStr, currentYearMonth } from "@/lib/dates";
import { normalizeTimeInput, calcHoursFromTimes } from "@/lib/business/timecharge";
import { TextInput } from "@/components/ui";
import * as api from "@/lib/api-client";
import type { PersonalSummary } from "@/lib/api-client";
import type { Case, DailyReport } from "@/lib/types";

// 名前→目標画面のkeyの対応（v10 4.1：個人画面右上に本人（宮村は全社）の当月目標を表示）
const GOAL_KEY_BY_NAME: Record<string, string> = { 宮村: "company", 尾崎: "ozaki", 岩下: "iwashita" };

const COLOR_MORNING = "#E4EDF6"; // 出勤時に記入（薄い青系）
const COLOR_EVENING = "#F3ECDD"; // 退勤時に記入（薄い黄土色系）

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

interface ReportForm {
  id: string | null;
  date: string;
  mostImportant: string;
  todayTasks: string;
  waitingCases: string;
  workHours: string;
  todaySuccess: string;
}

function emptyReportForm(date: string): ReportForm {
  return { id: null, date, mostImportant: "", todayTasks: "", waitingCases: "", workHours: "", todaySuccess: "" };
}

interface Props {
  personName: string;
  cases: Case[];
  onError: (msg: string) => void;
}

export default function PersonalTaskView({ personName, cases, onError }: Props) {
  const [summary, setSummary] = useState<PersonalSummary | null>(null);
  const [timeChargeForm, setTimeChargeForm] = useState({ date: todayStr(), caseId: "", startTime: "", endTime: "", hours: "", content: "" });
  const [reportForm, setReportForm] = useState<ReportForm>(emptyReportForm(todayStr()));
  const [monthlyGoalPercent, setMonthlyGoalPercent] = useState<string>("");
  const [historyYear, setHistoryYear] = useState(String(new Date().getFullYear()));
  const [historyMonth, setHistoryMonth] = useState(String(new Date().getMonth() + 1).padStart(2, "0"));

  // v11 3.2：日付に一致する既存の日報があればそれを読み込み、なければ新規（本日のみ前回から引き継ぎ）
  const loadFormForDate = (date: string, reports: DailyReport[]) => {
    const existing = reports.find((r) => r.date === date);
    if (existing) {
      setReportForm({
        id: existing.id,
        date,
        mostImportant: existing.mostImportant,
        todayTasks: existing.todayTasks,
        waitingCases: existing.waitingCases,
        workHours: existing.workHours,
        todaySuccess: existing.todaySuccess,
      });
      return;
    }
    const carryOver = date === todayStr();
    const latest = reports[0];
    setReportForm({
      ...emptyReportForm(date),
      todayTasks: carryOver ? latest?.todayTasks || "" : "",
      waitingCases: carryOver ? latest?.waitingCases || "" : "",
    });
  };

  const refreshSummary = () => api.fetchPersonalSummary(personName).then((res) => {
    setSummary(res);
    return res;
  });

  useEffect(() => {
    let cancelled = false;
    setSummary(null);
    api
      .fetchPersonalSummary(personName)
      .then((res) => {
        if (cancelled) return;
        setSummary(res);
        loadFormForDate(todayStr(), res.dailyReports || []);
      })
      .catch((e) => onError(e instanceof Error ? e.message : "取得に失敗しました"));
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [personName]);

  useEffect(() => {
    const goalKey = GOAL_KEY_BY_NAME[personName];
    if (!goalKey) {
      setMonthlyGoalPercent("");
      return;
    }
    api
      .ensureGoalRecord(goalKey, currentYearMonth())
      .then((r) => setMonthlyGoalPercent(r.overallPercent))
      .catch(() => setMonthlyGoalPercent(""));
  }, [personName]);

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
      refreshSummary();
    } catch (e) {
      onError(e instanceof Error ? e.message : "タイムチャージの登録に失敗しました");
    }
  };
  const removeTimeCharge = async (id: string) => {
    try {
      await api.deleteTimeCharge(id);
      refreshSummary();
    } catch (e) {
      onError(e instanceof Error ? e.message : "削除に失敗しました");
    }
  };

  const reportHasContent = [reportForm.mostImportant, reportForm.todayTasks, reportForm.waitingCases, reportForm.workHours, reportForm.todaySuccess].some((v) => v.trim());

  // v11 3.2：「記録を追加」「一時保存する」共通の保存処理。既存レコードがあればPATCH、なければPOSTして
  // 以後の保存が同じレコードを更新するようにidを覚えておく（一時保存を繰り返しても重複しない）。
  const saveReport = async (draft: boolean) => {
    if (!draft && !reportHasContent) return;
    try {
      if (reportForm.id) {
        const updated = await api.updateDailyReport(reportForm.id, {
          mostImportant: reportForm.mostImportant,
          todayTasks: reportForm.todayTasks,
          waitingCases: reportForm.waitingCases,
          workHours: reportForm.workHours,
          todaySuccess: reportForm.todaySuccess,
        });
        setSummary((prev) => (prev ? { ...prev, dailyReports: (prev.dailyReports || []).map((r) => (r.id === updated.id ? updated : r)) } : prev));
      } else {
        const created = await api.addDailyReport({ ...reportForm, draft });
        setReportForm((f) => ({ ...f, id: created.id }));
        setSummary((prev) => (prev ? { ...prev, dailyReports: [created, ...(prev.dailyReports || [])] } : prev));
      }
    } catch (e) {
      onError(e instanceof Error ? e.message : "保存に失敗しました");
    }
  };

  const removeReport = async (id: string) => {
    try {
      await api.deleteDailyReport(id);
      const res = await refreshSummary();
      if (id === reportForm.id) loadFormForDate(todayStr(), res.dailyReports || []);
    } catch (e) {
      onError(e instanceof Error ? e.message : "削除に失敗しました");
    }
  };

  const selectHistoryDate = (date: string) => {
    if (!summary?.dailyReports) return;
    loadFormForDate(date, summary.dailyReports);
  };

  if (!summary) return null;

  const filteredHistory = (summary.dailyReports || [])
    .filter((r) => r.date.startsWith(`${historyYear}-${historyMonth}`))
    .sort((a, b) => (a.date < b.date ? 1 : -1));
  const historyYears = Array.from(
    new Set((summary.dailyReports || []).map((r) => r.date.slice(0, 4)).concat(String(new Date().getFullYear())))
  ).sort((a, b) => b.localeCompare(a));

  return (
    <div className="flex-1 overflow-y-auto p-6">
      <div className="max-w-2xl mx-auto flex flex-col gap-5">
        <div className="flex items-center justify-between">
          <h2 className="text-lg mb-1" style={{ fontFamily: FONT_MINCHO, color: COLORS.navy }}>{personName}</h2>
          {monthlyGoalPercent && (
            <span className="text-xs" style={{ color: COLORS.slate }}>今月の目標達成率：{monthlyGoalPercent}%</span>
          )}
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

            <div className="flex flex-col gap-3 mb-4">
              {/* 出勤時に記入 */}
              <div className="rounded p-3 flex flex-col gap-2" style={{ backgroundColor: COLOR_MORNING }}>
                <p className="text-xs font-bold" style={{ color: COLORS.navy }}>出勤時に記入</p>
                <TextInput type="date" value={reportForm.date} onChange={(e) => setReportForm({ ...reportForm, date: e.target.value })} className="w-full sm:w-40" />
                <label className="text-xs" style={{ color: COLORS.slate }}>
                  本日一番大事なこと
                  <textarea value={reportForm.mostImportant} onChange={(e) => setReportForm({ ...reportForm, mostImportant: e.target.value })} rows={2} className="mt-1 w-full text-sm p-2 rounded outline-none resize-none" style={{ border: `1px solid ${COLORS.brassLight}` }} />
                </label>
                <label className="text-xs" style={{ color: COLORS.slate }}>
                  本日やること
                  <textarea value={reportForm.todayTasks} onChange={(e) => setReportForm({ ...reportForm, todayTasks: e.target.value })} rows={15} className="mt-1 w-full text-sm p-2 rounded outline-none resize-none" style={{ border: `1px solid ${COLORS.brassLight}` }} />
                </label>
                <label className="text-xs" style={{ color: COLORS.slate }}>
                  待ち案件
                  <textarea value={reportForm.waitingCases} onChange={(e) => setReportForm({ ...reportForm, waitingCases: e.target.value })} rows={7} className="mt-1 w-full text-sm p-2 rounded outline-none resize-none" style={{ border: `1px solid ${COLORS.brassLight}` }} />
                </label>
              </div>

              {/* 退勤時に記入 */}
              <div className="rounded p-3 flex flex-col gap-2" style={{ backgroundColor: COLOR_EVENING }}>
                <p className="text-xs font-bold" style={{ color: COLORS.navy }}>退勤時に記入</p>
                <label className="text-xs" style={{ color: COLORS.slate }}>
                  本日の業務時間・実績
                  <textarea value={reportForm.workHours} onChange={(e) => setReportForm({ ...reportForm, workHours: e.target.value })} rows={3} className="mt-1 w-full text-sm p-2 rounded outline-none resize-none" style={{ border: `1px solid ${COLORS.brassLight}` }} />
                </label>
                <label className="text-xs" style={{ color: COLORS.slate }}>
                  本日の成功
                  <textarea value={reportForm.todaySuccess} onChange={(e) => setReportForm({ ...reportForm, todaySuccess: e.target.value })} rows={2} className="mt-1 w-full text-sm p-2 rounded outline-none resize-none" style={{ border: `1px solid ${COLORS.brassLight}` }} />
                </label>
              </div>

              <div className="flex flex-col items-end gap-1.5">
                <button onClick={() => saveReport(false)} disabled={!reportHasContent} className="text-sm font-bold px-4 py-2 rounded disabled:opacity-40" style={{ backgroundColor: COLORS.navy, color: "#fff" }}>
                  {reportForm.id ? "更新する" : "記録を追加"}
                </button>
                <button onClick={() => saveReport(true)} className="text-xs font-bold px-3 py-1.5 rounded" style={{ border: `1px solid ${COLORS.brassLight}`, color: COLORS.slate }}>一時保存する</button>
              </div>
            </div>

            <div className="flex items-center gap-2 mb-2 pt-3" style={{ borderTop: `1px solid ${COLORS.brassLight}` }}>
              <p className="text-xs font-bold" style={{ color: COLORS.slate }}>過去の記録</p>
              <select value={historyYear} onChange={(e) => setHistoryYear(e.target.value)} className="text-xs p-1 rounded outline-none" style={{ border: `1px solid ${COLORS.brassLight}` }}>
                {historyYears.map((y) => <option key={y} value={y}>{y}年</option>)}
              </select>
              <select value={historyMonth} onChange={(e) => setHistoryMonth(e.target.value)} className="text-xs p-1 rounded outline-none" style={{ border: `1px solid ${COLORS.brassLight}` }}>
                {Array.from({ length: 12 }, (_, i) => String(i + 1).padStart(2, "0")).map((m) => (
                  <option key={m} value={m}>{Number(m)}月</option>
                ))}
              </select>
            </div>
            {filteredHistory.length === 0 ? (
              <p className="text-sm py-2" style={{ color: COLORS.slate }}>この年月の記録はありません。</p>
            ) : (
              <div className="flex flex-col gap-1">
                {filteredHistory.map((r) => (
                  <div
                    key={r.id}
                    onClick={() => selectHistoryDate(r.date)}
                    className="flex items-center justify-between gap-2 text-sm px-2.5 py-1.5 rounded cursor-pointer hover:opacity-80"
                    style={{ backgroundColor: r.id === reportForm.id ? COLORS.paper : "transparent", border: `1px solid ${r.id === reportForm.id ? COLORS.navy : COLORS.brassLight}` }}
                  >
                    <span>{formatDate(r.date)}</span>
                    <button onClick={(e) => { e.stopPropagation(); removeReport(r.id); }} className="text-xs flex-shrink-0" style={{ color: COLORS.slate }}>削除</button>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
