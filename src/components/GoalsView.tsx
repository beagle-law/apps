"use client";

import { useEffect, useMemo, useState } from "react";
import { COLORS, FONT_MINCHO, GOAL_KEYS } from "@/lib/constants";
import { currentYearMonth, formatYearMonth, formatDate } from "@/lib/dates";
import { YearMonthNav, Pill } from "@/components/ui";
import * as api from "@/lib/api-client";
import type { GoalRecord, User, DailyReport } from "@/lib/types";

interface Props {
  currentUser: User;
  onError: (msg: string) => void;
}

// v11 3.3：×/△/○の3ボタンを常時表示し直接選択する方式（もう一度押すと未選択に戻る）
const RESULT_OPTIONS = ["×", "△", "○"];

export default function GoalsView({ currentUser, onError }: Props) {
  const [subView, setSubView] = useState<"goals" | "stacking">("goals");
  const [records, setRecords] = useState<GoalRecord[]>([]);
  const [newItemText, setNewItemText] = useState<Record<string, string>>({});
  const [selectedYearMonth, setSelectedYearMonth] = useState(currentYearMonth());
  const [dailyReports, setDailyReports] = useState<DailyReport[] | null>(null);
  const [stackingYear, setStackingYear] = useState("");
  const [stackingMonth, setStackingMonth] = useState("");
  const [stackingDay, setStackingDay] = useState("");

  const load = () => {
    api.fetchGoalRecords().then(setRecords).catch((e) => onError(e instanceof Error ? e.message : "取得に失敗しました"));
  };
  useEffect(load, []);

  // v10 4.5「積み重ね」：ログイン中の本人の日報「本日の成功」を自動的に絞り込んで表示する
  useEffect(() => {
    if (subView !== "stacking") return;
    api
      .fetchPersonalSummary(currentUser.displayName)
      .then((res) => setDailyReports(res.dailyReports))
      .catch((e) => onError(e instanceof Error ? e.message : "取得に失敗しました"));
  }, [subView, currentUser.displayName, onError]);

  const saveMemo = async (key: string, yearMonth: string, memo: string) => {
    try {
      await api.setGoalMemo(key, yearMonth, memo);
      load();
    } catch (e) {
      onError(e instanceof Error ? e.message : "保存に失敗しました");
    }
  };

  // 目標画面の閲覧制限（v6 2.3）：宮村は全部、尾崎は全社+尾崎のみ、岩下は全社+岩下のみ
  const visibleGoalKeys = GOAL_KEYS.filter((g) => {
    if (g.key === "company") return true;
    if (currentUser.role === "admin") return true;
    if (g.key === "ozaki") return currentUser.displayName === "尾崎";
    if (g.key === "iwashita") return currentUser.displayName === "岩下";
    return false;
  });

  // v11 3.3：パフォーマンス改善のため、毎回線形探索せずkey::yearMonthをキーにしたMapを事前に作成する
  const recordsByKey = useMemo(() => {
    const map = new Map<string, GoalRecord>();
    for (const r of records) map.set(`${r.key}::${r.yearMonth}`, r);
    return map;
  }, [records]);
  const findRecord = (key: string, yearMonth: string) => recordsByKey.get(`${key}::${yearMonth}`);

  const addItem = async (key: string) => {
    const text = (newItemText[`${key}-${selectedYearMonth}`] || "").trim();
    if (!text) return;
    try {
      await api.addGoalItem(key, selectedYearMonth, text);
      setNewItemText((prev) => ({ ...prev, [`${key}-${selectedYearMonth}`]: "" }));
      load();
    } catch (e) {
      onError(e instanceof Error ? e.message : "追加に失敗しました");
    }
  };
  const removeItem = async (key: string, yearMonth: string, itemId: string) => {
    try {
      await api.removeGoalItem(key, yearMonth, itemId);
      load();
    } catch (e) {
      onError(e instanceof Error ? e.message : "削除に失敗しました");
    }
  };
  // v11フィードバック：毎回全件再取得すると体感が遅いため、クリック結果を即座にローカル反映し
  // （楽観的更新）、サーバー保存は裏で行う。失敗時のみ再取得して状態を戻す。
  const selectResult = (key: string, yearMonth: string, itemId: string, current: string, option: string) => {
    const next = current === option ? "" : option;
    setRecords((prev) =>
      prev.map((r) =>
        r.key === key && r.yearMonth === yearMonth
          ? { ...r, items: r.items.map((i) => (i.id === itemId ? { ...i, result: next } : i)) }
          : r
      )
    );
    api.updateGoalItem(key, yearMonth, itemId, { result: next }).catch((e) => {
      onError(e instanceof Error ? e.message : "更新に失敗しました");
      load();
    });
  };
  const saveNote = async (key: string, yearMonth: string, itemId: string, note: string) => {
    try {
      await api.updateGoalItem(key, yearMonth, itemId, { note });
      load();
    } catch (e) {
      onError(e instanceof Error ? e.message : "保存に失敗しました");
    }
  };
  const saveOverall = async (key: string, yearMonth: string, value: string) => {
    try {
      await api.setGoalOverallPercent(key, yearMonth, value);
      load();
    } catch (e) {
      onError(e instanceof Error ? e.message : "保存に失敗しました");
    }
  };

  return (
    <div className="flex-1 overflow-y-auto p-6">
      <div className="max-w-3xl mx-auto flex flex-col gap-5">
        <div className="flex items-center gap-3">
          <h2 className="text-lg" style={{ fontFamily: FONT_MINCHO, color: COLORS.navy }}>目標</h2>
          <div className="flex gap-1.5">
            <Pill active={subView === "goals"} color={COLORS.navy} onClick={() => setSubView("goals")}>目標</Pill>
            <Pill active={subView === "stacking"} color={COLORS.navy} onClick={() => setSubView("stacking")}>積み重ね</Pill>
          </div>
        </div>

        {subView === "stacking" ? (
          <div className="rounded p-5" style={{ backgroundColor: COLORS.card, border: `1px solid ${COLORS.brassLight}` }}>
            <h3 className="text-sm font-bold mb-3" style={{ fontFamily: FONT_MINCHO, color: COLORS.navy }}>{currentUser.displayName}さんの「本日の成功」</h3>

            {dailyReports !== null && (() => {
              const years = Array.from(new Set(dailyReports.map((r) => r.date.slice(0, 4)))).sort((a, b) => b.localeCompare(a));
              const hasFilter = stackingYear || stackingMonth || stackingDay;
              return (
                <div className="flex items-center gap-2 mb-3 flex-wrap">
                  <select value={stackingYear} onChange={(e) => setStackingYear(e.target.value)} className="text-xs p-1.5 rounded outline-none" style={{ border: `1px solid ${COLORS.brassLight}` }}>
                    <option value="">年（すべて）</option>
                    {years.map((y) => <option key={y} value={y}>{y}年</option>)}
                  </select>
                  <select value={stackingMonth} onChange={(e) => setStackingMonth(e.target.value)} className="text-xs p-1.5 rounded outline-none" style={{ border: `1px solid ${COLORS.brassLight}` }}>
                    <option value="">月（すべて）</option>
                    {Array.from({ length: 12 }, (_, i) => String(i + 1).padStart(2, "0")).map((m) => (
                      <option key={m} value={m}>{Number(m)}月</option>
                    ))}
                  </select>
                  <select value={stackingDay} onChange={(e) => setStackingDay(e.target.value)} className="text-xs p-1.5 rounded outline-none" style={{ border: `1px solid ${COLORS.brassLight}` }}>
                    <option value="">日（すべて）</option>
                    {Array.from({ length: 31 }, (_, i) => String(i + 1).padStart(2, "0")).map((d) => (
                      <option key={d} value={d}>{Number(d)}日</option>
                    ))}
                  </select>
                  {hasFilter && (
                    <button onClick={() => { setStackingYear(""); setStackingMonth(""); setStackingDay(""); }} className="text-xs underline" style={{ color: COLORS.slate }}>
                      絞り込みを解除
                    </button>
                  )}
                </div>
              );
            })()}

            {dailyReports === null ? (
              <p className="text-sm" style={{ color: COLORS.slate }}>読み込み中...</p>
            ) : (
              (() => {
                const successes = dailyReports
                  .filter((r) => r.todaySuccess.trim())
                  .filter((r) => !stackingYear || r.date.slice(0, 4) === stackingYear)
                  .filter((r) => !stackingMonth || r.date.slice(5, 7) === stackingMonth)
                  .filter((r) => !stackingDay || r.date.slice(8, 10) === stackingDay)
                  .sort((a, b) => (a.date < b.date ? 1 : -1));
                if (successes.length === 0) {
                  return <p className="text-sm" style={{ color: COLORS.slate }}>該当する記録がありません。</p>;
                }
                return (
                  <div className="flex flex-col gap-3">
                    {successes.map((r) => (
                      <div key={r.id} className="p-3 rounded text-sm" style={{ backgroundColor: COLORS.paper }}>
                        <p className="text-xs font-bold mb-1" style={{ color: COLORS.slate }}>{formatDate(r.date)}</p>
                        <p className="whitespace-pre-wrap">{r.todaySuccess}</p>
                      </div>
                    ))}
                  </div>
                );
              })()
            )}
          </div>
        ) : (
        <>
        <div className="rounded p-5" style={{ backgroundColor: COLORS.card, border: `1px solid ${COLORS.brassLight}` }}>
          <h3 className="text-sm font-bold mb-3" style={{ fontFamily: FONT_MINCHO, color: COLORS.navy }}>閲覧・編集する年月</h3>
          <YearMonthNav yearMonth={selectedYearMonth} onChange={setSelectedYearMonth} />
        </div>

        {visibleGoalKeys.map((g) => {
          const current = findRecord(g.key, selectedYearMonth);
          return (
            <div key={g.key} className="rounded p-5" style={{ backgroundColor: COLORS.card, border: `1px solid ${COLORS.brassLight}` }}>
              <h3 className="text-sm font-bold mb-3" style={{ fontFamily: FONT_MINCHO, color: COLORS.navy }}>{g.label}（{formatYearMonth(selectedYearMonth)}）</h3>
              <div className="flex flex-col gap-2 mb-3">
                {(current?.items || []).map((item) => (
                  <div key={item.id} className="p-2 rounded text-sm" style={{ backgroundColor: COLORS.paper }}>
                    <div className="flex items-center justify-between gap-2">
                      <span className="flex-1">{item.text}</span>
                      <div className="flex gap-1 flex-shrink-0">
                        {RESULT_OPTIONS.map((opt) => (
                          <button
                            key={opt}
                            onClick={() => selectResult(g.key, selectedYearMonth, item.id, item.result, opt)}
                            className="text-sm font-bold w-7 h-7 rounded-full"
                            style={{
                              backgroundColor: item.result === opt ? COLORS.navy : "transparent",
                              color: item.result === opt ? "#fff" : COLORS.navy,
                              border: `1px solid ${COLORS.navy}`,
                            }}
                          >
                            {opt}
                          </button>
                        ))}
                      </div>
                      <button onClick={() => removeItem(g.key, selectedYearMonth, item.id)} className="text-xs flex-shrink-0" style={{ color: COLORS.slate }}>削除</button>
                    </div>
                    <textarea
                      defaultValue={item.note}
                      onBlur={(e) => saveNote(g.key, selectedYearMonth, item.id, e.target.value)}
                      placeholder="評価メモ"
                      rows={2}
                      className="w-full text-xs p-1.5 rounded outline-none mt-1 resize-none"
                      style={{ border: `1px solid ${COLORS.brassLight}` }}
                    />
                  </div>
                ))}
              </div>
              <div className="flex gap-2 mb-3">
                <input
                  type="text"
                  value={newItemText[`${g.key}-${selectedYearMonth}`] || ""}
                  onChange={(e) => setNewItemText((prev) => ({ ...prev, [`${g.key}-${selectedYearMonth}`]: e.target.value }))}
                  onKeyDown={(e) => e.key === "Enter" && addItem(g.key)}
                  placeholder="項目を追加（案件名・タスク名など）"
                  className="flex-1 text-sm p-2 rounded outline-none"
                  style={{ border: `1px solid ${COLORS.brassLight}` }}
                />
                <button onClick={() => addItem(g.key)} className="text-sm font-bold px-3 rounded" style={{ backgroundColor: COLORS.navy, color: "#fff" }}>追加</button>
              </div>
              <label className="text-xs" style={{ color: COLORS.slate }}>
                達成率（%）
                <input
                  key={`${g.key}-${selectedYearMonth}-overall`}
                  type="text"
                  defaultValue={current?.overallPercent || ""}
                  onBlur={(e) => saveOverall(g.key, selectedYearMonth, e.target.value)}
                  className="mt-1 ml-2 text-sm p-1.5 rounded outline-none w-20"
                  style={{ border: `1px solid ${COLORS.brassLight}` }}
                />
              </label>
              <label className="text-xs block mt-3" style={{ color: COLORS.slate }}>
                メモ
                <textarea
                  key={`${g.key}-${selectedYearMonth}-memo`}
                  defaultValue={current?.memo || ""}
                  onBlur={(e) => saveMemo(g.key, selectedYearMonth, e.target.value)}
                  rows={3}
                  className="mt-1 w-full text-sm p-2 rounded outline-none resize-none"
                  style={{ border: `1px solid ${COLORS.brassLight}` }}
                />
              </label>
            </div>
          );
        })}
        </>
        )}
      </div>
    </div>
  );
}
