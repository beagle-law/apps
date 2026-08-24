"use client";

import { useEffect, useState } from "react";
import { COLORS, FONT_MINCHO, GOAL_KEYS } from "@/lib/constants";
import { currentYearMonth, formatYearMonth } from "@/lib/dates";
import { YearMonthNav } from "@/components/ui";
import * as api from "@/lib/api-client";
import type { GoalRecord, User } from "@/lib/types";

interface Props {
  currentUser: User;
  onError: (msg: string) => void;
}

const RESULT_CYCLE = ["", "○", "△", "×"];

export default function GoalsView({ currentUser, onError }: Props) {
  const [records, setRecords] = useState<GoalRecord[]>([]);
  const [newItemText, setNewItemText] = useState<Record<string, string>>({});
  const [selectedYearMonth, setSelectedYearMonth] = useState(currentYearMonth());

  const load = () => {
    api.fetchGoalRecords().then(setRecords).catch((e) => onError(e instanceof Error ? e.message : "取得に失敗しました"));
  };
  useEffect(load, []);

  // 目標画面の閲覧制限（v6 2.3）：宮村は全部、尾崎は全社+尾崎のみ、岩下は全社+岩下のみ
  const visibleGoalKeys = GOAL_KEYS.filter((g) => {
    if (g.key === "company") return true;
    if (currentUser.role === "admin") return true;
    if (g.key === "ozaki") return currentUser.displayName === "尾崎";
    if (g.key === "iwashita") return currentUser.displayName === "岩下";
    return false;
  });

  const findRecord = (key: string, yearMonth: string) => records.find((r) => r.key === key && r.yearMonth === yearMonth);

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
                      <button onClick={() => cycleResult(g.key, selectedYearMonth, item.id, item.result)} className="text-sm font-bold w-7 h-7 rounded-full flex-shrink-0" style={{ backgroundColor: COLORS.navy, color: "#fff" }}>{item.result || "－"}</button>
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
            </div>
          );
        })}
      </div>
    </div>
  );
}
