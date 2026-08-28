"use client";

import { useEffect, useState } from "react";
import { Search, Plus, X, Building2 } from "lucide-react";
import { COLORS, FONT_MINCHO } from "@/lib/constants";
import { TextInput } from "@/components/ui";
import * as api from "@/lib/api-client";
import type { Case, Client } from "@/lib/types";

interface Props {
  cases: Case[];
  onOpenCase: (id: string) => void;
  onError: (msg: string) => void;
  initialClientId?: string | null;
}

const emptyForm = { companyName: "", clientType: "法人", address: "", contactName: "", phone: "", email: "", contactMethod: "", source: "", referrerName: "", notes: "" };

const RadioGroup = ({ options, value, onChange }: { options: string[]; value: string; onChange: (v: string) => void }) => (
  <div className="flex gap-2 mt-1">
    {options.map((opt) => (
      <button
        key={opt}
        type="button"
        onClick={() => onChange(opt)}
        className="text-xs font-bold px-3 py-1.5 rounded-full"
        style={{
          backgroundColor: value === opt ? COLORS.navy : "transparent",
          color: value === opt ? "#fff" : COLORS.navy,
          border: `1px solid ${COLORS.navy}`,
        }}
      >
        {opt}
      </button>
    ))}
  </div>
);

export default function ClientsView({ cases, onOpenCase, onError, initialClientId }: Props) {
  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedId, setSelectedId] = useState<string | null>(initialClientId ?? null);

  useEffect(() => {
    if (initialClientId) setSelectedId(initialClientId);
  }, [initialClientId]);
  const [searchQuery, setSearchQuery] = useState("");
  const [showNewModal, setShowNewModal] = useState(false);
  const [newForm, setNewForm] = useState(emptyForm);
  const [draft, setDraft] = useState<Client | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  useEffect(() => {
    api.fetchClients().then(setClients).catch((e) => onError(e instanceof Error ? e.message : "顧客の取得に失敗しました")).finally(() => setLoading(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const selected = clients.find((c) => c.id === selectedId) || null;
  useEffect(() => setDraft(selected), [selected]);

  const filtered = clients.filter((c) => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.trim().toLowerCase();
    return (
      c.companyName.toLowerCase().includes(q) ||
      c.contactName.toLowerCase().includes(q) ||
      String(c.clientNumber).includes(q)
    );
  });

  const createClient = async () => {
    if (!newForm.companyName.trim()) return;
    try {
      const created = await api.createClient(newForm);
      setClients((prev) => [...prev, created].sort((a, b) => a.clientNumber - b.clientNumber));
      setShowNewModal(false);
      setNewForm(emptyForm);
      setSelectedId(created.id);
    } catch (e) {
      onError(e instanceof Error ? e.message : "登録に失敗しました");
    }
  };

  const saveDraft = async () => {
    if (!draft) return;
    try {
      const updated = await api.patchClient(draft.id, draft);
      setClients((prev) => prev.map((c) => (c.id === updated.id ? updated : c)));
    } catch (e) {
      onError(e instanceof Error ? e.message : "保存に失敗しました");
    }
  };

  const deleteClient = async (id: string) => {
    try {
      await api.deleteClientApi(id);
      setClients((prev) => prev.filter((c) => c.id !== id));
      setSelectedId(null);
      setConfirmDeleteId(null);
    } catch (e) {
      onError(e instanceof Error ? e.message : "削除に失敗しました");
    }
  };

  const linkedCases = selected ? cases.filter((c) => c.clientId === selected.id) : [];

  if (loading) return null;

  return (
    <div className="flex flex-col md:flex-row flex-1 overflow-hidden">
      <aside className="w-full md:w-80 flex flex-col border-b md:border-b-0 md:border-r" style={{ borderColor: COLORS.brassLight, backgroundColor: "#EAE4D6" }}>
        <div className="p-3 flex flex-col gap-2">
          <div className="flex items-center gap-2 px-2 py-1.5 rounded" style={{ backgroundColor: COLORS.card, border: `1px solid ${COLORS.brassLight}` }}>
            <Search size={15} color={COLORS.slate} />
            <input type="text" placeholder="企業名・担当者・No.で検索" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="text-sm outline-none flex-1 bg-transparent" />
          </div>
          <button onClick={() => setShowNewModal(true)} className="flex items-center justify-center gap-1 text-sm font-bold py-2 rounded" style={{ backgroundColor: COLORS.vermillion, color: "#fff" }}>
            <Plus size={15} /> 新規顧客を登録
          </button>
        </div>
        <div className="flex-1 overflow-y-auto px-3 pb-3 flex flex-col gap-2">
          {filtered.length === 0 && <p className="text-sm text-center py-8" style={{ color: COLORS.slate }}>該当する顧客がいません</p>}
          {filtered.map((c) => (
            <button key={c.id} onClick={() => setSelectedId(c.id)} className="text-left px-2.5 py-1.5 rounded flex items-center gap-2 text-sm" style={{ backgroundColor: COLORS.card, border: `1px solid ${selectedId === c.id ? COLORS.navy : COLORS.brassLight}` }}>
              <span className="flex-shrink-0" style={{ color: COLORS.slate }}>No.{c.clientNumber}</span>
              <span className="font-semibold truncate" style={{ fontFamily: FONT_MINCHO }}>{c.companyName}</span>
            </button>
          ))}
        </div>
      </aside>

      <main className="flex-1 overflow-y-auto p-6">
        {!draft ? (
          <div className="h-full flex flex-col items-center justify-center gap-4 text-center py-20">
            <Building2 size={32} color={COLORS.brass} />
            <p style={{ color: COLORS.slate }} className="text-sm max-w-xs">左の一覧から顧客を選択するか、「新規顧客を登録」から追加してください。</p>
          </div>
        ) : (
          <div className="max-w-xl mx-auto flex flex-col gap-5">
            <div className="rounded p-5" style={{ backgroundColor: COLORS.card, border: `1px solid ${COLORS.brassLight}` }}>
              <div className="flex items-start justify-between mb-4">
                <p className="text-xs" style={{ color: COLORS.slate }}>顧客No. {draft.clientNumber}</p>
                {confirmDeleteId === draft.id ? (
                  <div className="flex items-center gap-1 text-xs">
                    <button onClick={() => deleteClient(draft.id)} className="underline font-bold" style={{ color: COLORS.vermillion }}>削除確定</button>
                    <button onClick={() => setConfirmDeleteId(null)} className="underline" style={{ color: COLORS.slate }}>取消</button>
                  </div>
                ) : (
                  <button onClick={() => setConfirmDeleteId(draft.id)} className="text-xs underline" style={{ color: COLORS.slate }}>削除</button>
                )}
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <label className="text-xs sm:col-span-2" style={{ color: COLORS.slate }}>
                  企業名又は屋号 *
                  <TextInput type="text" value={draft.companyName} onChange={(e) => setDraft({ ...draft, companyName: e.target.value })} onBlur={saveDraft} className="mt-1 w-full" />
                </label>
                <label className="text-xs sm:col-span-2" style={{ color: COLORS.slate }}>
                  所在地
                  <TextInput type="text" value={draft.address} onChange={(e) => setDraft({ ...draft, address: e.target.value })} onBlur={saveDraft} className="mt-1 w-full" />
                </label>
                <label className="text-xs" style={{ color: COLORS.slate }}>
                  担当者名
                  <TextInput type="text" value={draft.contactName} onChange={(e) => setDraft({ ...draft, contactName: e.target.value })} onBlur={saveDraft} className="mt-1 w-full" />
                </label>
                <label className="text-xs" style={{ color: COLORS.slate }}>
                  連絡手段
                  <TextInput type="text" value={draft.contactMethod} onChange={(e) => setDraft({ ...draft, contactMethod: e.target.value })} onBlur={saveDraft} className="mt-1 w-full" />
                </label>
                <label className="text-xs" style={{ color: COLORS.slate }}>
                  電話番号
                  <TextInput type="text" value={draft.phone} onChange={(e) => setDraft({ ...draft, phone: e.target.value })} onBlur={saveDraft} className="mt-1 w-full" />
                </label>
                <label className="text-xs" style={{ color: COLORS.slate }}>
                  メールアドレス
                  <TextInput type="text" value={draft.email} onChange={(e) => setDraft({ ...draft, email: e.target.value })} onBlur={saveDraft} className="mt-1 w-full" />
                </label>
                <label className="text-xs" style={{ color: COLORS.slate }}>
                  区分
                  <RadioGroup
                    options={["法人", "個人"]}
                    value={draft.clientType}
                    onChange={(v) => {
                      const next = { ...draft, clientType: v };
                      setDraft(next);
                      api.patchClient(draft.id, { clientType: v }).then((updated) => setClients((prev) => prev.map((c) => (c.id === updated.id ? updated : c)))).catch((e) => onError(e instanceof Error ? e.message : "保存に失敗しました"));
                    }}
                  />
                </label>
                <label className="text-xs" style={{ color: COLORS.slate }}>
                  きっかけ
                  <RadioGroup
                    options={["紹介", "HP経由"]}
                    value={draft.source}
                    onChange={(v) => {
                      const next = { ...draft, source: v, referrerName: v === "紹介" ? draft.referrerName : "" };
                      setDraft(next);
                      api.patchClient(draft.id, { source: v, referrerName: next.referrerName }).then((updated) => setClients((prev) => prev.map((c) => (c.id === updated.id ? updated : c)))).catch((e) => onError(e instanceof Error ? e.message : "保存に失敗しました"));
                    }}
                  />
                </label>
                {draft.source === "紹介" && (
                  <label className="text-xs sm:col-span-2" style={{ color: COLORS.slate }}>
                    紹介者名
                    <TextInput type="text" value={draft.referrerName} onChange={(e) => setDraft({ ...draft, referrerName: e.target.value })} onBlur={saveDraft} className="mt-1 w-full" />
                  </label>
                )}
              </div>
              <label className="text-xs block mt-3" style={{ color: COLORS.slate }}>
                メモ
                <textarea value={draft.notes} onChange={(e) => setDraft({ ...draft, notes: e.target.value })} onBlur={saveDraft} rows={3} className="mt-1 w-full text-sm p-2 rounded outline-none resize-none" style={{ border: `1px solid ${COLORS.brassLight}` }} />
              </label>
            </div>

            <div className="rounded p-5" style={{ backgroundColor: COLORS.card, border: `1px solid ${COLORS.brassLight}` }}>
              <h3 className="text-sm font-bold mb-3" style={{ fontFamily: FONT_MINCHO, color: COLORS.navy }}>関連案件</h3>
              {linkedCases.length === 0 ? (
                <p className="text-sm" style={{ color: COLORS.slate }}>関連する案件はありません。</p>
              ) : (
                <div className="flex flex-col gap-2">
                  {linkedCases.map((c) => (
                    <button key={c.id} onClick={() => onOpenCase(c.id)} className="text-left text-sm p-2 rounded hover:opacity-80" style={{ backgroundColor: COLORS.paper }}>
                      No.{c.caseNumber}　{c.title}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </main>

      {showNewModal && (
        <div className="fixed inset-0 flex items-center justify-center p-4 z-20" style={{ backgroundColor: "rgba(27,42,74,0.55)" }}>
          <div className="w-full max-w-md rounded p-5" style={{ backgroundColor: COLORS.card }}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg" style={{ fontFamily: FONT_MINCHO, color: COLORS.navy }}>新規顧客の登録</h3>
              <button onClick={() => setShowNewModal(false)}><X size={18} color={COLORS.slate} /></button>
            </div>
            <div className="flex flex-col gap-3">
              <label className="text-xs" style={{ color: COLORS.slate }}>
                企業名又は屋号 *
                <TextInput type="text" value={newForm.companyName} onChange={(e) => setNewForm({ ...newForm, companyName: e.target.value })} className="mt-1 w-full" />
              </label>
              <label className="text-xs" style={{ color: COLORS.slate }}>
                担当者名
                <TextInput type="text" value={newForm.contactName} onChange={(e) => setNewForm({ ...newForm, contactName: e.target.value })} className="mt-1 w-full" />
              </label>
              <label className="text-xs" style={{ color: COLORS.slate }}>
                電話番号
                <TextInput type="text" value={newForm.phone} onChange={(e) => setNewForm({ ...newForm, phone: e.target.value })} className="mt-1 w-full" />
              </label>
              <label className="text-xs" style={{ color: COLORS.slate }}>
                メールアドレス
                <TextInput type="text" value={newForm.email} onChange={(e) => setNewForm({ ...newForm, email: e.target.value })} className="mt-1 w-full" />
              </label>
              <label className="text-xs" style={{ color: COLORS.slate }}>
                区分
                <RadioGroup options={["法人", "個人"]} value={newForm.clientType} onChange={(v) => setNewForm({ ...newForm, clientType: v })} />
              </label>
              <label className="text-xs" style={{ color: COLORS.slate }}>
                きっかけ
                <RadioGroup options={["紹介", "HP経由"]} value={newForm.source} onChange={(v) => setNewForm({ ...newForm, source: v, referrerName: v === "紹介" ? newForm.referrerName : "" })} />
              </label>
              {newForm.source === "紹介" && (
                <label className="text-xs" style={{ color: COLORS.slate }}>
                  紹介者名
                  <TextInput type="text" value={newForm.referrerName} onChange={(e) => setNewForm({ ...newForm, referrerName: e.target.value })} className="mt-1 w-full" />
                </label>
              )}
            </div>
            <div className="flex justify-end gap-2 mt-4">
              <button onClick={() => setShowNewModal(false)} className="text-sm px-4 py-2 rounded" style={{ color: COLORS.slate }}>キャンセル</button>
              <button onClick={createClient} disabled={!newForm.companyName.trim()} className="text-sm font-bold px-4 py-2 rounded disabled:opacity-40" style={{ backgroundColor: COLORS.navy, color: "#fff" }}>登録する</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
