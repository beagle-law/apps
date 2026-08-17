"use client";

import { useEffect, useState } from "react";
import { COLORS, FONT_MINCHO, GOAL_KEYS, TASK_LEVEL_TABLE, EXECUTION_LEVELS, PERSONAL_TASK_TABS } from "@/lib/constants";
import { currentYearMonth, shiftYearMonth, formatYearMonth } from "@/lib/dates";
import { monthlyPointTotals, monthlyExecutionAverages, monthlyPersonnelScores } from "@/lib/business/goals";
import * as api from "@/lib/api-client";
import type { Case, GoalRecord } from "@/lib/types";

interface Props {
  cases: Case[];
  onError: (msg: string) => void;
}

const RESULT_CYCLE = ["", "○", "△", "×"];

export default function GoalsView({ cases, onError }: Props) {
  const [records, setRecords] = useState<GoalRecord[]>([]);
  const [newItemText, setNewItemText] = useState<Record<string, string>>({});

  const load = () => {
    api.fetchGoalRecords().then(setRecords).catch((e) => onError(e instanceof Error ? e.message : "取得に失敗しました"));
  };
  useEffect(load, []);

  const cm = currentYearMonth();
  const prevMonth = shiftYearMonth(cm, -1);
  const allTasks = cases.flatMap((c) => c.tasks);
  const pointTotals = monthlyPointTotals(allTasks);
  const pointMax = Math.max(1, ...Object.values(pointTotals));
  const executionAverages = monthlyExecutionAverages(allTasks);
  const personnelScores = monthlyPersonnelScores(allTasks);

  const findRecord = (key: string, yearMonth: string) => records.find((r) => r.key === key && r.yearMonth === yearMonth);

  const addItem = async (key: string) => {
    const text = (newItemText[`${key}-${cm}`] || "").trim();
    if (!text) return;
    try {
      await api.addGoalItem(key, cm, text);
      setNewItemText((prev) => ({ ...prev, [`${key}-${cm}`]: "" }));
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
  const cycleResult = async (key: string, yearMonth: string, itemId: string, current: string) => {
    const next = RESULT_CYCLE[(RESULT_CYCLE.indexOf(current) + 1) % RESULT_CYCLE.length];
    try {
      await api.updateGoalItem(key, yearMonth, itemId, { result: next });
      load();
    } catch (e) {
      onError(e instanceof Error ? e.message : "更新に失敗しました");
    }
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
        <h2 className="text-lg" style={{ fontFamily: FONT_MINCHO, color: COLORS.navy }}>目標</h2>

        <div className="rounded p-5 overflow-x-auto" style={{ backgroundColor: COLORS.card, border: `1px solid ${COLORS.brassLight}` }}>
          <h3 className="text-sm font-bold mb-3" style={{ fontFamily: FONT_MINCHO, color: COLORS.navy }}>タスク難易度点の目安</h3>
          <table className="text-xs w-full" style={{ minWidth: 560 }}>
            <thead><tr style={{ color: COLORS.slate }}><th className="text-left py-1">点数</th><th className="text-left py-1">難易度</th><th className="text-left py-1">具体例</th></tr></thead>
            <tbody>
              {TASK_LEVEL_TABLE.map((row) => (
                <tr key={row.points} style={{ borderTop: `1px solid ${COLORS.paper}` }}>
                  <td className="py-1.5 pr-2 font-bold">{row.points}</td>
                  <td className="py-1.5 pr-2">{row.difficulty}</td>
                  <td className="py-1.5">{row.examples}</td>
                </tr>
              ))}
            </tbody>
          </table>

          <h4 className="text-xs font-bold mt-4 mb-2" style={{ color: COLORS.slate }}>今月に完了したタスクの累計点</h4>
          <div className="flex flex-col gap-2">
            {PERSONAL_TASK_TABS.map((name) => (
              <div key={name} className="flex items-center gap-2">
                <span className="text-xs w-12 flex-shrink-0">{name}</span>
                <div className="flex-1 rounded-full overflow-hidden" style={{ backgroundColor: COLORS.paper, height: 8 }}>
                  <div style={{ width: `${(pointTotals[name] / pointMax) * 100}%`, backgroundColor: COLORS.amber, height: 8 }} />
                </div>
                <span className="text-xs font-bold w-8 text-right">{pointTotals[name]}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="rounded p-5" style={{ backgroundColor: COLORS.card, border: `1px solid ${COLORS.brassLight}` }}>
          <h3 className="text-sm font-bold mb-3" style={{ fontFamily: FONT_MINCHO, color: COLORS.navy }}>対応評価点</h3>
          <div className="flex flex-col gap-1 mb-4">
            {EXECUTION_LEVELS.map((l) => (
              <p key={l.score} className="text-xs" style={{ color: COLORS.slate }}>{l.score}点　{l.label}</p>
            ))}
          </div>
          <div className="flex flex-col gap-2">
            {Object.entries(executionAverages).map(([name, avg]) => (
              <div key={name} className="flex items-center gap-2">
                <span className="text-xs w-12 flex-shrink-0">{name}</span>
                <div className="flex-1 rounded-full overflow-hidden" style={{ backgroundColor: COLORS.paper, height: 8 }}>
                  <div style={{ width: `${(avg / 5) * 100}%`, backgroundColor: COLORS.moss, height: 8 }} />
                </div>
                <span className="text-xs font-bold w-14 text-right">平均{avg.toFixed(1)}点</span>
              </div>
            ))}
          </div>
        </div>

        <div className="rounded p-5" style={{ backgroundColor: COLORS.card, border: `1px solid ${COLORS.brassLight}` }}>
          <h3 className="text-sm font-bold mb-3" style={{ fontFamily: FONT_MINCHO, color: COLORS.navy }}>人事評価点</h3>
          <p className="text-xs mb-3" style={{ color: COLORS.slate }}>タスク難易度点×対応評価点×2×0.1で計算されます（タスクごとに算出して合算）。賞与の基礎点になります。</p>
          <div className="flex flex-col gap-2">
            {Object.entries(personnelScores).map(([name, score]) => (
              <div key={name} className="flex items-center justify-between text-sm p-2.5 rounded" style={{ backgroundColor: COLORS.paper }}>
                <span style={{ color: COLORS.slate }}>{name}</span>
                <span className="font-bold" style={{ fontFamily: FONT_MINCHO, color: COLORS.navy }}>{score.toFixed(1)}点</span>
              </div>
            ))}
          </div>
          <p className="text-xs mt-2" style={{ color: COLORS.slate }}>{formatYearMonth(cm)}に完了し、難易度点・評価点の両方が付いているタスクのみが対象です。</p>
        </div>

        {GOAL_KEYS.map((g) => {
          const current = findRecord(g.key, cm);
          const prev = findRecord(g.key, prevMonth);
          const history = records.filter((r) => r.key === g.key && r.yearMonth !== cm && r.items.length > 0).sort((a, b) => (a.yearMonth < b.yearMonth ? 1 : -1));
          return (
            <div key={g.key} className="rounded p-5" style={{ backgroundColor: COLORS.card, border: `1px solid ${COLORS.brassLight}` }}>
              <h3 className="text-sm font-bold mb-3" style={{ fontFamily: FONT_MINCHO, color: COLORS.navy }}>{g.label}（{formatYearMonth(cm)}）</h3>
              <div className="flex flex-col gap-1.5 mb-3">
                {(current?.items || []).map((item) => (
                  <div key={item.id} className="flex items-center justify-between gap-2 text-sm p-2 rounded" style={{ backgroundColor: COLORS.paper }}>
                    <span className="flex-1">{item.text}</span>
                    <button onClick={() => removeItem(g.key, cm, item.id)} className="text-xs" style={{ color: COLORS.slate }}>削除</button>
                  </div>
                ))}
              </div>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={newItemText[`${g.key}-${cm}`] || ""}
                  onChange={(e) => setNewItemText((prev) => ({ ...prev, [`${g.key}-${cm}`]: e.target.value }))}
                  onKeyDown={(e) => e.key === "Enter" && addItem(g.key)}
                  placeholder="項目を追加（案件名・タスク名など）"
                  className="flex-1 text-sm p-2 rounded outline-none"
                  style={{ border: `1px solid ${COLORS.brassLight}` }}
                />
                <button onClick={() => addItem(g.key)} className="text-sm font-bold px-3 rounded" style={{ backgroundColor: COLORS.navy, color: "#fff" }}>追加</button>
              </div>

              {prev && prev.items.length > 0 && (
                <div className="mt-5 pt-4" style={{ borderTop: `1px solid ${COLORS.brassLight}` }}>
                  <h4 className="text-xs font-bold mb-2" style={{ color: COLORS.slate }}>{formatYearMonth(prevMonth)}の評価</h4>
                  <div className="flex flex-col gap-2 mb-3">
                    {prev.items.map((item) => (
                      <div key={item.id} className="p-2 rounded text-sm" style={{ backgroundColor: COLORS.paper }}>
                        <div className="flex items-center justify-between gap-2">
                          <span className="flex-1">{item.text}</span>
                          <button onClick={() => cycleResult(g.key, prevMonth, item.id, item.result)} className="text-sm font-bold w-7 h-7 rounded-full flex-shrink-0" style={{ backgroundColor: COLORS.navy, color: "#fff" }}>{item.result || "－"}</button>
                        </div>
                        <textarea
                          defaultValue={item.note}
                          onBlur={(e) => saveNote(g.key, prevMonth, item.id, e.target.value)}
                          placeholder="評価メモ"
                          rows={2}
                          className="w-full text-xs p-1.5 rounded outline-none mt-1 resize-none"
                          style={{ border: `1px solid ${COLORS.brassLight}` }}
                        />
                      </div>
                    ))}
                  </div>
                  <label className="text-xs" style={{ color: COLORS.slate }}>
                    達成率（%）
                    <input
                      type="text"
                      defaultValue={prev.overallPercent}
                      onBlur={(e) => saveOverall(g.key, prevMonth, e.target.value)}
                      className="mt-1 ml-2 text-sm p-1.5 rounded outline-none w-20"
                      style={{ border: `1px solid ${COLORS.brassLight}` }}
                    />
                  </label>
                </div>
              )}

              {history.length > 0 && (
                <div className="mt-5 pt-4" style={{ borderTop: `1px solid ${COLORS.brassLight}` }}>
                  <h4 className="text-xs font-bold mb-2" style={{ color: COLORS.slate }}>過去の記録</h4>
                  <div className="flex flex-col gap-2">
                    {history.map((r) => (
                      <div key={r.id} className="p-2 rounded text-xs" style={{ backgroundColor: COLORS.paper }}>
                        <p className="font-bold mb-1">{formatYearMonth(r.yearMonth)}　達成率：{r.overallPercent || "－"}%</p>
                        {r.items.map((item) => (
                          <p key={item.id}>{item.text}　{item.result || "－"}{item.note ? `　${item.note}` : ""}</p>
                        ))}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
