"use client";

import { COLORS, FONT_MINCHO, STAGES, STAGE_COLOR, CASE_CATEGORIES } from "@/lib/constants";
import { plusDaysStr, todayStr } from "@/lib/dates";
import type { Case } from "@/lib/types";

interface Props {
  cases: Case[];
}

export default function DashboardView({ cases }: Props) {
  const total = cases.length;
  const groupCounts: Record<string, number> = { 対応前: 0, 対応中: 0, 終了: 0 };
  const stageCounts: Record<string, number> = {};
  const categoryCounts: Record<string, number> = { 訴訟事件: 0, 非訟事件: 0 };
  STAGES.forEach((s) => (stageCounts[s] = 0));

  const STAGE_GROUP: Record<string, string> = {
    "新規問合せ・紹介": "対応前",
    "初回面談調整中": "対応前",
    "面談済み・受任検討中": "対応前",
    "受任せず（終了）": "終了",
    "受任・対応中": "対応中",
    "終結": "終了",
  };

  cases.forEach((c) => {
    groupCounts[STAGE_GROUP[c.stage]]++;
    stageCounts[c.stage]++;
    categoryCounts[c.caseCategory]++;
  });
  const urgent = cases.filter((c) => c.priority === "至急").length;
  const active = cases.filter((c) => STAGE_GROUP[c.stage] !== "終了");
  const memberCounts: Record<string, number> = {};
  active.forEach((c) => (c.teamMembers || []).forEach((m) => (memberCounts[m] = (memberCounts[m] || 0) + 1)));
  const memberList = Object.entries(memberCounts).sort((a, b) => b[1] - a[1]);

  const t = todayStr();
  const t7 = plusDaysStr(7);
  const upcomingCount = cases.flatMap((c) => (c.hearings || []).filter((h) => h.date >= t && h.date <= t7)).length;

  const stageMax = Math.max(1, ...Object.values(stageCounts));
  const categoryMax = Math.max(1, ...Object.values(categoryCounts));
  const memberMax = Math.max(1, ...memberList.map(([, c]) => c));

  return (
    <div className="flex-1 overflow-y-auto p-6">
      <div className="max-w-3xl mx-auto">
        <h2 className="text-lg mb-5" style={{ fontFamily: FONT_MINCHO, color: COLORS.navy }}>
          ダッシュボード
        </h2>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
          {[
            { label: "総案件数", value: total, color: COLORS.navy },
            { label: "対応中", value: groupCounts["対応中"], color: COLORS.vermillion },
            { label: "至急案件", value: urgent, color: COLORS.amber },
            { label: "今後7日の期日", value: upcomingCount, color: COLORS.moss },
          ].map((s) => (
            <div key={s.label} className="rounded p-4" style={{ backgroundColor: COLORS.card, border: `1px solid ${COLORS.brassLight}` }}>
              <p className="text-xs" style={{ color: COLORS.slate }}>
                {s.label}
              </p>
              <p className="text-2xl mt-1" style={{ fontFamily: FONT_MINCHO, color: s.color }}>
                {s.value}
              </p>
            </div>
          ))}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="rounded p-5" style={{ backgroundColor: COLORS.card, border: `1px solid ${COLORS.brassLight}` }}>
            <h3 className="text-sm font-bold mb-3" style={{ fontFamily: FONT_MINCHO, color: COLORS.navy }}>
              ステータス内訳
            </h3>
            <div className="flex flex-col gap-2">
              {STAGES.map((s) => {
                const count = stageCounts[s];
                return (
                  <div key={s} className="flex items-center gap-2">
                    <span className="text-xs w-28 flex-shrink-0" style={{ color: COLORS.slate }}>
                      {s}
                    </span>
                    <div className="flex-1 rounded-full overflow-hidden" style={{ backgroundColor: COLORS.paper, height: 8 }}>
                      <div style={{ width: `${(count / stageMax) * 100}%`, backgroundColor: STAGE_COLOR[s], height: 8 }} />
                    </div>
                    <span className="text-xs font-bold w-4 text-right">{count}</span>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="rounded p-5" style={{ backgroundColor: COLORS.card, border: `1px solid ${COLORS.brassLight}` }}>
            <h3 className="text-sm font-bold mb-3" style={{ fontFamily: FONT_MINCHO, color: COLORS.navy }}>
              種別内訳
            </h3>
            <div className="flex flex-col gap-2">
              {CASE_CATEGORIES.map((cat) => {
                const count = categoryCounts[cat];
                return (
                  <div key={cat} className="flex items-center gap-2">
                    <span className="text-xs w-28 flex-shrink-0" style={{ color: COLORS.slate }}>
                      {cat}
                    </span>
                    <div className="flex-1 rounded-full overflow-hidden" style={{ backgroundColor: COLORS.paper, height: 8 }}>
                      <div style={{ width: `${(count / categoryMax) * 100}%`, backgroundColor: cat === "訴訟事件" ? COLORS.navy : COLORS.brass, height: 8 }} />
                    </div>
                    <span className="text-xs font-bold w-4 text-right">{count}</span>
                  </div>
                );
              })}
            </div>

            <h3 className="text-sm font-bold mb-3 mt-6" style={{ fontFamily: FONT_MINCHO, color: COLORS.navy }}>
              担当者別 対応中案件数
            </h3>
            {memberList.length === 0 ? (
              <p className="text-sm" style={{ color: COLORS.slate }}>
                担当メンバーが登録された案件がありません。
              </p>
            ) : (
              <div className="flex flex-col gap-2">
                {memberList.map(([name, count]) => (
                  <div key={name} className="flex items-center gap-2">
                    <span className="text-xs w-28 flex-shrink-0 truncate" style={{ color: COLORS.slate }}>
                      {name}
                    </span>
                    <div className="flex-1 rounded-full overflow-hidden" style={{ backgroundColor: COLORS.paper, height: 8 }}>
                      <div style={{ width: `${(count / memberMax) * 100}%`, backgroundColor: COLORS.vermillion, height: 8 }} />
                    </div>
                    <span className="text-xs font-bold w-4 text-right">{count}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
