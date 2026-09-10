"use client";

import { COLORS, FONT_MINCHO, BALL_COLOR } from "@/lib/constants";
import { formatDate, formatDateShort, relativeDayLabel, todayStr } from "@/lib/dates";
import { upcomingItems } from "@/lib/business/hearings";
import type { Case } from "@/lib/types";

interface Props {
  cases: Case[];
  onOpenCase: (id: string) => void;
}

// v16：個人画面（日報）の左半分に埋め込んで表示するため、ページ全体のラッパーは持たず
// 中身（見出し＋一覧）のみを描画する。
export default function UpcomingHearingsView({ cases, onOpenCase }: Props) {
  const visible = cases.filter((c) => !c.hidden && !c.isPrivate);
  const upcoming = upcomingItems(visible);
  const t = todayStr();

  return (
    <div>
      <h2 className="text-lg mb-1" style={{ fontFamily: FONT_MINCHO, color: COLORS.navy }}>今後の期日</h2>
      <p className="text-xs mb-5" style={{ color: COLORS.slate }}>各案件の最新の次回裁判期日と、次回予定を合わせて一覧表示しています</p>
      {upcoming.length === 0 ? (
        <p className="text-sm py-10 text-center rounded" style={{ color: COLORS.slate, backgroundColor: COLORS.card, border: `1px solid ${COLORS.brassLight}` }}>今後の期日・予定は登録されていません。</p>
      ) : (
        <div className="flex flex-col gap-3">
          {upcoming.map((item) => {
            const ballDisplay = item.case.ballOwner === "事務所" && item.case.ballAssignee ? item.case.ballAssignee : item.case.ballOwner;
            return (
              <button
                key={`${item.kind}-${item.id}`}
                onClick={() => onOpenCase(item.case.id)}
                className="text-left rounded p-4 flex items-start gap-4 transition hover:opacity-90"
                style={{ backgroundColor: COLORS.card, border: `1px solid ${COLORS.brassLight}` }}
              >
                <div className="flex-shrink-0 text-center" style={{ width: 64 }}>
                  <p className="text-xs font-bold" style={{ color: item.date === t ? COLORS.vermillion : COLORS.navy }}>
                    {relativeDayLabel(item.date)}
                  </p>
                  <p className="text-sm" style={{ color: COLORS.slate }}>{formatDateShort(item.date)}</p>
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-xs" style={{ color: COLORS.slate }}>No. {item.case.caseNumber}</span>
                    {item.kind === "plan" && (
                      <span className="text-xs font-bold px-1.5 py-0.5 rounded-full" style={{ backgroundColor: COLORS.brassLight, color: COLORS.navy }}>次回予定</span>
                    )}
                    {ballDisplay && (
                      <span className="text-xs font-bold px-1.5 py-0.5 rounded-full" style={{ backgroundColor: BALL_COLOR[item.case.ballOwner], color: "#fff" }}>
                        ボール：{ballDisplay}
                      </span>
                    )}
                  </div>
                  <p className="text-sm font-semibold mt-1" style={{ fontFamily: FONT_MINCHO }}>{item.case.title}</p>
                  <p className="text-sm mt-1">{item.content}</p>
                  {item.kind === "hearing" && item.docDeadline && (
                    <p className="text-xs mt-0.5" style={{ color: item.docDeadline < t ? COLORS.vermillion : COLORS.slate }}>書面提出期限：{formatDate(item.docDeadline)}</p>
                  )}
                </div>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
