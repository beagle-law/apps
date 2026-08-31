"use client";

import { Search, Plus, Eye, EyeOff } from "lucide-react";
import { COLORS, FONT_MINCHO, BALL_OWNERS, BALL_COLOR } from "@/lib/constants";
import type { Case } from "@/lib/types";

interface Props {
  allCases: Case[];
  cases: Case[];
  selectedId: string | null;
  searchQuery: string;
  ballFilter: string;
  showHiddenCases: boolean;
  onSearchChange: (v: string) => void;
  onBallFilterChange: (v: string) => void;
  onToggleShowHidden: () => void;
  onSelect: (id: string) => void;
  onToggleHidden: (id: string) => void;
  onNewCase: () => void;
  widthPx?: number;
}

export default function CaseListSidebar({
  allCases,
  cases,
  selectedId,
  searchQuery,
  ballFilter,
  showHiddenCases,
  onSearchChange,
  onBallFilterChange,
  onToggleShowHidden,
  onSelect,
  onToggleHidden,
  onNewCase,
  widthPx,
}: Props) {
  const hiddenCount = allCases.filter((c) => c.hidden).length;

  return (
    <aside
      className="w-full md:w-80 flex-shrink-0 flex flex-col border-b md:border-b-0 md:border-r"
      style={{ borderColor: COLORS.brassLight, backgroundColor: "#EAE4D6", width: widthPx }}
    >
      <div className="p-3 flex flex-col gap-2">
        <div className="flex items-center gap-2 px-2 py-1.5 rounded" style={{ backgroundColor: COLORS.card, border: `1px solid ${COLORS.brassLight}` }}>
          <Search size={15} color={COLORS.slate} />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            className="text-sm outline-none flex-1 bg-transparent"
          />
        </div>
        <div className="flex gap-1 flex-wrap">
          {BALL_OWNERS.map((b) => (
            <button
              key={b}
              onClick={() => onBallFilterChange(ballFilter === b ? "" : b)}
              className="text-xs px-2 py-1 rounded-full transition"
              style={{
                backgroundColor: ballFilter === b ? COLORS.navy : "transparent",
                color: ballFilter === b ? "#fff" : COLORS.slate,
                border: `1px solid ${ballFilter === b ? COLORS.navy : COLORS.brassLight}`,
              }}
            >
              {b}
            </button>
          ))}
        </div>
        <button onClick={onToggleShowHidden} className="text-xs self-start underline" style={{ color: showHiddenCases ? COLORS.vermillion : COLORS.slate }}>
          {showHiddenCases ? "通常の一覧に戻る" : `非表示の案件を表示（${hiddenCount}件）`}
        </button>
        {!showHiddenCases && (
          <button
            onClick={onNewCase}
            className="flex items-center justify-center gap-1 text-sm font-bold py-2 rounded transition hover:opacity-90"
            style={{ backgroundColor: COLORS.vermillion, color: "#fff" }}
          >
            <Plus size={15} /> 新規案件を登録
          </button>
        )}
      </div>

      <div className="flex-1 overflow-y-auto px-3 pb-3 flex flex-col gap-1.5">
        {cases.length === 0 && (
          <p className="text-sm text-center py-8" style={{ color: COLORS.slate }}>
            {showHiddenCases ? "非表示の案件はありません" : "該当する案件がありません"}
          </p>
        )}
        {cases.map((c) => (
          <div key={c.id} className="relative group">
            <button
              onClick={() => onSelect(c.id)}
              className="w-full text-left px-2.5 py-1.5 rounded flex flex-col gap-0.5 transition"
              style={{
                backgroundColor: COLORS.card,
                borderTop: `1px solid ${selectedId === c.id ? COLORS.navy : COLORS.brassLight}`,
                borderRight: `1px solid ${selectedId === c.id ? COLORS.navy : COLORS.brassLight}`,
                borderBottom: `1px solid ${selectedId === c.id ? COLORS.navy : COLORS.brassLight}`,
                borderLeft: `1px solid ${selectedId === c.id ? COLORS.navy : COLORS.brassLight}`,
                boxShadow: selectedId === c.id ? "0 1px 4px rgba(0,0,0,0.12)" : "none",
              }}
            >
              <div className="flex items-center gap-2 text-xs">
                <span className="flex-shrink-0" style={{ color: COLORS.slate }}>No.{c.caseNumber}</span>
                <p className="text-sm font-semibold leading-snug truncate flex-1" style={{ fontFamily: FONT_MINCHO }}>
                  {c.title}{c.isPrivate && "　個人メモ"}
                </p>
                <span className="font-bold flex-shrink-0" style={{ color: BALL_COLOR[c.ballOwner] }}>{c.ballOwner}{c.ballAssignee ? `：${c.ballAssignee}` : ""}</span>
              </div>
            </button>
            <button
              onClick={(e) => {
                e.stopPropagation();
                onToggleHidden(c.id);
              }}
              className="absolute top-1.5 right-1.5 opacity-0 group-hover:opacity-100 transition"
              style={{ color: COLORS.slate }}
              title={c.hidden ? "表示に戻す" : "案件を非表示にする"}
            >
              {c.hidden ? <Eye size={13} /> : <EyeOff size={13} />}
            </button>
          </div>
        ))}
      </div>
    </aside>
  );
}
