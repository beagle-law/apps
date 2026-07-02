"use client";

import { MapPin, Link2, Users } from "lucide-react";
import { COLORS, FONT_MINCHO } from "@/lib/constants";
import { formatDate, formatDateShort, plusDaysStr, relativeDayLabel, todayStr } from "@/lib/dates";
import { Badge } from "@/components/ui";
import type { Case, Hearing } from "@/lib/types";

interface Props {
  cases: Case[];
  onOpenCase: (id: string) => void;
}

export default function UpcomingHearingsView({ cases, onOpenCase }: Props) {
  const t = todayStr();
  const t7 = plusDaysStr(7);
  const upcoming: (Hearing & { case: Case })[] = cases
    .flatMap((c) => (c.hearings || []).filter((h) => h.date >= t && h.date <= t7).map((h) => ({ ...h, case: c })))
    .sort((a, b) => (a.date < b.date ? -1 : 1));

  return (
    <div className="flex-1 overflow-y-auto p-6">
      <div className="max-w-2xl mx-auto">
        <h2 className="text-lg mb-1" style={{ fontFamily: FONT_MINCHO, color: COLORS.navy }}>
          今後7日以内の期日
        </h2>
        <p className="text-xs mb-5" style={{ color: COLORS.slate }}>
          {formatDate(t)} から {formatDate(t7)} までに予定されている期日です
        </p>
        {upcoming.length === 0 ? (
          <p className="text-sm py-10 text-center rounded" style={{ color: COLORS.slate, backgroundColor: COLORS.card, border: `1px solid ${COLORS.brassLight}` }}>
            今後7日以内に登録された期日はありません。
          </p>
        ) : (
          <div className="flex flex-col gap-3">
            {upcoming.map((h) => (
              <button
                key={h.id}
                onClick={() => onOpenCase(h.case.id)}
                className="text-left rounded p-4 flex items-start gap-4 transition hover:opacity-90"
                style={{ backgroundColor: COLORS.card, border: `1px solid ${COLORS.brassLight}` }}
              >
                <div className="flex-shrink-0 text-center" style={{ width: 64 }}>
                  <p className="text-xs font-bold" style={{ color: relativeDayLabel(h.date) === "本日" ? COLORS.vermillion : COLORS.navy }}>
                    {relativeDayLabel(h.date)}
                  </p>
                  <p className="text-sm" style={{ color: COLORS.slate }}>
                    {formatDateShort(h.date)}
                  </p>
                  {h.time && (
                    <p className="text-xs" style={{ color: COLORS.slate }}>
                      {h.time}〜
                    </p>
                  )}
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <Badge color={h.case.caseCategory === "訴訟事件" ? COLORS.navy : COLORS.brass}>{h.case.caseCategory}</Badge>
                    {h.case.priority === "至急" && (
                      <Badge color={COLORS.vermillion} filled>
                        至急
                      </Badge>
                    )}
                    <span className="text-xs" style={{ color: COLORS.slate }}>
                      No. {h.case.caseNumber}
                    </span>
                  </div>
                  <p className="text-sm font-semibold mt-1" style={{ fontFamily: FONT_MINCHO }}>
                    {h.case.title}
                  </p>
                  <p className="text-sm mt-1">{h.purpose}</p>
                  {h.location && (
                    <p className="text-xs mt-0.5 flex items-center gap-1" style={{ color: COLORS.slate }}>
                      <MapPin size={11} /> {h.location}
                    </p>
                  )}
                  {h.url && (
                    <a
                      href={h.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      onClick={(e) => e.stopPropagation()}
                      className="text-xs mt-0.5 flex items-center gap-1 underline"
                      style={{ color: COLORS.navy }}
                    >
                      <Link2 size={11} /> WEB期日リンク
                    </a>
                  )}
                  {h.notes && (
                    <p className="text-xs mt-0.5" style={{ color: COLORS.slate }}>
                      {h.notes}
                    </p>
                  )}
                  {h.case.teamMembers.length > 0 && (
                    <p className="text-xs mt-1 flex items-center gap-1" style={{ color: COLORS.slate }}>
                      <Users size={11} /> {h.case.teamMembers.join("・")}
                    </p>
                  )}
                </div>
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
