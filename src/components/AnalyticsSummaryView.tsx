"use client";

import { COLORS, FONT_MINCHO } from "@/lib/constants";
import type { Case } from "@/lib/types";

interface Props {
  cases: Case[];
}

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

export default function AnalyticsSummaryView({ cases }: Props) {
  const visibleCases = cases.filter((c) => !c.isPrivate);

  // 受任日→通知書発送日／訴訟受任日→提訴日 平均日数
  const engagementToNotice = average(
    visibleCases.map((c) => daysBetween(c.engagementDate, c.noticeSentDate)).filter((v): v is number => v !== null && v >= 0)
  );
  const litigationToFiling = average(
    visibleCases.map((c) => daysBetween(c.litigationEngagementDate, c.filingDate)).filter((v): v is number => v !== null && v >= 0)
  );

  // 未終結案件の見込報酬額（月別）
  const expectedFeeByMonth = new Map<string, number>();
  visibleCases
    .filter((c) => c.stage !== "終結" && c.expectedFeeDate && c.expectedFee)
    .forEach((c) => {
      const ym = c.expectedFeeDate.slice(0, 7);
      expectedFeeByMonth.set(ym, (expectedFeeByMonth.get(ym) || 0) + Number(c.expectedFee));
    });
  const expectedFeeMonths = [...expectedFeeByMonth.entries()].sort((a, b) => (a[0] < b[0] ? -1 : 1));
  const expectedFeeMax = Math.max(1, ...expectedFeeMonths.map(([, v]) => v));

  // 案件分類の割合
  const byClassification = new Map<string, number>();
  visibleCases.forEach((c) => {
    const key = c.caseClassification || "未分類";
    byClassification.set(key, (byClassification.get(key) || 0) + 1);
  });
  const classificationRows = [...byClassification.entries()].sort((a, b) => b[1] - a[1]);
  const totalCases = visibleCases.length || 1;

  // 案件分類ごとの着手金合計
  const retainerByClassification = new Map<string, number>();
  visibleCases.forEach((c) => {
    if (!c.retainerFee) return;
    const key = c.caseClassification || "未分類";
    retainerByClassification.set(key, (retainerByClassification.get(key) || 0) + Number(c.retainerFee));
  });
  const retainerRows = [...retainerByClassification.entries()].sort((a, b) => b[1] - a[1]);
  const retainerMax = Math.max(1, ...retainerRows.map(([, v]) => v));

  // 月ごとの終結件数（累計含む）
  const closedByMonth = new Map<string, number>();
  visibleCases
    .filter((c) => c.stage === "終結" && c.closedDate)
    .forEach((c) => {
      const ym = c.closedDate.slice(0, 7);
      closedByMonth.set(ym, (closedByMonth.get(ym) || 0) + 1);
    });
  const closedMonths = [...closedByMonth.entries()].sort((a, b) => (a[0] < b[0] ? -1 : 1));
  const closedMax = Math.max(1, ...closedMonths.map(([, v]) => v));
  let cumulative = 0;
  const closedMonthsWithCumulative = closedMonths.map(([ym, count]) => {
    cumulative += count;
    return { ym, count, cumulative };
  });

  const Card = ({ title, children }: { title: string; children: React.ReactNode }) => (
    <div className="rounded p-5" style={{ backgroundColor: COLORS.card, border: `1px solid ${COLORS.brassLight}` }}>
      <h3 className="text-sm font-bold mb-4" style={{ fontFamily: FONT_MINCHO, color: COLORS.navy, letterSpacing: "0.05em" }}>{title}</h3>
      {children}
    </div>
  );

  return (
    <div className="flex-1 overflow-y-auto p-6">
      <div className="max-w-4xl mx-auto flex flex-col gap-5">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
          <Card title="受任日 → 通知書発送日（平均日数）">
            <p className="text-3xl font-bold" style={{ color: COLORS.navy }}>
              {engagementToNotice !== null ? `${engagementToNotice}日` : "—"}
            </p>
          </Card>
          <Card title="訴訟受任日 → 提訴日（平均日数）">
            <p className="text-3xl font-bold" style={{ color: COLORS.navy }}>
              {litigationToFiling !== null ? `${litigationToFiling}日` : "—"}
            </p>
          </Card>
        </div>

        <Card title="未終結案件の見込報酬額（月別）">
          {expectedFeeMonths.length === 0 ? (
            <p className="text-sm" style={{ color: COLORS.slate }}>データがありません。</p>
          ) : (
            <div className="flex flex-col gap-1.5">
              {expectedFeeMonths.map(([ym, v]) => (
                <BarRow key={ym} label={ym} value={v} max={expectedFeeMax} formatValue={(n) => `¥${n.toLocaleString("ja-JP")}`} />
              ))}
            </div>
          )}
        </Card>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
          <Card title="案件分類の割合">
            <div className="flex flex-col gap-1.5">
              {classificationRows.map(([name, count]) => (
                <div key={name} className="flex items-center justify-between text-sm">
                  <span>{name}</span>
                  <span style={{ color: COLORS.slate }}>{count}件（{Math.round((count / totalCases) * 100)}%）</span>
                </div>
              ))}
            </div>
          </Card>
          <Card title="案件分類ごとの着手金合計">
            {retainerRows.length === 0 ? (
              <p className="text-sm" style={{ color: COLORS.slate }}>データがありません。</p>
            ) : (
              <div className="flex flex-col gap-1.5">
                {retainerRows.map(([name, v]) => (
                  <BarRow key={name} label={name} value={v} max={retainerMax} formatValue={(n) => `¥${n.toLocaleString("ja-JP")}`} />
                ))}
              </div>
            )}
          </Card>
        </div>

        <Card title="月ごとの終結件数">
          {closedMonthsWithCumulative.length === 0 ? (
            <p className="text-sm" style={{ color: COLORS.slate }}>終結日が登録された案件がありません。</p>
          ) : (
            <div className="flex flex-col gap-1.5">
              {closedMonthsWithCumulative.map(({ ym, count, cumulative: cum }) => (
                <BarRow key={ym} label={ym} value={count} max={closedMax} formatValue={() => `${count}件（累計${cum}件）`} />
              ))}
            </div>
          )}
        </Card>
      </div>
    </div>
  );
}
