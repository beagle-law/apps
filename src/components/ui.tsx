"use client";

import { COLORS, FONT_MINCHO, FONT_GOTHIC, STAGE_COLOR, STAGE_SEAL_TEXT } from "@/lib/constants";

export function Seal({ stage, size = "md" }: { stage: string; size?: "sm" | "md" }) {
  const color = STAGE_COLOR[stage] || COLORS.slate;
  const dims = size === "sm" ? 36 : 44;
  return (
    <div
      style={{
        width: dims,
        height: dims,
        borderRadius: "9999px",
        border: `2px solid ${color}`,
        color,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        flexShrink: 0,
        transform: "rotate(-6deg)",
        fontFamily: FONT_MINCHO,
        backgroundColor: "rgba(255,255,255,0.4)",
      }}
    >
      <span
        className="text-xs font-bold"
        style={{ writingMode: "vertical-rl", textOrientation: "upright", letterSpacing: "0.05em" }}
      >
        {STAGE_SEAL_TEXT[stage] || stage}
      </span>
    </div>
  );
}

export function Badge({
  children,
  color,
  filled,
}: {
  children: React.ReactNode;
  color: string;
  filled?: boolean;
}) {
  return (
    <span
      className="text-xs font-bold px-2 py-0.5 rounded-full inline-block"
      style={{
        color: filled ? "#fff" : color,
        backgroundColor: filled ? color : "transparent",
        border: `1px solid ${color}`,
        fontFamily: FONT_GOTHIC,
      }}
    >
      {children}
    </span>
  );
}

export function Pill({
  children,
  active,
  color,
  onClick,
}: {
  children: React.ReactNode;
  active: boolean;
  color: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="text-xs font-bold px-3 py-1.5 rounded-full transition"
      style={{
        backgroundColor: active ? color : "transparent",
        color: active ? "#fff" : color,
        border: `1px solid ${color}`,
      }}
    >
      {children}
    </button>
  );
}

export function FieldLabel({ children }: { children: React.ReactNode }) {
  return (
    <p className="text-xs mb-1.5" style={{ color: COLORS.slate }}>
      {children}
    </p>
  );
}

/** 年タブ・月タブで任意の年月を選択するナビゲーション（目標画面・日報閲覧で共通利用、v6 4.14） */
export function YearMonthNav({
  yearMonth,
  onChange,
  yearsBefore = 2,
  yearsAfter = 1,
}: {
  yearMonth: string; // "YYYY-MM"
  onChange: (next: string) => void;
  yearsBefore?: number;
  yearsAfter?: number;
}) {
  const [selYear, selMonth] = yearMonth.split("-").map(Number);
  const thisYear = new Date().getFullYear();
  const years: number[] = [];
  for (let y = thisYear - yearsBefore; y <= thisYear + yearsAfter; y++) years.push(y);
  if (!years.includes(selYear)) years.push(selYear);
  years.sort((a, b) => a - b);

  const setYear = (y: number) => onChange(`${y}-${String(selMonth).padStart(2, "0")}`);
  const setMonth = (m: number) => onChange(`${selYear}-${String(m).padStart(2, "0")}`);

  return (
    <div className="flex flex-col gap-2">
      <div className="flex gap-1.5 flex-wrap">
        {years.map((y) => (
          <Pill key={y} active={y === selYear} color={COLORS.navy} onClick={() => setYear(y)}>{y}年</Pill>
        ))}
      </div>
      <div className="flex gap-1.5 flex-wrap">
        {Array.from({ length: 12 }, (_, i) => i + 1).map((m) => (
          <Pill key={m} active={m === selMonth} color={COLORS.brass} onClick={() => setMonth(m)}>{m}月</Pill>
        ))}
      </div>
    </div>
  );
}

export function TextInput(props: React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      {...props}
      className={`text-sm p-2 rounded outline-none ${props.className || ""}`}
      style={{ border: `1px solid ${COLORS.brassLight}`, ...(props.style || {}) }}
    />
  );
}
