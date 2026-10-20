"use client";

import { useEffect, useState } from "react";
import { ChevronLeft, ChevronRight, ChevronUp, ChevronDown } from "lucide-react";
import { COLORS, FONT_MINCHO, STAGES, STAGE_COLOR } from "@/lib/constants";
import { todayStr, formatDateShort } from "@/lib/dates";
import { getPeriodRange, getPeriodLabel, shiftAnchor, isWithinPeriod, type DashboardGranularity } from "@/lib/business/dashboard";
import { sortCasesByCaseNumber } from "@/lib/business/caseSort";
import * as api from "@/lib/api-client";
import type { Case, Client } from "@/lib/types";

interface Props {
  cases: Case[];
  onGoToActiveCases: () => void;
  onOpenCase: (id: string) => void;
  onCaseUpdated: (c: Case) => void;
  onError: (msg: string) => void;
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

// v16：「データ」タブと統合（案件横断の集計・傾向表示）。
function daysBetween(a: string, b: string): number | null {
  if (!a || !b) return null;
  const d1 = new Date(a + "T00:00:00");
  const d2 = new Date(b + "T00:00:00");
  const diff = Math.round((d2.getTime() - d1.getTime()) / (1000 * 60 * 60 * 24));
  return Number.isFinite(diff) ? diff : null;
}

function average(values: number[]): number | null {
  if (values.length === 0) return null;
  return Math.round((values.reduce((s, v) => s + v, 0) / values.length) * 10) / 10;
}

function BarRow({ label, value, max, formatValue }: { label: string; value: number; max: number; formatValue: (v: number) => string }) {
  const pct = max > 0 ? Math.max(2, (value / max) * 100) : 0;
  return (
    <div className="flex items-center gap-2 text-sm">
      <span className="flex-shrink-0" style={{ width: 90, color: COLORS.slate }}>{label}</span>
      <div className="flex-1 rounded overflow-hidden" style={{ backgroundColor: COLORS.paper, height: 16 }}>
        <div style={{ width: `${pct}%`, height: "100%", backgroundColor: COLORS.vermillion, borderRadius: 4 }} />
      </div>
      <span className="flex-shrink-0 text-xs" style={{ width: 110, textAlign: "right", color: COLORS.ink }}>{formatValue(value)}</span>
    </div>
  );
}

// v19：受任件数・終結件数を月別／年別に集計し、各期間の案件一覧をホバーで表示する。
function groupCasesByPeriod(cases: Case[], dateField: "engagementDate" | "closedDate", granularity: "month" | "year") {
  const map = new Map<string, Case[]>();
  for (const c of cases) {
    const d = c[dateField];
    if (!d) continue;
    const key = granularity === "year" ? d.slice(0, 4) : d.slice(0, 7);
    const list = map.get(key) || [];
    list.push(c);
    map.set(key, list);
  }
  return [...map.entries()].sort((a, b) => (a[0] < b[0] ? -1 : 1));
}

function PeriodCountRow({
  label,
  cases,
  cumulative,
  max,
  onOpenCase,
}: {
  label: string;
  cases: Case[];
  cumulative: number;
  max: number;
  onOpenCase: (id: string) => void;
}) {
  const pct = max > 0 ? Math.max(2, (cases.length / max) * 100) : 0;
  return (
    <div className="relative group flex items-center gap-2 text-sm">
      <span className="flex-shrink-0" style={{ width: 70, color: COLORS.slate }}>{label}</span>
      <div className="flex-1 rounded overflow-hidden" style={{ backgroundColor: COLORS.paper, height: 16 }}>
        <div style={{ width: `${pct}%`, height: "100%", backgroundColor: COLORS.vermillion, borderRadius: 4 }} />
      </div>
      <span className="flex-shrink-0 text-xs" style={{ width: 110, textAlign: "right", color: COLORS.ink }}>{cases.length}件（累計{cumulative}件）</span>
      {cases.length > 0 && (
        <div
          className="hidden group-hover:block absolute left-0 top-full mt-1 z-10 rounded p-3 text-xs shadow-lg"
          style={{ backgroundColor: COLORS.card, border: `1px solid ${COLORS.brassLight}`, width: 280, maxHeight: 260, overflowY: "auto" }}
        >
          {cases.map((c) => (
            <button key={c.id} onClick={() => onOpenCase(c.id)} className="flex items-center justify-between gap-2 py-0.5 w-full text-left hover:opacity-70">
              <span className="truncate">{c.title}</span>
              <span className="flex-shrink-0 ml-2" style={{ color: COLORS.slate }}>No.{c.caseNumber}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

function SummaryCard({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded p-5" style={{ backgroundColor: COLORS.card, border: `1px solid ${COLORS.brassLight}` }}>
      <h3 className="text-sm font-bold mb-4" style={{ fontFamily: FONT_MINCHO, color: COLORS.navy, letterSpacing: "0.05em" }}>{title}</h3>
      {children}
    </div>
  );
}

type ColumnKey =
  | "caseNumber"
  | "title"
  | "caseClassification"
  | "opposingParty"
  | "engagementDate"
  | "noticeSentDate"
  | "filingDate"
  | "claimAmount"
  | "recoveredAmount"
  | "retainerFee"
  | "expectedFee"
  | "expectedFeeDate"
  | "closedDate";

const COLUMNS: { key: ColumnKey; label: string; numeric?: boolean }[] = [
  { key: "caseNumber", label: "No." },
  { key: "title", label: "案件名" },
  { key: "caseClassification", label: "案件分類" },
  { key: "opposingParty", label: "相手方" },
  { key: "engagementDate", label: "受任日" },
  { key: "noticeSentDate", label: "通知書発送日" },
  { key: "filingDate", label: "提訴日" },
  { key: "claimAmount", label: "請求額(税込)", numeric: true },
  { key: "recoveredAmount", label: "回収額(税込)", numeric: true },
  { key: "retainerFee", label: "着手金(税込)", numeric: true },
  { key: "expectedFee", label: "見込報酬額(税込)", numeric: true },
  { key: "expectedFeeDate", label: "報酬見込日" },
  { key: "closedDate", label: "終結日" },
];

function cellValue(c: Case, key: ColumnKey): string | number {
  switch (key) {
    case "claimAmount":
    case "recoveredAmount":
    case "retainerFee":
    case "expectedFee":
      return c[key] === "" ? -Infinity : Number(c[key]);
    default:
      return c[key] as string;
  }
}

export default function DashboardView({ cases, onGoToActiveCases, onOpenCase, onCaseUpdated, onError }: Props) {
  const [granularity, setGranularity] = useState<DashboardGranularity>("all");
  const [anchor, setAnchor] = useState(todayStr());
  const [sortKey, setSortKey] = useState<ColumnKey>("caseNumber");
  const [sortDir, setSortDir] = useState<1 | -1>(1);
  const [caseEventGranularity, setCaseEventGranularity] = useState<"month" | "year">("month");

  // 終結日を入力した案件は案件一覧では非表示になるが、分析の集計には含める（個人メモは除く）
  const visibleCases = cases.filter((c) => !c.isPrivate && (!c.hidden || c.stage === "終結"));
  const [showClosedInTable, setShowClosedInTable] = useState(false); // 案件一覧表に終結した案件も表示するか
  const [clients, setClients] = useState<Client[]>([]);
  useEffect(() => {
    api.fetchClients().then(setClients).catch(() => setClients([]));
  }, []);
  const advisors = clients.filter((c) => c.isAdvisor);
  const range = getPeriodRange(granularity, anchor);
  // v10 4.3：期間フィルターの判定基準を登録日時（createdAt）から受任日（engagementDate）に変更。
  // 「全期間」では受任日未登録の案件も含める。年・半期・月単位では受任日が範囲内の案件のみ対象。
  const periodCases = sortCasesByCaseNumber(
    visibleCases.filter((c) => (range === null ? true : c.engagementDate !== "" && isWithinPeriod(c.engagementDate, range)))
  );

  const saveFinanceField = async (caseId: string, field: Parameters<typeof api.patchFinance>[1]) => {
    try {
      const updated = await api.patchFinance(caseId, field);
      onCaseUpdated(updated);
    } catch (e) {
      onError(e instanceof Error ? e.message : "保存に失敗しました");
    }
  };

  const stageCounts: Record<string, number> = {};
  STAGES.forEach((s) => (stageCounts[s] = 0));
  let activeCount = 0;
  periodCases.forEach((c) => {
    stageCounts[c.stage]++;
    if (c.stage === "受任・対応中") activeCount++;
  });

  // 「今後の期日」：次回裁判期日が本日以降の件数（v21で「今後1か月間」から全期間に変更）。ホバーで一覧を表示。
  const t = todayStr();
  const upcoming = visibleCases
    .flatMap((c) => (c.hearings || []).filter((h) => h.nextHearingDate && h.nextHearingDate >= t).map((h) => ({ case: c, hearing: h })))
    .sort((a, b) => (a.hearing.nextHearingDate < b.hearing.nextHearingDate ? -1 : 1));

  const stageMax = Math.max(1, ...Object.values(stageCounts));

  // 案件一覧表に出す案件：終結した案件は既定では出さない（切り替えで表示）
  const tableCases = periodCases.filter((c) => showClosedInTable || c.stage !== "終結");

  const financeTotals = tableCases.reduce(
    (acc, c) => ({
      claimAmount: acc.claimAmount + (Number(c.claimAmount) || 0),
      recoveredAmount: acc.recoveredAmount + (Number(c.recoveredAmount) || 0),
      retainerFee: acc.retainerFee + (Number(c.retainerFee) || 0),
      expectedFee: acc.expectedFee + (Number(c.expectedFee) || 0),
    }),
    { claimAmount: 0, recoveredAmount: 0, retainerFee: 0, expectedFee: 0 }
  );

  // v16：「データ」タブの集計（案件横断・期間フィルターの影響を受けない全案件ベース）
  const engagementToNotice = average(
    visibleCases.map((c) => daysBetween(c.engagementDate, c.noticeSentDate)).filter((v): v is number => v !== null && v >= 0)
  );

  const expectedFeeByMonth = new Map<string, number>();
  const expectedFeeCasesByMonth = new Map<string, Case[]>();
  visibleCases
    .filter((c) => c.stage !== "終結" && c.expectedFeeDate && c.expectedFee)
    .forEach((c) => {
      const ym = c.expectedFeeDate.slice(0, 7);
      expectedFeeByMonth.set(ym, (expectedFeeByMonth.get(ym) || 0) + Number(c.expectedFee));
      expectedFeeCasesByMonth.set(ym, [...(expectedFeeCasesByMonth.get(ym) || []), c]);
    });
  const expectedFeeMonths = [...expectedFeeByMonth.entries()].sort((a, b) => (a[0] < b[0] ? -1 : 1));
  const expectedFeeMax = Math.max(1, ...expectedFeeMonths.map(([, v]) => v));
  const expectedFeeTotal = expectedFeeMonths.reduce((sum, [, v]) => sum + v, 0);

  // 案件分類ごとの件数と売上（売上＝案件に入力された「着手金」＋「見込報酬額」の合計）
  const byClassification = new Map<string, { count: number; retainer: number; fee: number }>();
  visibleCases.forEach((c) => {
    const key = c.caseClassification || "未分類";
    const cur = byClassification.get(key) || { count: 0, retainer: 0, fee: 0 };
    cur.count += 1;
    cur.retainer += Number(c.retainerFee) || 0;
    cur.fee += Number(c.expectedFee) || 0;
    byClassification.set(key, cur);
  });
  const classificationRows = [...byClassification.entries()]
    .map(([name, v]) => ({ name, ...v, revenue: v.retainer + v.fee }))
    .sort((a, b) => b.count - a.count);
  const totalCases = visibleCases.length || 1;
  const revenueTotal = classificationRows.reduce((s, r) => s + r.revenue, 0);
  const retainerTotal = classificationRows.reduce((s, r) => s + r.retainer, 0);
  const feeTotal = classificationRows.reduce((s, r) => s + r.fee, 0);

  // 受任件数・終結件数は、案件一覧で非表示にした案件も含めて集計する（個人メモは除く）
  const analysisCases = cases.filter((c) => !c.isPrivate);
  const engagementGroups = groupCasesByPeriod(analysisCases, "engagementDate", caseEventGranularity);
  const engagementMax = Math.max(1, ...engagementGroups.map(([, list]) => list.length));
  let engagementCum = 0;
  const engagementWithCumulative = engagementGroups.map(([key, list]) => {
    engagementCum += list.length;
    return { key, list, cumulative: engagementCum };
  });

  const closedGroups = groupCasesByPeriod(
    analysisCases.filter((c) => c.stage === "終結"),
    "closedDate",
    caseEventGranularity
  );
  const closedMax = Math.max(1, ...closedGroups.map(([, list]) => list.length));
  let closedCum = 0;
  const closedWithCumulative = closedGroups.map(([key, list]) => {
    closedCum += list.length;
    return { key, list, cumulative: closedCum };
  });

  const toggleSort = (key: ColumnKey) => {
    if (sortKey === key) {
      setSortDir((d) => (d === 1 ? -1 : 1));
    } else {
      setSortKey(key);
      setSortDir(1);
    }
  };

  const sortedCases = [...tableCases].sort((a, b) => {
    const av = cellValue(a, sortKey);
    const bv = cellValue(b, sortKey);
    if (av === bv) return 0;
    return (av < bv ? -1 : 1) * sortDir;
  });

  return (
    <div className="flex-1 overflow-y-auto p-6">
      <div className="max-w-6xl mx-auto">
        <div className="flex items-center justify-between mb-5 flex-wrap gap-2">
          <h2 className="text-lg" style={{ fontFamily: FONT_MINCHO, color: COLORS.navy }}>分析</h2>
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

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
          <div className="rounded p-4" style={{ backgroundColor: COLORS.card, border: `1px solid ${COLORS.brassLight}` }}>
            <p className="text-xs" style={{ color: COLORS.slate }}>総案件数</p>
            <p className="text-2xl mt-1" style={{ fontFamily: FONT_MINCHO, color: COLORS.navy }}>{periodCases.length}</p>
          </div>
          <button onClick={onGoToActiveCases} className="rounded p-4 text-left hover:opacity-90 transition" style={{ backgroundColor: COLORS.card, border: `1px solid ${COLORS.brassLight}` }}>
            <p className="text-xs" style={{ color: COLORS.slate }}>対応中</p>
            <p className="text-2xl mt-1" style={{ fontFamily: FONT_MINCHO, color: COLORS.vermillion }}>{activeCount}</p>
          </button>
          <div className="rounded p-4 relative group" style={{ backgroundColor: COLORS.card, border: `1px solid ${COLORS.brassLight}` }}>
            <p className="text-xs" style={{ color: COLORS.slate }}>顧問数</p>
            <p className="text-2xl mt-1" style={{ fontFamily: FONT_MINCHO, color: COLORS.navy }}>{advisors.length}</p>
            {advisors.length > 0 && (
              <div
                className="hidden group-hover:block absolute left-0 top-full mt-1 z-10 rounded p-3 text-xs shadow-lg"
                style={{ backgroundColor: COLORS.card, border: `1px solid ${COLORS.brassLight}`, width: 240, maxHeight: 260, overflowY: "auto" }}
              >
                {advisors.map((c) => (
                  <div key={c.id} className="py-0.5 truncate">{c.companyName}</div>
                ))}
              </div>
            )}
          </div>
          <div className="rounded p-4 relative group" style={{ backgroundColor: COLORS.card, border: `1px solid ${COLORS.brassLight}` }}>
            <p className="text-xs" style={{ color: COLORS.slate }}>今後の期日</p>
            <p className="text-2xl mt-1" style={{ fontFamily: FONT_MINCHO, color: COLORS.moss }}>{upcoming.length}</p>
            {upcoming.length > 0 && (
              <div
                className="hidden group-hover:block absolute left-0 top-full mt-1 z-10 rounded p-3 text-xs shadow-lg"
                style={{ backgroundColor: COLORS.card, border: `1px solid ${COLORS.brassLight}`, width: 280, maxHeight: 260, overflowY: "auto" }}
              >
                {upcoming.map(({ case: c, hearing: h }) => (
                  <div key={h.id} className="flex items-center justify-between gap-2 py-0.5">
                    <span className="truncate">{c.title}</span>
                    <span className="flex-shrink-0" style={{ color: COLORS.slate }}>{formatDateShort(h.nextHearingDate)}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        <div className="grid grid-cols-1 gap-4 mb-6">
          <div className="rounded p-5" style={{ backgroundColor: COLORS.card, border: `1px solid ${COLORS.brassLight}` }}>
            <h3 className="text-sm font-bold mb-3" style={{ fontFamily: FONT_MINCHO, color: COLORS.navy }}>ステータス</h3>
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
        </div>

        {/* v16：「データ」タブと統合。案件横断の集計・傾向を表示する（期間フィルターの影響を受けない）。 */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-5 mb-6">
          <SummaryCard title="受任日 → 通知書発送日（平均日数）">
            <p className="text-3xl font-bold" style={{ color: COLORS.navy }}>
              {engagementToNotice !== null ? `${engagementToNotice}日` : "—"}
            </p>
          </SummaryCard>
        </div>

        <div className="mb-6">
          <SummaryCard title="未終結案件の見込報酬額（月別）">
            {expectedFeeMonths.length === 0 ? (
              <p className="text-sm" style={{ color: COLORS.slate }}>データがありません。</p>
            ) : (
              <div className="flex flex-col gap-1.5">
                {expectedFeeMonths.map(([ym, v]) => (
                  <div key={ym} className="relative group">
                    <BarRow label={ym} value={v} max={expectedFeeMax} formatValue={(n) => `¥${n.toLocaleString("ja-JP")}`} />
                    {/* マウスを合わせると、その月の案件名と見込報酬額をフロート表示する */}
                    <div
                      className="hidden group-hover:block absolute left-0 top-full mt-1 z-10 rounded p-3 text-xs shadow-lg"
                      style={{ backgroundColor: COLORS.card, border: `1px solid ${COLORS.brassLight}`, width: 320, maxHeight: 260, overflowY: "auto" }}
                    >
                      {(expectedFeeCasesByMonth.get(ym) || []).map((c) => (
                        <div key={c.id} className="flex items-center justify-between gap-2 py-0.5">
                          <span className="truncate">{c.caseNumber}.{c.title}</span>
                          <span className="flex-shrink-0 font-bold">¥{Number(c.expectedFee).toLocaleString("ja-JP")}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
                <div className="flex items-center justify-between text-sm font-bold pt-2 mt-1" style={{ borderTop: `1px solid ${COLORS.brassLight}`, color: COLORS.navy }}>
                  <span>合計</span>
                  <span>¥{expectedFeeTotal.toLocaleString("ja-JP")}</span>
                </div>
              </div>
            )}
          </SummaryCard>
        </div>

        <div className="grid grid-cols-1 gap-5 mb-6">
          <SummaryCard title="案件分類の割合・売上">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-xs" style={{ color: COLORS.slate, borderBottom: `1px solid ${COLORS.brassLight}` }}>
                    <th className="text-left font-normal py-1 pr-2">分類</th>
                    <th className="text-right font-normal py-1 px-2 whitespace-nowrap">件数（割合）</th>
                    <th className="text-right font-normal py-1 px-2 whitespace-nowrap">着手金</th>
                    <th className="text-right font-normal py-1 px-2 whitespace-nowrap">見込報酬額</th>
                    <th className="text-right font-normal py-1 pl-2 whitespace-nowrap">売上（割合）</th>
                  </tr>
                </thead>
                <tbody>
                  {classificationRows.map((r) => (
                    <tr key={r.name} style={{ borderBottom: `1px solid ${COLORS.paper}` }}>
                      <td className="py-1.5 pr-2">{r.name}</td>
                      <td className="py-1.5 px-2 text-right whitespace-nowrap" style={{ color: COLORS.slate }}>{r.count}件（{Math.round((r.count / totalCases) * 100)}%）</td>
                      <td className="py-1.5 px-2 text-right whitespace-nowrap">{yen(r.retainer)}</td>
                      <td className="py-1.5 px-2 text-right whitespace-nowrap">{yen(r.fee)}</td>
                      <td className="py-1.5 pl-2 text-right whitespace-nowrap font-bold">
                        {yen(r.revenue)}
                        <span className="font-normal text-xs ml-1" style={{ color: COLORS.slate }}>（{revenueTotal > 0 ? Math.round((r.revenue / revenueTotal) * 100) : 0}%）</span>
                      </td>
                    </tr>
                  ))}
                  <tr className="font-bold" style={{ borderTop: `2px solid ${COLORS.brassLight}` }}>
                    <td className="py-1.5 pr-2">合計</td>
                    <td className="py-1.5 px-2 text-right whitespace-nowrap">{visibleCases.length}件</td>
                    <td className="py-1.5 px-2 text-right whitespace-nowrap">{yen(retainerTotal)}</td>
                    <td className="py-1.5 px-2 text-right whitespace-nowrap">{yen(feeTotal)}</td>
                    <td className="py-1.5 pl-2 text-right whitespace-nowrap">{yen(revenueTotal)}</td>
                  </tr>
                </tbody>
              </table>
            </div>
            <p className="text-xs mt-2" style={{ color: COLORS.slate }}>売上は、各案件に入力された「着手金」と「見込報酬額」の合計です（終結した案件も含みます）。</p>
          </SummaryCard>
        </div>

        <div className="mb-6">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-bold" style={{ fontFamily: FONT_MINCHO, color: COLORS.navy, letterSpacing: "0.05em" }}>受任件数・終結件数</h3>
            <div className="flex gap-1">
              {(["month", "year"] as const).map((g) => (
                <button
                  key={g}
                  onClick={() => setCaseEventGranularity(g)}
                  className="text-xs px-2.5 py-1 rounded-full"
                  style={{
                    backgroundColor: caseEventGranularity === g ? COLORS.navy : "transparent",
                    color: caseEventGranularity === g ? "#fff" : COLORS.slate,
                    border: `1px solid ${caseEventGranularity === g ? COLORS.navy : COLORS.brassLight}`,
                  }}
                >
                  {g === "month" ? "月別" : "年別"}
                </button>
              ))}
            </div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
            <div className="rounded p-5" style={{ backgroundColor: COLORS.card, border: `1px solid ${COLORS.brassLight}` }}>
              <h4 className="text-sm font-bold mb-4" style={{ fontFamily: FONT_MINCHO, color: COLORS.navy }}>受任件数</h4>
              {engagementWithCumulative.length === 0 ? (
                <p className="text-sm" style={{ color: COLORS.slate }}>受任日が登録された案件がありません。</p>
              ) : (
                <div className="flex flex-col gap-1.5">
                  {engagementWithCumulative.map(({ key, list, cumulative: cum }) => (
                    <PeriodCountRow key={key} label={key} cases={list} cumulative={cum} max={engagementMax} onOpenCase={onOpenCase} />
                  ))}
                </div>
              )}
            </div>
            <div className="rounded p-5" style={{ backgroundColor: COLORS.card, border: `1px solid ${COLORS.brassLight}` }}>
              <h4 className="text-sm font-bold mb-4" style={{ fontFamily: FONT_MINCHO, color: COLORS.navy }}>終結件数</h4>
              {closedWithCumulative.length === 0 ? (
                <p className="text-sm" style={{ color: COLORS.slate }}>終結日が登録された案件がありません。</p>
              ) : (
                <div className="flex flex-col gap-1.5">
                  {closedWithCumulative.map(({ key, list, cumulative: cum }) => (
                    <PeriodCountRow key={key} label={key} cases={list} cumulative={cum} max={closedMax} onOpenCase={onOpenCase} />
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="rounded p-5" style={{ backgroundColor: COLORS.card, border: `1px solid ${COLORS.brassLight}` }}>
          <div className="flex items-center justify-between mb-3 gap-2 flex-wrap">
            <h3 className="text-sm font-bold" style={{ fontFamily: FONT_MINCHO, color: COLORS.navy }}>案件一覧表</h3>
            <label className="flex items-center gap-1.5 text-xs" style={{ color: COLORS.slate }}>
              <input type="checkbox" checked={showClosedInTable} onChange={(e) => setShowClosedInTable(e.target.checked)} /> 終結した案件も表示する
            </label>
          </div>
          <table className="text-xs w-full table-fixed">
            <thead>
              <tr style={{ color: COLORS.slate, borderBottom: `1px solid ${COLORS.brassLight}` }}>
                {COLUMNS.map((col) => (
                  <th key={col.key} className="text-left py-1.5 pr-2 font-normal cursor-pointer select-none" onClick={() => toggleSort(col.key)}>
                    <span className="flex items-center gap-0.5">
                      {col.label}
                      {sortKey === col.key && (sortDir === 1 ? <ChevronUp size={11} /> : <ChevronDown size={11} />)}
                    </span>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              <tr className="font-bold" style={{ borderBottom: `2px solid ${COLORS.brassLight}` }}>
                <td className="py-1.5 pr-2" colSpan={7}>合計</td>
                <td className="py-1.5 pr-2 text-right">{yen(financeTotals.claimAmount)}</td>
                <td className="py-1.5 pr-2 text-right">{yen(financeTotals.recoveredAmount)}</td>
                <td className="py-1.5 pr-2 text-right">{yen(financeTotals.retainerFee)}</td>
                <td className="py-1.5 pr-2 text-right">{yen(financeTotals.expectedFee)}</td>
                <td></td>
                <td></td>
              </tr>
              {sortedCases.map((c) => (
                <tr key={c.id} className="hover:opacity-90" style={{ borderBottom: `1px solid ${COLORS.paper}` }}>
                  <td className="py-1.5 pr-2 truncate cursor-pointer" onClick={() => onOpenCase(c.id)}>{c.caseNumber}</td>
                  <td className="py-1.5 pr-2 truncate cursor-pointer" onClick={() => onOpenCase(c.id)}>{c.title}</td>
                  <td className="py-1.5 pr-2 truncate">
                    <EditableCell value={c.caseClassification} onSave={(v) => saveFinanceField(c.id, { caseClassification: v })} />
                  </td>
                  <td className="py-1.5 pr-2 truncate">
                    <EditableCell value={c.opposingParty} onSave={(v) => saveFinanceField(c.id, { opposingParty: v })} />
                  </td>
                  <td className="py-1.5 pr-2 truncate">
                    <EditableCell type="date" value={c.engagementDate} onSave={(v) => saveFinanceField(c.id, { engagementDate: v })} />
                  </td>
                  <td className="py-1.5 pr-2 truncate">
                    <EditableCell type="date" value={c.noticeSentDate} onSave={(v) => saveFinanceField(c.id, { noticeSentDate: v })} />
                  </td>
                  <td className="py-1.5 pr-2 truncate">
                    <EditableCell type="date" value={c.filingDate} onSave={(v) => saveFinanceField(c.id, { filingDate: v })} />
                  </td>
                  <td className="py-1.5 pr-2 truncate text-right">
                    <EditableCell type="number" align="right" value={c.claimAmount === "" ? "" : String(c.claimAmount)} display={yen(c.claimAmount)} onSave={(v) => saveFinanceField(c.id, { claimAmount: v === "" ? "" : Number(v) })} />
                  </td>

                  <td className="py-1.5 pr-2 truncate text-right">
                    <EditableCell type="number" align="right" value={c.recoveredAmount === "" ? "" : String(c.recoveredAmount)} display={yen(c.recoveredAmount)} onSave={(v) => saveFinanceField(c.id, { recoveredAmount: v === "" ? "" : Number(v) })} />
                  </td>
                  <td className="py-1.5 pr-2 truncate text-right">
                    <EditableCell type="number" align="right" value={c.retainerFee === "" ? "" : String(c.retainerFee)} display={yen(c.retainerFee)} onSave={(v) => saveFinanceField(c.id, { retainerFee: v === "" ? "" : Number(v) })} />
                  </td>
                  <td className="py-1.5 pr-2 truncate text-right">
                    <EditableCell type="number" align="right" value={c.expectedFee === "" ? "" : String(c.expectedFee)} display={yen(c.expectedFee)} onSave={(v) => saveFinanceField(c.id, { expectedFee: v === "" ? "" : Number(v) })} />
                  </td>
                  <td className="py-1.5 pr-2 truncate">
                    <EditableCell type="date" value={c.expectedFeeDate} onSave={(v) => saveFinanceField(c.id, { expectedFeeDate: v })} />
                  </td>
                  <td className="py-1.5 pr-2 truncate">
                    <EditableCell type="date" value={c.closedDate} onSave={(v) => saveFinanceField(c.id, { closedDate: v })} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

/** 案件一覧表のセル直接編集（v6 4.10）。クリックでinputに切り替わり、blur/Enterで保存する。 */
function EditableCell({
  value,
  display,
  type = "text",
  align,
  onSave,
}: {
  value: string;
  display?: string;
  type?: "text" | "date" | "number";
  align?: "right";
  onSave: (v: string) => void;
}) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(value);

  if (!editing) {
    return (
      <span
        onClick={(e) => {
          e.stopPropagation();
          setDraft(value);
          setEditing(true);
        }}
        className="block min-h-[1.2em] cursor-text hover:opacity-70 truncate"
        style={{ color: value ? undefined : COLORS.slate }}
      >
        {display ?? value ?? "－"}
      </span>
    );
  }

  const commit = () => {
    setEditing(false);
    if (draft !== value) onSave(draft);
  };

  return (
    <input
      autoFocus
      type={type}
      value={draft}
      onClick={(e) => e.stopPropagation()}
      onChange={(e) => setDraft(e.target.value)}
      onBlur={commit}
      onKeyDown={(e) => {
        if (e.key === "Enter") (e.target as HTMLInputElement).blur();
        if (e.key === "Escape") {
          setDraft(value);
          setEditing(false);
        }
      }}
      className="text-xs p-1 rounded outline-none w-full"
      style={{ border: `1px solid ${COLORS.brassLight}`, textAlign: align }}
    />
  );
}
