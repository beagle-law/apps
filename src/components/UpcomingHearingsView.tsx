"use client";

import { useState } from "react";
import { Search } from "lucide-react";
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
  const [query, setQuery] = useState("");
  const q = query.trim().toLowerCase();
  // 案件番号・案件名・顧客名・期日の内容で絞り込む
  const upcoming = upcomingItems(visible).filter(
    (item) =>
      !q ||
      item.case.caseNumber.toLowerCase().includes(q) ||
      item.case.title.toLowerCase().includes(q) ||
      item.case.clientName.toLowerCase().includes(q) ||
      item.content.toLowerCase().includes(q)
  );
  const t = todayStr();

  return (
    <div>
      <h2 className="text-lg mb-1" style={{ fontFamily: FONT_MINCHO, color: COLORS.navy }}>今後の期日</h2>
      <p className="text-xs mb-3" style={{ color: COLORS.slate }}>各案件の最新の次回裁判期日を一覧表示しています</p>
      <div className="flex items-center gap-2 px-2 py-1.5 rounded mb-4" style={{ backgroundColor: COLORS.card, border: `1px solid ${COLORS.brassLight}` }}>
        <Search size={15} color={COLORS.slate} />
        <input type="text" value={query} onChange={(e) => setQuery(e.target.value)} placeholder="顧客名・案件名・案件番号で絞り込み" className="text-sm outline-none flex-1 bg-transparent" />
      </div>
      {upcoming.length === 0 ? (
        <p className="text-sm py-10 text-center rounded" style={{ color: COLORS.slate, backgroundColor: COLORS.card, border: `1px solid ${COLORS.brassLight}` }}>今後の期日・予定は登録されていません。</p>
      ) : (
        <div className="flex flex-col gap-3">
          {upcoming.map((item) => {
            const ballDisplay = item.case.ballOwner === "事務所" && item.case.ballAssignee ? item.case.ballAssignee : item.case.ballOwner;
            return (
              <button
                key={item.id}
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
                    {ballDisplay && (
                      <span className="text-xs font-bold px-1.5 py-0.5 rounded-full" style={{ backgroundColor: BALL_COLOR[item.case.ballOwner], color: "#fff" }}>
                        ボール：{ballDisplay}
                      </span>
                    )}
                  </div>
                  {item.case.clientName && <p className="text-xs mt-1" style={{ color: COLORS.slate }}>{item.case.clientNumber !== null ? `顧客No.${item.case.clientNumber}　` : ""}{item.case.clientName}</p>}
                  <p className="text-sm font-semibold mt-0.5" style={{ fontFamily: FONT_MINCHO }}>{item.case.title}</p>
                  <p className="text-sm mt-1 whitespace-pre-wrap">{item.content}</p>
                  {item.docDeadline && (
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
