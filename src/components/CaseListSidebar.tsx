"use client";

import { Search, Plus, Users, Calendar } from "lucide-react";
import { COLORS, FONT_MINCHO, BALL_COLOR } from "@/lib/constants";
import { formatDateShort } from "@/lib/dates";
import { nextHearing } from "@/lib/business/hearings";
import { Badge, Seal } from "@/components/ui";
import type { Case } from "@/lib/types";

const GROUP_FILTERS = ["すべて", "対応前", "対応中", "終了", "非表示"];

interface Props {
  cases: Case[];
  selectedId: string | null;
  searchQuery: string;
  groupFilter: string;
  onSearchChange: (v: string) => void;
  onGroupFilterChange: (v: string) => void;
  onSelect: (id: string) => void;
  onNewCase: () => void;
}

export default function CaseListSidebar({
  cases,
  selectedId,
  searchQuery,
  groupFilter,
  onSearchChange,
  onGroupFilterChange,
  onSelect,
  onNewCase,
}: Props) {
  return (
    <aside
      className="w-full md:w-80 flex flex-col border-b md:border-b-0 md:border-r"
      style={{ borderColor: COLORS.brassLight, backgroundColor: "#EAE4D6" }}
    >
      <div className="p-3 flex flex-col gap-2">
        <div className="flex items-center gap-2 px-2 py-1.5 rounded" style={{ backgroundColor: COLORS.card, border: `1px solid ${COLORS.brassLight}` }}>
          <Search size={15} color={COLORS.slate} />
          <input
            type="text"
            placeholder="案件番号・依頼者・タイトル・担当者で検索"
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            className="text-sm outline-none flex-1 bg-transparent"
          />
        </div>
        <div className="flex gap-1 flex-wrap">
          {GROUP_FILTERS.map((s) => (
            <button
              key={s}
              onClick={() => onGroupFilterChange(s)}
              className="text-xs px-2 py-1 rounded-full transition"
              style={{
                backgroundColor: groupFilter === s ? COLORS.navy : "transparent",
                color: groupFilter === s ? "#fff" : COLORS.slate,
                border: `1px solid ${groupFilter === s ? COLORS.navy : COLORS.brassLight}`,
              }}
            >
              {s === "終了" ? "終件" : s}
            </button>
          ))}
        </div>
        <button
          onClick={onNewCase}
          className="flex items-center justify-center gap-1 text-sm font-bold py-2 rounded transition hover:opacity-90"
          style={{ backgroundColor: COLORS.vermillion, color: "#fff" }}
        >
          <Plus size={15} /> 新規案件を登録
        </button>
      </div>

      <div className="flex-1 overflow-y-auto px-3 pb-3 flex flex-col gap-2">
        {cases.length === 0 && (
          <p className="text-sm text-center py-8" style={{ color: COLORS.slate }}>
            該当する案件がありません
          </p>
        )}
        {cases.map((c) => {
          const nh = nextHearing(c);
          return (
            <button
              key={c.id}
              onClick={() => onSelect(c.id)}
              className="text-left p-2.5 rounded flex flex-col gap-1 transition relative"
              style={{
                backgroundColor: COLORS.card,
                borderTop: `1px solid ${selectedId === c.id ? COLORS.navy : COLORS.brassLight}`,
                borderRight: `1px solid ${selectedId === c.id ? COLORS.navy : COLORS.brassLight}`,
                borderBottom: `1px solid ${selectedId === c.id ? COLORS.navy : COLORS.brassLight}`,
                borderLeft: c.priority === "至急" ? `4px solid ${COLORS.vermillion}` : `1px solid ${selectedId === c.id ? COLORS.navy : COLORS.brassLight}`,
                boxShadow: selectedId === c.id ? "0 1px 4px rgba(0,0,0,0.12)" : "none",
              }}
            >
              <div className="flex items-center justify-between">
                <span className="text-xs truncate" style={{ color: COLORS.slate }}>
                  No. {c.caseNumber}{c.isPrivate && "　個人メモ"}
                </span>
                <Seal stage={c.stage} size="sm" />
              </div>
              <p className="text-sm font-semibold leading-snug truncate" style={{ fontFamily: FONT_MINCHO }}>
                {c.title}
              </p>
              <div className="flex items-center justify-between gap-2 text-xs" style={{ color: COLORS.slate }}>
                <span className="truncate">{c.clientName}</span>
                <div className="flex items-center gap-1.5 flex-shrink-0">
                  {c.caseClassification && <Badge color={COLORS.brass}>{c.caseClassification}</Badge>}
                  <span className="font-bold" style={{ color: BALL_COLOR[c.ballOwner] }}>{c.ballOwner}{c.ballAssignee ? `：${c.ballAssignee}` : ""}</span>
                </div>
              </div>
              {(nh || c.teamMembers.length > 0) && (
                <div className="flex items-center justify-between text-xs" style={{ color: COLORS.slate }}>
                  {c.teamMembers.length > 0 && (
                    <span className="flex items-center gap-1">
                      <Users size={11} /> {c.teamMembers[0]}{c.teamMembers.length > 1 ? ` ほか${c.teamMembers.length - 1}名` : ""}
                    </span>
                  )}
                  {nh && (
                    <span className="flex items-center gap-1" style={{ color: COLORS.vermillion }}>
                      <Calendar size={11} /> {formatDateShort(nh.nextHearingDate)}
                    </span>
                  )}
                </div>
              )}
            </button>
          );
        })}
      </div>
    </aside>
  );
}
