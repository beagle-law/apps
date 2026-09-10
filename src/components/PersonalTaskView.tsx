"use client";

import { useEffect, useState } from "react";
import { User, Clock, ChevronLeft, ChevronRight, Download } from "lucide-react";
import { COLORS, FONT_MINCHO, DAILY_REPORT_STAFF, GOAL_KEYS } from "@/lib/constants";
import { formatDate, formatDateShort, todayStr, currentYearMonth, shiftDateStr, formatYearMonth } from "@/lib/dates";
import { normalizeTimeInput, calcHoursFromTimes } from "@/lib/business/timecharge";
import { calcWorkedHoursWithLeave } from "@/lib/business/attendance";
import { isLeaveEligible, computeLeaveBalance } from "@/lib/business/paidLeave";
import { TextInput } from "@/components/ui";
import UpcomingHearingsView from "@/components/UpcomingHearingsView";
import * as api from "@/lib/api-client";
import type { PersonalSummary } from "@/lib/api-client";
import type { Case, DailyReport, AttendanceRecord } from "@/lib/types";

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
  remainingTasks: string;
  todaySuccess: string;
}

function emptyReportForm(date: string): ReportForm {
  return { id: null, date, mostImportant: "", todayTasks: "", waitingCases: "", workHours: "", remainingTasks: "", todaySuccess: "" };
}

interface Props {
  personName: string;
  cases: Case[];
  onError: (msg: string) => void;
  onOpenCase: (id: string) => void;
}

export default function PersonalTaskView({ personName, cases, onError, onOpenCase }: Props) {
  const [summary, setSummary] = useState<PersonalSummary | null>(null);
  const [timeChargeForm, setTimeChargeForm] = useState({ date: todayStr(), caseId: "", startTime: "", endTime: "", hours: "", content: "" });
  const [reportForm, setReportForm] = useState<ReportForm>(emptyReportForm(todayStr()));
  const [monthlyGoalPercent, setMonthlyGoalPercent] = useState<string>("");
  const [historyYear, setHistoryYear] = useState(String(new Date().getFullYear()));
  const [historyMonth, setHistoryMonth] = useState(String(new Date().getMonth() + 1).padStart(2, "0"));
  const [expandedReportId, setExpandedReportId] = useState<string | null>(null);
  const [monthAttendance, setMonthAttendance] = useState<AttendanceRecord[]>([]);
  const [allAttendance, setAllAttendance] = useState<AttendanceRecord[]>([]);
  const [attendanceDraft, setAttendanceDraft] = useState({ clockIn: "", clockOut: "", breakStart: "", breakEnd: "", leaveType: "" });
  const [savingAttendance, setSavingAttendance] = useState(false);
  const [exportingAttendance, setExportingAttendance] = useState(false);
  const [exportMonth, setExportMonth] = useState(currentYearMonth());

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
        remainingTasks: existing.remainingTasks,
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

  // v14：勤怠。表示中の日付が属する月の記録をまとめて取得し、当日分の入力欄に反映する。
  const attendanceMonth = reportForm.date.slice(0, 7);
  useEffect(() => {
    let cancelled = false;
    api
      .fetchAttendance(personName, attendanceMonth)
      .then((records) => {
        if (!cancelled) setMonthAttendance(records);
      })
      .catch(() => {
        if (!cancelled) setMonthAttendance([]);
      });
    return () => {
      cancelled = true;
    };
  }, [personName, attendanceMonth]);

  // v15：有給残日数の算出には全期間の有給取得履歴が必要なため、対象者（尾崎・岩下）のみ月指定なしで全件取得する。
  useEffect(() => {
    if (!isLeaveEligible(personName)) {
      setAllAttendance([]);
      return;
    }
    let cancelled = false;
    api
      .fetchAttendance(personName)
      .then((records) => {
        if (!cancelled) setAllAttendance(records);
      })
      .catch(() => {
        if (!cancelled) setAllAttendance([]);
      });
    return () => {
      cancelled = true;
    };
  }, [personName, monthAttendance]);

  useEffect(() => {
    const existing = monthAttendance.find((r) => r.date === reportForm.date);
    setAttendanceDraft({
      clockIn: existing?.clockIn || "",
      clockOut: existing?.clockOut || "",
      breakStart: existing?.breakStart || "",
      breakEnd: existing?.breakEnd || "",
      leaveType: existing?.leaveType || "",
    });
  }, [reportForm.date, monthAttendance]);

  const applyAttendanceTime = (field: "clockIn" | "clockOut" | "breakStart" | "breakEnd", raw: string) => {
    setAttendanceDraft((prev) => ({ ...prev, [field]: normalizeTimeInput(raw) }));
  };

  const saveAttendanceRecord = async () => {
    // onBlurでの整形前にボタンを押した場合に備え、保存直前にも念のため半角化・整形する。
    const normalized = {
      clockIn: normalizeTimeInput(attendanceDraft.clockIn),
      clockOut: normalizeTimeInput(attendanceDraft.clockOut),
      breakStart: normalizeTimeInput(attendanceDraft.breakStart),
      breakEnd: normalizeTimeInput(attendanceDraft.breakEnd),
      leaveType: attendanceDraft.leaveType,
    };
    setAttendanceDraft(normalized);
    setSavingAttendance(true);
    try {
      const saved = await api.saveAttendance(personName, { date: reportForm.date, ...normalized });
      setMonthAttendance((prev) => {
        const idx = prev.findIndex((r) => r.date === saved.date);
        if (idx === -1) return [...prev, saved].sort((a, b) => (a.date < b.date ? -1 : 1));
        return prev.map((r, i) => (i === idx ? saved : r));
      });
    } catch (e) {
      onError(e instanceof Error ? e.message : "勤怠の保存に失敗しました");
    } finally {
      setSavingAttendance(false);
    }
  };

  const leaveBalance = isLeaveEligible(personName)
    ? computeLeaveBalance(
        personName,
        allAttendance.filter((r) => r.leaveType).map((r) => ({ date: r.date, days: r.leaveType === "full" ? 1 : 0.5 })),
        todayStr()
      )
    : null;

  // xlsxはサイズが大きいため、アプリ起動時の読み込みを軽くする目的で使用時にのみ読み込む。
  const WEEKDAY_LABELS = ["日", "月", "火", "水", "木", "金", "土"];
  const LEAVE_LABEL: Record<string, string> = { full: "全日", half: "半日" };

  // v15：Googleスプレッドシートの勤怠台帳（日付・所定労働時間・実労働時間・差・交通費実費等・備考）に
  // 揃えた形式で出力する。差は値ではなく数式で埋め、Excel上で所定/実績を直接編集しても再計算されるようにする。
  const exportMonthAttendance = async () => {
    setExportingAttendance(true);
    try {
      const [y, m] = exportMonth.split("-").map(Number);
      const lastDay = new Date(y, m, 0).getDate();
      const records = await api.fetchAttendance(personName, exportMonth);
      const recordByDate = new Map(records.map((r) => [r.date, r]));
      const XLSX = await import("xlsx");

      const rows: (string | number)[][] = [
        [`勤怠データ　${personName}　${formatYearMonth(exportMonth)}`],
        [],
        ["日付", "曜日", "所定労働時間(分)", "実労働時間(分)", "差(分)", "有給", "交通費・実費等", "備考"],
      ];
      const dataStartRow = rows.length + 1; // 1始まり・XLSXの行番号（この後に追加する最初のデータ行）
      for (let d = 1; d <= lastDay; d++) {
        const dateStr = `${exportMonth}-${String(d).padStart(2, "0")}`;
        const weekday = new Date(y, m - 1, d).getDay();
        const r = recordByDate.get(dateStr);
        const scheduled = weekday === 0 || weekday === 6 ? "" : 480;
        const workedHours = r ? calcWorkedHoursWithLeave(r.clockIn, r.clockOut, r.breakStart, r.breakEnd, r.leaveType) : "";
        const worked = workedHours ? Math.round(Number(workedHours) * 60) : "";
        rows.push([d, WEEKDAY_LABELS[weekday], scheduled, worked, "", r?.leaveType ? LEAVE_LABEL[r.leaveType] : "", "", ""]);
      }

      const ws = XLSX.utils.aoa_to_sheet(rows);
      for (let i = 0; i < lastDay; i++) {
        const row = dataStartRow + i;
        ws[`E${row}`] = { t: "n", f: `D${row}-C${row}` };
      }
      ws["!cols"] = [{ wch: 8 }, { wch: 6 }, { wch: 14 }, { wch: 14 }, { wch: 10 }, { wch: 8 }, { wch: 14 }, { wch: 16 }];
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, "勤怠");

      if (isLeaveEligible(personName)) {
        const monthEnd = `${exportMonth}-${String(lastDay).padStart(2, "0")}`;
        const allRecords = await api.fetchAttendance(personName);
        const usages = allRecords.filter((r) => r.leaveType).map((r) => ({ date: r.date, days: r.leaveType === "full" ? 1 : 0.5 }));
        const balance = computeLeaveBalance(personName, usages, monthEnd);
        const leaveRows: (string | number)[][] = [
          [`有給休暇残日数　${personName}　${formatYearMonth(exportMonth)}末時点`],
          [],
          ["付与日", "付与日数", "残日数", "失効日"],
          ...balance.grants.map((g) => [g.grantDate, g.days, g.remaining, g.expiresAt]),
          [],
          ["合計", "", balance.totalRemaining, ""],
        ];
        const leaveWs = XLSX.utils.aoa_to_sheet(leaveRows);
        leaveWs["!cols"] = [{ wch: 12 }, { wch: 10 }, { wch: 10 }, { wch: 12 }];
        XLSX.utils.book_append_sheet(wb, leaveWs, "有給残日数");
      }

      XLSX.writeFile(wb, `勤怠_${personName}_${exportMonth}.xlsx`);
    } catch (e) {
      onError(e instanceof Error ? e.message : "出力に失敗しました");
    } finally {
      setExportingAttendance(false);
    }
  };

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

  const reportHasContent = [reportForm.mostImportant, reportForm.todayTasks, reportForm.waitingCases, reportForm.workHours, reportForm.remainingTasks, reportForm.todaySuccess].some((v) => v.trim());

  // 日付に一致する既存の日報があればPATCH、なければPOSTして
  // 以後の保存が同じレコードを更新するようにidを覚えておく。
  const saveReport = async () => {
    if (!reportHasContent) return;
    try {
      if (reportForm.id) {
        const updated = await api.updateDailyReport(reportForm.id, {
          mostImportant: reportForm.mostImportant,
          todayTasks: reportForm.todayTasks,
          waitingCases: reportForm.waitingCases,
          workHours: reportForm.workHours,
          remainingTasks: reportForm.remainingTasks,
          todaySuccess: reportForm.todaySuccess,
        });
        setSummary((prev) => (prev ? { ...prev, dailyReports: (prev.dailyReports || []).map((r) => (r.id === updated.id ? updated : r)) } : prev));
      } else {
        const created = await api.addDailyReport(reportForm);
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

  const editHistoryDate = (date: string) => {
    if (!summary?.dailyReports) return;
    loadFormForDate(date, summary.dailyReports);
    setExpandedReportId(null);
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
      <div className="max-w-6xl mx-auto grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">
        <div>
          <UpcomingHearingsView cases={cases} onOpenCase={onOpenCase} />
        </div>
        <div className="flex flex-col gap-5">
        <div className="flex items-center justify-between">
          <h2 className="text-lg mb-1" style={{ fontFamily: FONT_MINCHO, color: COLORS.navy }}>{personName}</h2>
          {monthlyGoalPercent && (
            <span className="text-xs" style={{ color: COLORS.slate }}>今月の目標達成率：{monthlyGoalPercent}%</span>
          )}
        </div>

        {/* 勤怠（v14） */}
        <div className="rounded p-5" style={{ backgroundColor: COLORS.card, border: `1px solid ${COLORS.brassLight}` }}>
          <div className="flex items-center justify-between mb-3 flex-wrap gap-2">
            <h3 className="text-sm font-bold flex items-center gap-1.5" style={{ fontFamily: FONT_MINCHO, color: COLORS.navy }}><Clock size={15} /> 勤怠</h3>
            <div className="flex items-center gap-2">
              <TextInput type="month" value={exportMonth} onChange={(e) => setExportMonth(e.target.value)} className="w-36" />
              <button onClick={exportMonthAttendance} disabled={exportingAttendance} className="flex items-center gap-1 text-xs font-bold px-2.5 py-1.5 rounded disabled:opacity-40 flex-shrink-0" style={{ backgroundColor: COLORS.moss, color: "#fff" }}>
                <Download size={12} /> ダウンロード
              </button>
            </div>
          </div>

          {leaveBalance && (
            <div className="mb-3 p-3 rounded" style={{ backgroundColor: COLORS.paper, border: `1px solid ${COLORS.brassLight}` }}>
              <p className="text-sm font-bold mb-1.5">有給休暇残日数：{leaveBalance.totalRemaining}日</p>
              {leaveBalance.grants.length > 0 && (
                <div className="flex flex-col gap-0.5">
                  {leaveBalance.grants.map((g) => (
                    <p key={g.grantDate} className="text-xs" style={{ color: COLORS.slate }}>
                      {formatDate(g.grantDate)}付与（{g.days}日）：残{g.remaining}日（{formatDate(g.expiresAt)}失効）
                    </p>
                  ))}
                </div>
              )}
            </div>
          )}

          <div className="flex items-center gap-2 mb-3">
            <button type="button" onClick={() => loadFormForDate(shiftDateStr(reportForm.date, -1), summary.dailyReports || [])} style={{ color: COLORS.slate }} title="前日"><ChevronLeft size={16} /></button>
            <TextInput type="date" value={reportForm.date} onChange={(e) => loadFormForDate(e.target.value, summary.dailyReports || [])} className="w-40" />
            <button type="button" onClick={() => loadFormForDate(shiftDateStr(reportForm.date, 1), summary.dailyReports || [])} style={{ color: COLORS.slate }} title="翌日"><ChevronRight size={16} /></button>
            {reportForm.date !== todayStr() && (
              <button type="button" onClick={() => loadFormForDate(todayStr(), summary.dailyReports || [])} className="text-xs underline" style={{ color: COLORS.navy }}>
                本日に戻す
              </button>
            )}
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mb-3">
            <label className="text-xs" style={{ color: COLORS.slate }}>
              出勤
              <TextInput type="text" placeholder="例：900" value={attendanceDraft.clockIn} onChange={(e) => setAttendanceDraft({ ...attendanceDraft, clockIn: e.target.value })} onBlur={(e) => applyAttendanceTime("clockIn", e.target.value)} className="mt-1 w-full" />
            </label>
            <label className="text-xs" style={{ color: COLORS.slate }}>
              退勤
              <TextInput type="text" placeholder="例：1830" value={attendanceDraft.clockOut} onChange={(e) => setAttendanceDraft({ ...attendanceDraft, clockOut: e.target.value })} onBlur={(e) => applyAttendanceTime("clockOut", e.target.value)} className="mt-1 w-full" />
            </label>
            <label className="text-xs" style={{ color: COLORS.slate }}>
              休憩開始
              <TextInput type="text" placeholder="例：1200" value={attendanceDraft.breakStart} onChange={(e) => setAttendanceDraft({ ...attendanceDraft, breakStart: e.target.value })} onBlur={(e) => applyAttendanceTime("breakStart", e.target.value)} className="mt-1 w-full" />
            </label>
            <label className="text-xs" style={{ color: COLORS.slate }}>
              休憩終了
              <TextInput type="text" placeholder="例：1300" value={attendanceDraft.breakEnd} onChange={(e) => setAttendanceDraft({ ...attendanceDraft, breakEnd: e.target.value })} onBlur={(e) => applyAttendanceTime("breakEnd", e.target.value)} className="mt-1 w-full" />
            </label>
          </div>
          {isLeaveEligible(personName) && (
            <div className="flex items-center gap-3 mb-3">
              <label className="flex items-center gap-1.5 text-xs" style={{ color: COLORS.ink }}>
                <input
                  type="checkbox"
                  checked={!!attendanceDraft.leaveType}
                  onChange={(e) => setAttendanceDraft({ ...attendanceDraft, leaveType: e.target.checked ? "full" : "" })}
                />
                有給を取得する
              </label>
              {attendanceDraft.leaveType && (
                <select
                  value={attendanceDraft.leaveType}
                  onChange={(e) => setAttendanceDraft({ ...attendanceDraft, leaveType: e.target.value })}
                  className="text-xs p-1.5 rounded outline-none"
                  style={{ border: `1px solid ${COLORS.brassLight}` }}
                >
                  <option value="full">全日</option>
                  <option value="half">半日</option>
                </select>
              )}
            </div>
          )}
          <div className="flex items-center justify-between flex-wrap gap-2">
            {(() => {
              const worked = calcWorkedHoursWithLeave(attendanceDraft.clockIn, attendanceDraft.clockOut, attendanceDraft.breakStart, attendanceDraft.breakEnd, attendanceDraft.leaveType);
              return worked ? (
                <p className="text-sm font-bold">稼働時間：{worked}時間{attendanceDraft.leaveType && `（有給${LEAVE_LABEL[attendanceDraft.leaveType]}分を含む）`}</p>
              ) : (
                <p className="text-xs" style={{ color: COLORS.slate }}>出勤・退勤を入力すると稼働時間が表示されます</p>
              );
            })()}
            <button onClick={saveAttendanceRecord} disabled={savingAttendance} className="text-sm font-bold px-4 py-2 rounded disabled:opacity-40" style={{ backgroundColor: COLORS.navy, color: "#fff" }}>
              {savingAttendance ? "保存中..." : "保存"}
            </button>
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
                <div className="flex items-center gap-1">
                  <button type="button" onClick={() => loadFormForDate(shiftDateStr(reportForm.date, -1), summary.dailyReports || [])} style={{ color: COLORS.slate }} title="前日"><ChevronLeft size={16} /></button>
                  <TextInput type="date" value={reportForm.date} onChange={(e) => loadFormForDate(e.target.value, summary.dailyReports || [])} className="w-full sm:w-40" />
                  <button type="button" onClick={() => loadFormForDate(shiftDateStr(reportForm.date, 1), summary.dailyReports || [])} style={{ color: COLORS.slate }} title="翌日"><ChevronRight size={16} /></button>
                </div>
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
                  本日時点での残タスク
                  <textarea value={reportForm.remainingTasks} onChange={(e) => setReportForm({ ...reportForm, remainingTasks: e.target.value })} rows={4} className="mt-1 w-full text-sm p-2 rounded outline-none resize-none" style={{ border: `1px solid ${COLORS.brassLight}` }} />
                </label>
                <label className="text-xs" style={{ color: COLORS.slate }}>
                  本日の成功
                  <textarea value={reportForm.todaySuccess} onChange={(e) => setReportForm({ ...reportForm, todaySuccess: e.target.value })} rows={2} className="mt-1 w-full text-sm p-2 rounded outline-none resize-none" style={{ border: `1px solid ${COLORS.brassLight}` }} />
                </label>
              </div>

              <div className="flex flex-col items-end gap-1.5">
                <button onClick={() => saveReport()} disabled={!reportHasContent} className="text-sm font-bold px-4 py-2 rounded disabled:opacity-40" style={{ backgroundColor: COLORS.navy, color: "#fff" }}>
                  {reportForm.id ? "更新する" : "記録を追加"}
                </button>
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
                {filteredHistory.map((r) => {
                  const expanded = expandedReportId === r.id;
                  return (
                    <div key={r.id} className="rounded overflow-hidden" style={{ border: `1px solid ${COLORS.brassLight}` }}>
                      <div
                        onClick={() => setExpandedReportId(expanded ? null : r.id)}
                        className="flex items-center justify-between gap-2 text-sm px-2.5 py-1.5 cursor-pointer hover:opacity-80"
                        style={{ backgroundColor: expanded ? COLORS.paper : "transparent" }}
                      >
                        <span>{formatDate(r.date)}</span>
                        <button onClick={(e) => { e.stopPropagation(); removeReport(r.id); }} className="text-xs flex-shrink-0" style={{ color: COLORS.slate }}>削除</button>
                      </div>
                      {expanded && (
                        <div className="flex flex-col gap-1.5 text-sm p-3" style={{ backgroundColor: COLORS.paper, borderTop: `1px solid ${COLORS.brassLight}` }}>
                          {r.mostImportant && <p><span className="text-xs font-bold" style={{ color: COLORS.slate }}>本日一番大事なこと：</span>{r.mostImportant}</p>}
                          {r.todayTasks && <p className="whitespace-pre-wrap"><span className="text-xs font-bold" style={{ color: COLORS.slate }}>本日やること：</span>{r.todayTasks}</p>}
                          {r.waitingCases && <p className="whitespace-pre-wrap"><span className="text-xs font-bold" style={{ color: COLORS.slate }}>待ち案件：</span>{r.waitingCases}</p>}
                          {r.workHours && <p className="whitespace-pre-wrap"><span className="text-xs font-bold" style={{ color: COLORS.slate }}>本日の業務時間・実績：</span>{r.workHours}</p>}
                          {r.remainingTasks && <p className="whitespace-pre-wrap"><span className="text-xs font-bold" style={{ color: COLORS.slate }}>本日時点での残タスク：</span>{r.remainingTasks}</p>}
                          {r.todaySuccess && <p className="whitespace-pre-wrap"><span className="text-xs font-bold" style={{ color: COLORS.slate }}>本日の成功：</span>{r.todaySuccess}</p>}
                          {![r.mostImportant, r.todayTasks, r.waitingCases, r.workHours, r.remainingTasks, r.todaySuccess].some((v) => v.trim()) && (
                            <p style={{ color: COLORS.slate }}>内容はまだ入力されていません。</p>
                          )}
                          <button onClick={() => editHistoryDate(r.date)} className="self-end text-xs font-bold px-2.5 py-1 rounded mt-1" style={{ backgroundColor: COLORS.navy, color: "#fff" }}>この日を編集する</button>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}
        </div>
      </div>
    </div>
  );
}
