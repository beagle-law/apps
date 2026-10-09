"use client";

import { useEffect, useState } from "react";
import { COLORS } from "@/lib/constants";
import { todayStr } from "@/lib/dates";
import { normalizeTimeInput, calcHoursFromTimes, formatDuration } from "@/lib/business/timecharge";
import { TextInput } from "@/components/ui";
import * as api from "@/lib/api-client";
import type { Case } from "@/lib/types";

interface Props {
  /** 選択できる案件（タイムチャージ対象の案件） */
  cases: Case[];
  /** 外部から案件を指定したいとき（案件カードの「この案件で入力」など） */
  presetCaseId?: string;
  /** 同じ案件を続けて指定しても反映されるよう、指定のたびに増やす番号 */
  presetNonce?: number;
  /** 追加できたあとに、入力した日付を渡して呼ばれる */
  onAdded: (date: string) => void;
  onError: (msg: string) => void;
  compact?: boolean;
}

// v24：個人画面と経費入力画面で共通のタイムチャージ入力フォーム。
// 稼働時間は入力欄を設けず、開始・終了時刻から自動算出する。追加後も日付は残し、同じ日に続けて入力できる。
export default function TimeChargeForm({ cases, presetCaseId, presetNonce, onAdded, onError, compact }: Props) {
  const [form, setForm] = useState({ date: todayStr(), caseId: "", startTime: "", endTime: "", content: "" });

  useEffect(() => {
    if (presetCaseId) setForm((prev) => ({ ...prev, caseId: presetCaseId }));
  }, [presetCaseId, presetNonce]);

  const hours = Number(calcHoursFromTimes(normalizeTimeInput(form.startTime), normalizeTimeInput(form.endTime))) || 0;

  const add = async () => {
    if (!form.caseId || hours <= 0) return;
    try {
      await api.addTimeCharge({
        date: form.date,
        caseId: form.caseId,
        startTime: normalizeTimeInput(form.startTime),
        endTime: normalizeTimeInput(form.endTime),
        hours,
        content: form.content,
      });
      const addedDate = form.date;
      setForm((prev) => ({ date: prev.date, caseId: "", startTime: "", endTime: "", content: "" }));
      onAdded(addedDate);
    } catch (e) {
      onError(e instanceof Error ? e.message : "タイムチャージの登録に失敗しました");
    }
  };

  return (
    <div className="flex flex-col gap-2 w-full min-w-0">
      <div className={`flex flex-col ${compact ? "" : "sm:flex-row"} flex-wrap gap-2 min-w-0`}>
        <TextInput type="date" value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} className={compact ? "w-full min-w-0" : ""} />
        <select value={form.caseId} onChange={(e) => setForm({ ...form, caseId: e.target.value })} className={`text-sm p-2 rounded outline-none min-w-0 ${compact ? "w-full" : "flex-1"}`} style={{ border: `1px solid ${COLORS.brassLight}` }}>
          <option value="">案件を選択</option>
          {cases.map((c) => <option key={c.id} value={c.id}>No.{c.caseNumber}　{c.title}</option>)}
        </select>
        <div className="flex gap-2 min-w-0">
          <TextInput type="text" placeholder={compact ? "開始 1004" : "開始（例：1004）"} value={form.startTime} onChange={(e) => setForm({ ...form, startTime: e.target.value })} onBlur={(e) => setForm((p) => ({ ...p, startTime: normalizeTimeInput(e.target.value) }))} className="w-0 flex-1 min-w-0 sm:w-28 sm:flex-none" />
          <TextInput type="text" placeholder={compact ? "終了 1230" : "終了（例：1230）"} value={form.endTime} onChange={(e) => setForm({ ...form, endTime: e.target.value })} onBlur={(e) => setForm((p) => ({ ...p, endTime: normalizeTimeInput(e.target.value) }))} className="w-0 flex-1 min-w-0 sm:w-28 sm:flex-none" />
        </div>
      </div>
      <div className={`flex flex-col ${compact ? "" : "sm:flex-row sm:items-center"} gap-2`}>
        <TextInput type="text" placeholder="作業内容（任意）" value={form.content} onChange={(e) => setForm({ ...form, content: e.target.value })} className={compact ? "w-full min-w-0" : "flex-1"} />
        <span className="text-sm flex-shrink-0" style={{ color: hours > 0 ? COLORS.navy : COLORS.slate }}>
          稼働時間：{hours > 0 ? <b>{formatDuration(hours)}</b> : "開始・終了から自動計算"}
        </span>
        <button onClick={add} disabled={!form.caseId || hours <= 0} className="text-sm font-bold px-4 py-2 rounded disabled:opacity-40 flex-shrink-0" style={{ backgroundColor: COLORS.navy, color: "#fff" }}>追加</button>
      </div>
    </div>
  );
}
