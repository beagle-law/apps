"use client";

import { useState } from "react";
import { ChevronLeft, ChevronRight, ChevronUp, ChevronDown } from "lucide-react";
import { COLORS, FONT_MINCHO, STAGES, STAGE_COLOR } from "@/lib/constants";
import { plusDaysStr, todayStr, formatDateShort } from "@/lib/dates";
import { getPeriodRange, getPeriodLabel, shiftAnchor, isWithinPeriod, type DashboardGranularity } from "@/lib/business/dashboard";
import { sortCasesByCaseNumber } from "@/lib/business/caseSort";
import * as api from "@/lib/api-client";
import type { Case } from "@/lib/types";

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

type ColumnKey =
  | "caseNumber"
  | "title"
  | "caseClassification"
  | "opposingParty"
  | "engagementDate"
  | "noticeSentDate"
  | "litigationEngagementDate"
  | "filingDate"
  | "claimAmount"
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
  { key: "litigationEngagementDate", label: "訴訟受任日" },
  { key: "filingDate", label: "提訴日" },
  { key: "claimAmount", label: "請求額(税込)", numeric: true },
  { key: "retainerFee", label: "着手金(税込)", numeric: true },
  { key: "expectedFee", label: "見込報酬額(税込)", numeric: true },
  { key: "expectedFeeDate", label: "報酬見込日" },
  { key: "closedDate", label: "終結日" },
];

function cellValue(c: Case, key: ColumnKey): string | number {
  switch (key) {
    case "claimAmount":
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

  const visibleCases = cases.filter((c) => !c.hidden && !c.isPrivate);
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

  // v10 4.3：「今後7日の期日」→「今後1か月間の期日」に変更、ホバーで一覧をツールチップ表示
  const t = todayStr();
  const t30 = plusDaysStr(30);
  const upcoming = visibleCases
    .flatMap((c) => (c.hearings || []).filter((h) => h.nextHearingDate && h.nextHearingDate >= t && h.nextHearingDate <= t30).map((h) => ({ case: c, hearing: h })))
    .sort((a, b) => (a.hearing.nextHearingDate < b.hearing.nextHearingDate ? -1 : 1));

  const stageMax = Math.max(1, ...Object.values(stageCounts));

  const financeTotals = periodCases.reduce(
    (acc, c) => ({
      claimAmount: acc.claimAmount + (Number(c.claimAmount) || 0),
      retainerFee: acc.retainerFee + (Number(c.retainerFee) || 0),
      expectedFee: acc.expectedFee + (Number(c.expectedFee) || 0),
    }),
    { claimAmount: 0, retainerFee: 0, expectedFee: 0 }
  );

  const toggleSort = (key: ColumnKey) => {
    if (sortKey === key) {
      setSortDir((d) => (d === 1 ? -1 : 1));
    } else {
      setSortKey(key);
      setSortDir(1);
    }
  };

  const sortedCases = [...periodCases].sort((a, b) => {
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

        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mb-6">
          <div className="rounded p-4" style={{ backgroundColor: COLORS.card, border: `1px solid ${COLORS.brassLight}` }}>
            <p className="text-xs" style={{ color: COLORS.slate }}>総案件数</p>
            <p className="text-2xl mt-1" style={{ fontFamily: FONT_MINCHO, color: COLORS.navy }}>{periodCases.length}</p>
          </div>
          <button onClick={onGoToActiveCases} className="rounded p-4 text-left hover:opacity-90 transition" style={{ backgroundColor: COLORS.card, border: `1px solid ${COLORS.brassLight}` }}>
            <p className="text-xs" style={{ color: COLORS.slate }}>対応中</p>
            <p className="text-2xl mt-1" style={{ fontFamily: FONT_MINCHO, color: COLORS.vermillion }}>{activeCount}</p>
          </button>
          <div className="rounded p-4 relative group" style={{ backgroundColor: COLORS.card, border: `1px solid ${COLORS.brassLight}` }}>
            <p className="text-xs" style={{ color: COLORS.slate }}>今後1か月間の期日</p>
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

        <div className="rounded p-5" style={{ backgroundColor: COLORS.card, border: `1px solid ${COLORS.brassLight}` }}>
          <h3 className="text-sm font-bold mb-3" style={{ fontFamily: FONT_MINCHO, color: COLORS.navy }}>案件一覧表</h3>
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
                <td className="py-1.5 pr-2" colSpan={8}>合計</td>
                <td className="py-1.5 pr-2 text-right">{yen(financeTotals.claimAmount)}</td>
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
                    <EditableCell type="date" value={c.litigationEngagementDate} onSave={(v) => saveFinanceField(c.id, { litigationEngagementDate: v })} />
                  </td>
                  <td className="py-1.5 pr-2 truncate">
                    <EditableCell type="date" value={c.filingDate} onSave={(v) => saveFinanceField(c.id, { filingDate: v })} />
                  </td>
                  <td className="py-1.5 pr-2 truncate text-right">
                    <EditableCell type="number" align="right" value={c.claimAmount === "" ? "" : String(c.claimAmount)} display={yen(c.claimAmount)} onSave={(v) => saveFinanceField(c.id, { claimAmount: v === "" ? "" : Number(v) })} />
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
