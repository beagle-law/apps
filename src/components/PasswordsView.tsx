"use client";

import { useEffect, useState } from "react";
import { AlertTriangle, Eye, EyeOff, Copy, X } from "lucide-react";
import { COLORS, FONT_MINCHO, PASSWORD_CATEGORIES } from "@/lib/constants";
import { TextInput } from "@/components/ui";
import * as api from "@/lib/api-client";
import type { PasswordEntry } from "@/lib/types";

interface Props {
  onError: (msg: string) => void;
}

const emptyForm = { category: PASSWORD_CATEGORIES[0], service: "", url: "", username: "", password: "", notes: "" };

export default function PasswordsView({ onError }: Props) {
  const [entries, setEntries] = useState<PasswordEntry[]>([]);
  const [category, setCategory] = useState(PASSWORD_CATEGORIES[0]);
  const [form, setForm] = useState(emptyForm);
  const [visibleIds, setVisibleIds] = useState<string[]>([]);

  useEffect(() => {
    api.fetchPasswords().then(setEntries).catch((e) => onError(e instanceof Error ? e.message : "取得に失敗しました"));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const addEntry = async () => {
    if (!form.service.trim() || !form.password) return;
    try {
      const created = await api.createPassword({ ...form, category });
      setEntries((prev) => [created, ...prev]);
      setForm({ ...emptyForm, category });
    } catch (e) {
      onError(e instanceof Error ? e.message : "登録に失敗しました");
    }
  };

  const removeEntry = async (id: string) => {
    try {
      await api.deletePassword(id);
      setEntries((prev) => prev.filter((e) => e.id !== id));
    } catch (e) {
      onError(e instanceof Error ? e.message : "削除に失敗しました");
    }
  };

  const toggleVisible = (id: string) => setVisibleIds((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));

  const filtered = entries.filter((e) => e.category === category);

  return (
    <div className="flex-1 overflow-y-auto p-6">
      <div className="max-w-2xl mx-auto">
        <div className="flex items-center gap-2 px-4 py-2 mb-4 text-sm rounded" style={{ backgroundColor: "#F3DEDC", color: COLORS.vermillion }}>
          <AlertTriangle size={16} className="flex-shrink-0" />
          パスワードは保存時に暗号化されますが、閲覧できるメンバーは共通です。取り扱いに注意してください。
        </div>

        <div className="flex gap-1.5 flex-wrap mb-5">
          {PASSWORD_CATEGORIES.map((c) => (
            <button
              key={c}
              onClick={() => setCategory(c)}
              className="text-xs font-bold px-3 py-1.5 rounded-full"
              style={{
                backgroundColor: category === c ? COLORS.navy : "transparent",
                color: category === c ? "#fff" : COLORS.navy,
                border: `1px solid ${COLORS.navy}`,
              }}
            >
              {c}
            </button>
          ))}
        </div>

        <div className="rounded p-5 mb-5" style={{ backgroundColor: COLORS.card, border: `1px solid ${COLORS.brassLight}` }}>
          <h3 className="text-sm font-bold mb-3" style={{ fontFamily: FONT_MINCHO, color: COLORS.navy }}>新規登録（{category}）</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mb-2">
            <TextInput type="text" placeholder="サービス名" value={form.service} onChange={(e) => setForm({ ...form, service: e.target.value })} />
            <TextInput type="text" placeholder="URL" value={form.url} onChange={(e) => setForm({ ...form, url: e.target.value })} />
            <TextInput type="text" placeholder="ID / ユーザー名" value={form.username} onChange={(e) => setForm({ ...form, username: e.target.value })} />
            <TextInput type="text" placeholder="パスワード" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} />
          </div>
          <TextInput type="text" placeholder="メモ" value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} className="w-full mb-3" />
          <button onClick={addEntry} disabled={!form.service.trim() || !form.password} className="text-sm font-bold px-4 py-2 rounded disabled:opacity-40" style={{ backgroundColor: COLORS.navy, color: "#fff" }}>登録する</button>
        </div>

        {filtered.length === 0 ? (
          <p className="text-sm py-10 text-center rounded" style={{ color: COLORS.slate, backgroundColor: COLORS.card, border: `1px solid ${COLORS.brassLight}` }}>登録されているパスワードはありません。</p>
        ) : (
          <div className="flex flex-col gap-2">
            {filtered.map((entry) => {
              const visible = visibleIds.includes(entry.id);
              return (
                <div key={entry.id} className="rounded p-4" style={{ backgroundColor: COLORS.card, border: `1px solid ${COLORS.brassLight}` }}>
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1">
                      <p className="text-sm font-bold">{entry.service}</p>
                      {entry.url && <a href={entry.url} target="_blank" rel="noopener noreferrer" className="text-xs underline" style={{ color: COLORS.navy }}>{entry.url}</a>}
                    </div>
                    <button onClick={() => removeEntry(entry.id)} style={{ color: COLORS.slate }}><X size={14} /></button>
                  </div>
                  <div className="flex items-center gap-2 mt-2 text-sm">
                    <span style={{ color: COLORS.slate }} className="w-16 flex-shrink-0">ID</span>
                    <span className="flex-1">{entry.username || "－"}</span>
                    {entry.username && <button onClick={() => navigator.clipboard.writeText(entry.username)} style={{ color: COLORS.navy }}><Copy size={13} /></button>}
                  </div>
                  <div className="flex items-center gap-2 mt-1 text-sm">
                    <span style={{ color: COLORS.slate }} className="w-16 flex-shrink-0">パスワード</span>
                    <span className="flex-1 font-mono">{visible ? entry.password : "••••••••"}</span>
                    <button onClick={() => toggleVisible(entry.id)} style={{ color: COLORS.slate }}>{visible ? <EyeOff size={14} /> : <Eye size={14} />}</button>
                    <button onClick={() => navigator.clipboard.writeText(entry.password)} style={{ color: COLORS.navy }}><Copy size={13} /></button>
                  </div>
                  {entry.notes && <p className="text-xs mt-2" style={{ color: COLORS.slate }}>{entry.notes}</p>}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
