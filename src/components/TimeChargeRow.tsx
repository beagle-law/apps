"use client";

import { useState } from "react";
import { Pencil, X } from "lucide-react";
import { COLORS } from "@/lib/constants";
import { formatDateShort } from "@/lib/dates";
import { sortCasesByCaseNumber } from "@/lib/business/caseSort";
import { normalizeTimeInput, calcHoursFromTimes, formatDuration } from "@/lib/business/timecharge";
import { TextInput } from "@/components/ui";
import * as api from "@/lib/api-client";
import type { Case, TimeCharge } from "@/lib/types";

/** タイムチャージの案件プルダウンの表示：「No.12　案件名（顧客名）」。並びは案件番号の若い順 */
export const caseOptionLabel = (c: Pick<Case, "caseNumber" | "title" | "clientName">) =>
  `No.${c.caseNumber}　${c.title}${c.clientName ? `（${c.clientName}）` : ""}`;
export const sortCaseOptions = <T extends { caseNumber: string }>(cases: T[]) => sortCasesByCaseNumber(cases);

interface Props {
  t: TimeCharge;
  /** 案件プルダウンの選択肢（タイムチャージ対象の案件） */
  cases: Case[];
  /** ログイン中の本人の名前と、管理者かどうか（本人と管理者だけが、訂正・削除できる） */
  currentUserName: string;
  isAdmin: boolean;
  /** 訂正・削除ができたあとに呼ばれる（親側で取り直す） */
  onChanged: () => void;
  onError: (msg: string) => void;
  /** 日付を「2026/10/05」の形で出したいとき（過去月の未請求の一覧など） */
  fullDate?: boolean;
  /** 案件名を行の中に出す（案件が行の見出しにない一覧用） */
  showCase?: boolean;
}

// v38：スマホからも、入力したタイムチャージを訂正・削除できる行表示。
// 請求済みのものは訂正できない（請求書に反映済みのため）。削除は確認のうえで行う。
export default function TimeChargeRow({ t, cases, currentUserName, isAdmin, onChanged, onError, fullDate, showCase }: Props) {
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [draft, setDraft] = useState({ date: t.date, caseId: t.caseId, startTime: t.startTime, endTime: t.endTime, content: t.content });

  const canEdit = t.personName === currentUserName || isAdmin;

  const computed = Number(calcHoursFromTimes(normalizeTimeInput(draft.startTime), normalizeTimeInput(draft.endTime))) || 0;
  // 時刻が空の過去データ（時間のみ登録）は、時刻を入れ直さない限り従来の時間を維持する
  const hours = computed > 0 ? computed : !draft.startTime.trim() && !draft.endTime.trim() ? t.hours : 0;

  const startEdit = () => {
    setDraft({ date: t.date, caseId: t.caseId, startTime: t.startTime, endTime: t.endTime, content: t.content });
    setEditing(true);
  };

  const save = async () => {
    if (!draft.caseId || !draft.date || hours <= 0 || saving) return;
    setSaving(true);
    try {
      await api.updateTimeCharge(t.id, {
        date: draft.date,
        caseId: draft.caseId,
        startTime: normalizeTimeInput(draft.startTime),
        endTime: normalizeTimeInput(draft.endTime),
        hours,
        content: draft.content,
      });
      setEditing(false);
      onChanged();
    } catch (e) {
      onError(e instanceof Error ? e.message : "タイムチャージの訂正に失敗しました");
    } finally {
      setSaving(false);
    }
  };

  const remove = async () => {
    const label = `${formatDateShort(t.date)} ${t.startTime && t.endTime ? `${t.startTime}〜${t.endTime}` : ""} ${formatDuration(t.hours)}`.replace(/\s+/g, " ").trim();
    if (!window.confirm(`このタイムチャージを削除します。よろしいですか？\n${label}${t.billed ? "\n※請求済みのタイムチャージです" : ""}`)) return;
    try {
      await api.deleteTimeCharge(t.id);
      onChanged();
    } catch (e) {
      onError(e instanceof Error ? e.message : "削除に失敗しました");
    }
  };

  if (editing) {
    const options = sortCaseOptions(cases);
    const current = cases.find((c) => c.id === t.caseId);
    return (
      <div className="w-full flex flex-col gap-2 p-2 rounded" style={{ backgroundColor: COLORS.paper, border: `1px solid ${COLORS.brass}` }}>
        <TextInput type="date" value={draft.date} onChange={(e) => setDraft({ ...draft, date: e.target.value })} className="w-full" />
        <select value={draft.caseId} onChange={(e) => setDraft({ ...draft, caseId: e.target.value })} className="text-sm p-2 rounded outline-none min-w-0 w-full" style={{ border: `1px solid ${COLORS.brassLight}` }}>
          {!current && <option value={t.caseId}>（元の案件）</option>}
          {options.map((c) => <option key={c.id} value={c.id}>{caseOptionLabel(c)}</option>)}
        </select>
        <div className="flex gap-2 min-w-0">
          <TextInput type="text" placeholder="開始 1004" value={draft.startTime} onChange={(e) => setDraft({ ...draft, startTime: e.target.value })} onBlur={(e) => setDraft((p) => ({ ...p, startTime: normalizeTimeInput(e.target.value) }))} className="w-0 flex-1 min-w-0" />
          <TextInput type="text" placeholder="終了 1230" value={draft.endTime} onChange={(e) => setDraft({ ...draft, endTime: e.target.value })} onBlur={(e) => setDraft((p) => ({ ...p, endTime: normalizeTimeInput(e.target.value) }))} className="w-0 flex-1 min-w-0" />
        </div>
        <TextInput type="text" placeholder="作業内容（任意）" value={draft.content} onChange={(e) => setDraft({ ...draft, content: e.target.value })} className="w-full" />
        <div className="flex items-center justify-between gap-2 flex-wrap">
          <span className="text-xs" style={{ color: COLORS.slate }}>
            稼働時間：{hours > 0 ? <b style={{ color: COLORS.navy }}>{formatDuration(hours)}</b> : "開始・終了時刻を入力してください"}
          </span>
          <div className="flex gap-2">
            <button onClick={() => setEditing(false)} className="text-xs px-2 py-1" style={{ color: COLORS.slate }}>キャンセル</button>
            <button onClick={save} disabled={saving || hours <= 0 || !draft.caseId || !draft.date} className="text-xs font-bold px-3 py-1.5 rounded disabled:opacity-40" style={{ backgroundColor: COLORS.navy, color: "#fff" }}>
              {saving ? "保存中..." : "保存"}
            </button>
          </div>
        </div>
      </div>
    );
  }

  const caseInfo = showCase ? cases.find((c) => c.id === t.caseId) : undefined;
  return (
    <div className="w-full text-xs flex items-start gap-2" style={{ color: COLORS.ink }}>
      <div className="flex-1 min-w-0 flex items-baseline gap-2 flex-wrap">
        <span style={{ color: COLORS.slate }}>{fullDate ? t.date.replace(/-/g, "/") : formatDateShort(t.date)}</span>
        <span className="font-bold">{t.startTime && t.endTime ? `${t.startTime}〜${t.endTime}` : "時刻なし"}</span>
        <span>{formatDuration(t.hours)}</span>
        <span style={{ color: COLORS.slate }}>{t.personName}</span>
        {t.billed && <span className="px-1.5 py-0.5 rounded-full" style={{ backgroundColor: COLORS.moss, color: "#fff" }}>請求済み</span>}
        {caseInfo && <span className="w-full" style={{ color: COLORS.slate }}>{caseOptionLabel(caseInfo)}</span>}
        {t.content && <span className="w-full" style={{ color: COLORS.slate }}>{t.content}</span>}
      </div>
      {canEdit && (
        <div className="flex items-center flex-shrink-0">
          {!t.billed && (
            <button onClick={startEdit} title="訂正" aria-label="訂正" className="p-2 -my-1 rounded hover:opacity-70" style={{ color: COLORS.navy }}><Pencil size={15} /></button>
          )}
          <button onClick={remove} title="削除" aria-label="削除" className="p-2 -my-1 rounded hover:opacity-70" style={{ color: COLORS.vermillion }}><X size={15} /></button>
        </div>
      )}
    </div>
  );
}
