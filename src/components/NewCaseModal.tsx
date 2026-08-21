"use client";

import { useEffect, useState } from "react";
import { X } from "lucide-react";
import { COLORS, FONT_MINCHO, PRIORITIES, STAFF_MEMBERS } from "@/lib/constants";
import { plusDaysStr } from "@/lib/dates";
import { suggestedCaseNumberForClient } from "@/lib/business/caseNumber";
import { TextInput, Pill } from "@/components/ui";
import * as api from "@/lib/api-client";
import type { Case, Client } from "@/lib/types";

interface Props {
  suggestedCaseNumber: string;
  cases: Case[];
  onClose: () => void;
  onCreated: (c: Case) => void;
  onError: (msg: string) => void;
}

export default function NewCaseModal({ suggestedCaseNumber, cases, onClose, onCreated, onError }: Props) {
  const [clients, setClients] = useState<Client[]>([]);
  const [form, setForm] = useState({
    title: "",
    clientName: "",
    clientId: "",
    caseNumber: suggestedCaseNumber,
    teamMember: "",
    deadline: plusDaysStr(7),
    priority: "通常",
    initialNote: "",
    isTimeChargeCase: false,
  });
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    api.fetchClients().then(setClients).catch(() => setClients([]));
  }, []);

  const selectClient = (clientId: string) => {
    if (!clientId) {
      setForm((f) => ({ ...f, clientId: "", caseNumber: suggestedCaseNumber }));
      return;
    }
    const client = clients.find((c) => c.id === clientId);
    if (!client) return;
    // v6 3.6：顧客を選択した場合、1件目は顧客番号そのまま、2件目以降は「顧客番号-連番」を提案する
    const existingCaseCount = cases.filter((c) => c.clientId === clientId).length;
    const caseNumber = suggestedCaseNumberForClient(client.clientNumber, existingCaseCount);
    setForm((f) => ({ ...f, clientId, clientName: client.companyName, caseNumber }));
  };

  const submit = async () => {
    if (!form.title.trim() || !form.clientName.trim()) return;
    setSubmitting(true);
    try {
      const created = await api.createCase({
        title: form.title,
        clientName: form.clientName,
        clientId: form.clientId || undefined,
        caseNumber: form.caseNumber,
        teamMember: form.teamMember,
        deadline: form.deadline,
        priority: form.priority,
        initialNote: form.initialNote,
        isTimeChargeCase: form.isTimeChargeCase,
      });
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
        <div className="flex items-center gap-2 mb-4">
          <img src="/logo-mark.png" alt="" style={{ width: 22, height: 22 }} />
          <h3 className="text-lg flex-1" style={{ fontFamily: FONT_MINCHO, color: COLORS.navy }}>新規案件の登録</h3>
          <button onClick={onClose}><X size={18} color={COLORS.slate} /></button>
        </div>
        <div className="flex flex-col gap-3">
          <label className="text-xs" style={{ color: COLORS.slate }}>
            顧客（任意）
            <select
              value={form.clientId}
              onChange={(e) => selectClient(e.target.value)}
              className="mt-1 w-full text-sm p-2 rounded outline-none"
              style={{ border: `1px solid ${COLORS.brassLight}` }}
            >
              <option value="">選択しない</option>
              {clients.map((c) => (
                <option key={c.id} value={c.id}>No.{c.clientNumber}　{c.companyName}</option>
              ))}
            </select>
          </label>
          <label className="text-xs" style={{ color: COLORS.slate }}>
            案件No.
            <TextInput type="text" value={form.caseNumber} onChange={(e) => setForm({ ...form, caseNumber: e.target.value })} className="mt-1 w-full" />
          </label>
          <label className="text-xs" style={{ color: COLORS.slate }}>
            案件名 *
            <TextInput type="text" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder="例：〇〇商事 対 △△工業 売買代金請求事件" className="mt-1 w-full" />
          </label>
          <label className="text-xs" style={{ color: COLORS.slate }}>
            依頼者 *
            <TextInput type="text" value={form.clientName} onChange={(e) => setForm({ ...form, clientName: e.target.value })} className="mt-1 w-full" />
          </label>
          <div>
            <p className="text-xs mb-1.5" style={{ color: COLORS.slate }}>担当者（1人目）</p>
            <div className="flex gap-1.5 flex-wrap">
              {STAFF_MEMBERS.map((m) => (
                <Pill key={m} active={form.teamMember === m} color={COLORS.navy} onClick={() => setForm({ ...form, teamMember: form.teamMember === m ? "" : m })}>{m}</Pill>
              ))}
            </div>
          </div>
          <label className="text-xs" style={{ color: COLORS.slate }}>
            期限
            <TextInput type="date" value={form.deadline} onChange={(e) => setForm({ ...form, deadline: e.target.value })} className="mt-1 w-full" />
          </label>
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
            <textarea value={form.initialNote} onChange={(e) => setForm({ ...form, initialNote: e.target.value })} rows={2} className="mt-1 w-full text-sm p-2 rounded outline-none resize-none" style={{ border: `1px solid ${COLORS.brassLight}` }} />
          </label>
          <label className="flex items-center gap-2 text-xs" style={{ color: COLORS.slate }}>
            <input type="checkbox" checked={form.isTimeChargeCase} onChange={(e) => setForm({ ...form, isTimeChargeCase: e.target.checked })} />
            タイムチャージ案件（タイムチャージ入力の案件選択に表示する）
          </label>
        </div>
        <div className="flex justify-end gap-2 mt-5">
          <button onClick={onClose} className="text-sm px-4 py-2 rounded" style={{ color: COLORS.slate }}>キャンセル</button>
          <button onClick={submit} disabled={!form.title.trim() || !form.clientName.trim() || submitting} className="text-sm font-bold px-4 py-2 rounded disabled:opacity-40" style={{ backgroundColor: COLORS.navy, color: "#fff" }}>登録する</button>
        </div>
      </div>
    </div>
  );
}
