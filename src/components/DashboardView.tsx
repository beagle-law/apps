"use client";

import { useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { COLORS, FONT_MINCHO, STAGES, STAGE_COLOR, STAGE_GROUP, STAFF_MEMBERS } from "@/lib/constants";
import { plusDaysStr, todayStr } from "@/lib/dates";
import { getPeriodRange, getPeriodLabel, shiftAnchor, isWithinPeriod, type DashboardGranularity } from "@/lib/business/dashboard";
import type { Case } from "@/lib/types";

interface Props {
  cases: Case[];
  onGoToActiveCases: () => void;
  onOpenCase: (id: string) => void;
}

const GRANULARITIES: { key: DashboardGranularity; label: string }[] = [
  { key: "all", label: "全期間" },
  { key: "year", label: "年単位" },
  { key: "half", label: "半期単位" },
  { key: "month", label: "月単位" },
];

function yen(n: number | "") {
  return n === "" || n == null ? "" : `¥${Number(n).toLocaleString("ja-JP")}`;
}

export default function DashboardView({ cases, onGoToActiveCases, onOpenCase }: Props) {
  const [granularity, setGranularity] = useState<DashboardGranularity>("all");
  const [anchor, setAnchor] = useState(todayStr());

  const visibleCases = cases.filter((c) => !c.hidden && !c.isPrivate);
  const range = getPeriodRange(granularity, anchor);
  const periodCases = visibleCases.filter((c) => isWithinPeriod(c.createdAt.slice(0, 10), range));

  const groupCounts: Record<string, number> = { 対応前: 0, 対応中: 0, 終了: 0 };
  const stageCounts: Record<string, number> = {};
  STAGES.forEach((s) => (stageCounts[s] = 0));
  periodCases.forEach((c) => {
    groupCounts[STAGE_GROUP[c.stage]]++;
    stageCounts[c.stage]++;
  });

  const memberCounts: Record<string, number> = {};
  periodCases.forEach((c) => c.teamMembers.forEach((m) => (memberCounts[m] = (memberCounts[m] || 0) + 1)));
  const memberList = Object.entries(memberCounts).sort((a, b) => b[1] - a[1]);

  const t = todayStr();
  const t7 = plusDaysStr(7);
  const upcomingCount = visibleCases.flatMap((c) => (c.hearings || []).filter((h) => h.nextHearingDate && h.nextHearingDate >= t && h.nextHearingDate <= t7)).length;

  const stageMax = Math.max(1, ...Object.values(stageCounts));
  const memberMax = Math.max(1, ...memberList.map(([, c]) => c), 1);

  const financeTotals = periodCases.reduce(
    (acc, c) => ({
      claimAmount: acc.claimAmount + (Number(c.claimAmount) || 0),
      retainerFee: acc.retainerFee + (Number(c.retainerFee) || 0),
      expectedFee: acc.expectedFee + (Number(c.expectedFee) || 0),
    }),
    { claimAmount: 0, retainerFee: 0, expectedFee: 0 }
  );

  return (
    <div className="flex-1 overflow-y-auto p-6">
      <div className="max-w-5xl mx-auto">
        <div className="flex items-center justify-between mb-5 flex-wrap gap-2">
          <h2 className="text-lg" style={{ fontFamily: FONT_MINCHO, color: COLORS.navy }}>ダッシュボード</h2>
          <div className="flex items-center gap-2">
            <div className="flex gap-1">
              {GRANULARITIES.map((g) => (
                <button
                  key={g.key}
                  onClick={() => {
                    setGranularity(g.key);
                    setAnchor(todayStr());
                  }}
                  className="text-xs px-2.5 py-1 rounded-full"
                  style={{
                    backgroundColor: granularity === g.key ? COLORS.navy : "transparent",
                    color: granularity === g.key ? "#fff" : COLORS.slate,
                    border: `1px solid ${granularity === g.key ? COLORS.navy : COLORS.brassLight}`,
                  }}
                >
                  {g.label}
                </button>
              ))}
            </div>
            {granularity !== "all" && (
              <div className="flex items-center gap-1 text-xs" style={{ color: COLORS.slate }}>
                <button onClick={() => setAnchor(shiftAnchor(granularity, anchor, -1))}><ChevronLeft size={16} /></button>
                <span>{getPeriodLabel(granularity, anchor)}</span>
                <button onClick={() => setAnchor(shiftAnchor(granularity, anchor, 1))}><ChevronRight size={16} /></button>
              </div>
            )}
          </div>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mb-6">
          <div className="rounded p-4" style={{ backgroundColor: COLORS.card, border: `1px solid ${COLORS.brassLight}` }}>
            <p className="text-xs" style={{ color: COLORS.slate }}>総案件数</p>
            <p className="text-2xl mt-1" style={{ fontFamily: FONT_MINCHO, color: COLORS.navy }}>{periodCases.length}</p>
          </div>
          <button onClick={onGoToActiveCases} className="rounded p-4 text-left hover:opacity-90 transition" style={{ backgroundColor: COLORS.card, border: `1px solid ${COLORS.brassLight}` }}>
            <p className="text-xs" style={{ color: COLORS.slate }}>対応中</p>
            <p className="text-2xl mt-1" style={{ fontFamily: FONT_MINCHO, color: COLORS.vermillion }}>{groupCounts["対応中"]}</p>
          </button>
          <div className="rounded p-4" style={{ backgroundColor: COLORS.card, border: `1px solid ${COLORS.brassLight}` }}>
            <p className="text-xs" style={{ color: COLORS.slate }}>今後7日の期日</p>
            <p className="text-2xl mt-1" style={{ fontFamily: FONT_MINCHO, color: COLORS.moss }}>{upcomingCount}</p>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
          <div className="rounded p-5" style={{ backgroundColor: COLORS.card, border: `1px solid ${COLORS.brassLight}` }}>
            <h3 className="text-sm font-bold mb-3" style={{ fontFamily: FONT_MINCHO, color: COLORS.navy }}>ステータス内訳</h3>
            <div className="flex flex-col gap-2">
              {STAGES.map((s) => (
                <div key={s} className="flex items-center gap-2">
                  <span className="text-xs w-28 flex-shrink-0" style={{ color: COLORS.slate }}>{s}</span>
                  <div className="flex-1 rounded-full overflow-hidden" style={{ backgroundColor: COLORS.paper, height: 8 }}>
                    <div style={{ width: `${(stageCounts[s] / stageMax) * 100}%`, backgroundColor: STAGE_COLOR[s], height: 8 }} />
                  </div>
                  <span className="text-xs font-bold w-4 text-right">{stageCounts[s]}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="rounded p-5" style={{ backgroundColor: COLORS.card, border: `1px solid ${COLORS.brassLight}` }}>
            <h3 className="text-sm font-bold mb-3" style={{ fontFamily: FONT_MINCHO, color: COLORS.navy }}>担当者別 案件数</h3>
            {memberList.length === 0 ? (
              <p className="text-sm" style={{ color: COLORS.slate }}>担当メンバーが登録された案件がありません。</p>
            ) : (
              <div className="flex flex-col gap-2">
                {memberList.map(([name, count]) => (
                  <div key={name} className="flex items-center gap-2">
                    <span className="text-xs w-20 flex-shrink-0 truncate" style={{ color: STAFF_MEMBERS.includes(name) ? COLORS.ink : COLORS.slate }}>{name}</span>
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

        <div className="rounded p-5 overflow-x-auto" style={{ backgroundColor: COLORS.card, border: `1px solid ${COLORS.brassLight}` }}>
          <h3 className="text-sm font-bold mb-3" style={{ fontFamily: FONT_MINCHO, color: COLORS.navy }}>案件データベース</h3>
          <table className="text-xs w-full" style={{ minWidth: 900 }}>
            <thead>
              <tr style={{ color: COLORS.slate, borderBottom: `1px solid ${COLORS.brassLight}` }}>
                {["No.", "案件名", "案件分類", "相手方", "相手方代理人", "受任日", "訴訟受任日", "通知書発送日", "提訴日", "請求額(税込)", "着手金(税込)", "見込報酬額(税込)", "報酬見込日"].map((h) => (
                  <th key={h} className="text-left py-1.5 pr-3 whitespace-nowrap font-normal">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {periodCases.map((c) => (
                <tr key={c.id} onClick={() => onOpenCase(c.id)} className="cursor-pointer hover:opacity-70" style={{ borderBottom: `1px solid ${COLORS.paper}` }}>
                  <td className="py-1.5 pr-3 whitespace-nowrap">{c.caseNumber}</td>
                  <td className="py-1.5 pr-3 max-w-[180px] truncate">{c.title}</td>
                  <td className="py-1.5 pr-3 whitespace-nowrap">{c.caseClassification}</td>
                  <td className="py-1.5 pr-3 whitespace-nowrap">{c.opposingParty}</td>
                  <td className="py-1.5 pr-3 whitespace-nowrap">{c.opposingCounselPersonName}</td>
                  <td className="py-1.5 pr-3 whitespace-nowrap">{c.engagementDate}</td>
                  <td className="py-1.5 pr-3 whitespace-nowrap">{c.litigationEngagementDate}</td>
                  <td className="py-1.5 pr-3 whitespace-nowrap">{c.noticeSentDate}</td>
                  <td className="py-1.5 pr-3 whitespace-nowrap">{c.filingDate}</td>
                  <td className="py-1.5 pr-3 whitespace-nowrap text-right">{yen(c.claimAmount)}</td>
                  <td className="py-1.5 pr-3 whitespace-nowrap text-right">{yen(c.retainerFee)}</td>
                  <td className="py-1.5 pr-3 whitespace-nowrap text-right">{yen(c.expectedFee)}</td>
                  <td className="py-1.5 pr-3 whitespace-nowrap">{c.expectedFeeDate}</td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr className="font-bold" style={{ borderTop: `2px solid ${COLORS.brassLight}` }}>
                <td className="py-1.5 pr-3" colSpan={9}>合計</td>
                <td className="py-1.5 pr-3 text-right">{yen(financeTotals.claimAmount)}</td>
                <td className="py-1.5 pr-3 text-right">{yen(financeTotals.retainerFee)}</td>
                <td className="py-1.5 pr-3 text-right">{yen(financeTotals.expectedFee)}</td>
                <td></td>
              </tr>
            </tfoot>
          </table>
        </div>
      </div>
    </div>
  );
}
