"use client";

import { COLORS, FONT_MINCHO } from "@/lib/constants";
import { formatDate, formatDateShort, relativeDayLabel, todayStr } from "@/lib/dates";
import { upcomingHearings } from "@/lib/business/hearings";
import { Badge } from "@/components/ui";
import type { Case } from "@/lib/types";

interface Props {
  cases: Case[];
  onOpenCase: (id: string) => void;
}

export default function UpcomingHearingsView({ cases, onOpenCase }: Props) {
  const visible = cases.filter((c) => !c.hidden && !c.isPrivate);
  const upcoming = upcomingHearings(visible);
  const t = todayStr();

  return (
    <div className="flex-1 overflow-y-auto p-6">
      <div className="max-w-2xl mx-auto">
        <h2 className="text-lg mb-1" style={{ fontFamily: FONT_MINCHO, color: COLORS.navy }}>今後の期日</h2>
        <p className="text-xs mb-5" style={{ color: COLORS.slate }}>各案件の最新の次回裁判期日を一覧表示しています</p>
        {upcoming.length === 0 ? (
          <p className="text-sm py-10 text-center rounded" style={{ color: COLORS.slate, backgroundColor: COLORS.card, border: `1px solid ${COLORS.brassLight}` }}>今後の期日は登録されていません。</p>
        ) : (
          <div className="flex flex-col gap-3">
            {upcoming.map(({ case: c, hearing: h }) => (
              <button
                key={h.id}
                onClick={() => onOpenCase(c.id)}
                className="text-left rounded p-4 flex items-start gap-4 transition hover:opacity-90"
                style={{ backgroundColor: COLORS.card, border: `1px solid ${COLORS.brassLight}` }}
              >
                <div className="flex-shrink-0 text-center" style={{ width: 64 }}>
                  <p className="text-xs font-bold" style={{ color: h.nextHearingDate === t ? COLORS.vermillion : COLORS.navy }}>
                    {relativeDayLabel(h.nextHearingDate)}
                  </p>
                  <p className="text-sm" style={{ color: COLORS.slate }}>{formatDateShort(h.nextHearingDate)}</p>
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    {c.priority === "至急" && <Badge color={COLORS.vermillion} filled>至急</Badge>}
                    <span className="text-xs" style={{ color: COLORS.slate }}>No. {c.caseNumber}</span>
                  </div>
                  <p className="text-sm font-semibold mt-1" style={{ fontFamily: FONT_MINCHO }}>{c.title}</p>
                  <p className="text-sm mt-1">{h.content}</p>
                  {h.docDeadline && (
                    <p className="text-xs mt-0.5" style={{ color: h.docDeadline < t ? COLORS.vermillion : COLORS.slate }}>書面提出期限：{formatDate(h.docDeadline)}</p>
                  )}
                  {c.teamMembers.length > 0 && <p className="text-xs mt-1" style={{ color: COLORS.slate }}>{c.teamMembers.join("・")}</p>}
                </div>
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
