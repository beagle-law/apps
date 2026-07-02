"use client";

import { useState } from "react";
import { X } from "lucide-react";
import { COLORS, FONT_MINCHO, CASE_CATEGORIES, PRIORITIES } from "@/lib/constants";
import { TextInput } from "@/components/ui";
import * as api from "@/lib/api-client";
import type { Case } from "@/lib/types";

interface Props {
  suggestedCaseNumber: string;
  userName: string;
  onClose: () => void;
  onCreated: (c: Case) => void;
  onError: (msg: string) => void;
}

export default function NewCaseModal({ suggestedCaseNumber, userName, onClose, onCreated, onError }: Props) {
  const [form, setForm] = useState({
    title: "",
    clientName: "",
    caseNumber: suggestedCaseNumber,
    caseCategory: "非訟事件",
    teamMember: "",
    deadline: "",
    priority: "通常",
    initialNote: "",
  });
  const [submitting, setSubmitting] = useState(false);

  const submit = async () => {
    if (!form.title.trim() || !form.clientName.trim()) return;
    setSubmitting(true);
    try {
      const created = await api.createCase({ ...form, author: userName.trim() || "匿名" });
      onCreated(created);
      onClose();
    } catch (e) {
      onError(e instanceof Error ? e.message : "登録に失敗しました");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 flex items-start md:items-center justify-center p-4 overflow-y-auto z-20" style={{ backgroundColor: "rgba(27,42,74,0.55)" }}>
      <div className="w-full max-w-md rounded p-5 my-8" style={{ backgroundColor: COLORS.card }}>
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg" style={{ fontFamily: FONT_MINCHO, color: COLORS.navy }}>
            新規案件の登録
          </h3>
          <button onClick={onClose}>
            <X size={18} color={COLORS.slate} />
          </button>
        </div>
        <div className="flex flex-col gap-3">
          <div className="flex gap-3">
            <label className="flex-1 text-xs" style={{ color: COLORS.slate }}>
              案件No.
              <TextInput type="text" value={form.caseNumber} onChange={(e) => setForm({ ...form, caseNumber: e.target.value })} className="mt-1 w-full" />
            </label>
            <label className="flex-1 text-xs" style={{ color: COLORS.slate }}>
              種別
              <select
                value={form.caseCategory}
                onChange={(e) => setForm({ ...form, caseCategory: e.target.value })}
                className="mt-1 w-full text-sm p-2 rounded outline-none"
                style={{ border: `1px solid ${COLORS.brassLight}` }}
              >
                {CASE_CATEGORIES.map((t) => (
                  <option key={t} value={t}>
                    {t}
                  </option>
                ))}
              </select>
            </label>
          </div>
          <label className="text-xs" style={{ color: COLORS.slate }}>
            案件名 *
            <TextInput
              type="text"
              value={form.title}
              onChange={(e) => setForm({ ...form, title: e.target.value })}
              placeholder="例：〇〇商事 対 △△工業 売買代金請求事件"
              className="mt-1 w-full"
            />
          </label>
          <label className="text-xs" style={{ color: COLORS.slate }}>
            依頼者 *
            <TextInput type="text" value={form.clientName} onChange={(e) => setForm({ ...form, clientName: e.target.value })} className="mt-1 w-full" />
          </label>
          <div className="flex gap-3">
            <label className="flex-1 text-xs" style={{ color: COLORS.slate }}>
              担当者（1人目）
              <TextInput type="text" value={form.teamMember} onChange={(e) => setForm({ ...form, teamMember: e.target.value })} className="mt-1 w-full" />
            </label>
            <label className="flex-1 text-xs" style={{ color: COLORS.slate }}>
              期限（任意）
              <TextInput type="date" value={form.deadline} onChange={(e) => setForm({ ...form, deadline: e.target.value })} className="mt-1 w-full" />
            </label>
          </div>
          <label className="text-xs" style={{ color: COLORS.slate }}>
            優先度
            <div className="flex gap-2 mt-1">
              {PRIORITIES.map((p) => (
                <button
                  key={p}
                  type="button"
                  onClick={() => setForm({ ...form, priority: p })}
                  className="text-xs font-bold px-3 py-1.5 rounded-full"
                  style={{
                    backgroundColor: form.priority === p ? COLORS.vermillion : "transparent",
                    color: form.priority === p ? "#fff" : COLORS.vermillion,
                    border: `1px solid ${COLORS.vermillion}`,
                  }}
                >
                  {p}
                </button>
              ))}
            </div>
          </label>
          <label className="text-xs" style={{ color: COLORS.slate }}>
            初回メモ（任意）
            <textarea
              value={form.initialNote}
              onChange={(e) => setForm({ ...form, initialNote: e.target.value })}
              rows={2}
              className="mt-1 w-full text-sm p-2 rounded outline-none resize-none"
              style={{ border: `1px solid ${COLORS.brassLight}` }}
            />
          </label>
          <p className="text-xs" style={{ color: COLORS.slate }}>
            事件番号・相手方代理人・書記官情報・期日は、登録後に案件詳細から追加できます（訴訟事件の場合）。
          </p>
        </div>
        <div className="flex justify-end gap-2 mt-5">
          <button onClick={onClose} className="text-sm px-4 py-2 rounded" style={{ color: COLORS.slate }}>
            キャンセル
          </button>
          <button
            onClick={submit}
            disabled={!form.title.trim() || !form.clientName.trim() || submitting}
            className="text-sm font-bold px-4 py-2 rounded disabled:opacity-40"
            style={{ backgroundColor: COLORS.navy, color: "#fff" }}
          >
            登録する
          </button>
        </div>
      </div>
    </div>
  );
}
