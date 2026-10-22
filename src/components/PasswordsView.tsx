"use client";

import { useEffect, useState } from "react";
import { AlertTriangle, Eye, EyeOff, Copy, X, Pencil, Save, Settings, Plus } from "lucide-react";
import { COLORS, FONT_MINCHO, PASSWORD_CATEGORIES } from "@/lib/constants";
import { TextInput } from "@/components/ui";
import * as api from "@/lib/api-client";
import type { PasswordEntry, PasswordCategory } from "@/lib/types";

interface Props {
  onError: (msg: string) => void;
}

const emptyForm = { category: PASSWORD_CATEGORIES[0], service: "", url: "", username: "", usernameLabel: "ID", password: "", notes: "" };

export default function PasswordsView({ onError }: Props) {
  const [entries, setEntries] = useState<PasswordEntry[]>([]);
  // カテゴリは画面から追加・名前変更・削除できる（v36）。取得できるまでは従来の固定カテゴリを表示する。
  const [categories, setCategories] = useState<PasswordCategory[]>(PASSWORD_CATEGORIES.map((n) => ({ id: `fallback-${n}`, name: n })));
  const [categoriesLoaded, setCategoriesLoaded] = useState(false);
  const [showCategoryManager, setShowCategoryManager] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState("");
  const [renamingCategoryId, setRenamingCategoryId] = useState<string | null>(null);
  const [renameDraft, setRenameDraft] = useState("");
  const [confirmDeleteCategoryId, setConfirmDeleteCategoryId] = useState<string | null>(null);
  const [category, setCategory] = useState(PASSWORD_CATEGORIES[0]);
  const [form, setForm] = useState(emptyForm);
  const [hiddenIds, setHiddenIds] = useState<string[]>([]); // デフォルトは表示状態。個別に隠したものだけ記録する
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editDraft, setEditDraft] = useState(emptyForm);

  useEffect(() => {
    api.fetchPasswords().then(setEntries).catch((e) => onError(e instanceof Error ? e.message : "取得に失敗しました"));
    api
      .fetchPasswordCategories()
      .then((list) => {
        if (list.length > 0) {
          setCategories(list);
          setCategory((cur) => (list.some((c) => c.name === cur) ? cur : list[0].name));
        }
        setCategoriesLoaded(true);
      })
      .catch(() => {
        // カテゴリを取得できない場合は、従来の固定カテゴリのまま使う（管理はできない）
      });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const addCategory = async () => {
    const name = newCategoryName.trim();
    if (!name) return;
    try {
      const created = await api.createPasswordCategory(name);
      setCategories((prev) => [...prev, created]);
      setNewCategoryName("");
      setCategory(created.name);
    } catch (e) {
      onError(e instanceof Error ? e.message : "カテゴリの追加に失敗しました");
    }
  };

  const renameCategory = async (c: PasswordCategory) => {
    const name = renameDraft.trim();
    if (!name || name === c.name) {
      setRenamingCategoryId(null);
      return;
    }
    try {
      const updated = await api.renamePasswordCategory(c.id, name);
      setCategories((prev) => prev.map((x) => (x.id === c.id ? updated : x)));
      setEntries((prev) => prev.map((e) => (e.category === c.name ? { ...e, category: updated.name } : e)));
      if (category === c.name) setCategory(updated.name);
      setRenamingCategoryId(null);
    } catch (e) {
      onError(e instanceof Error ? e.message : "名前の変更に失敗しました");
    }
  };

  const removeCategory = async (c: PasswordCategory) => {
    try {
      await api.deletePasswordCategory(c.id);
      setCategories((prev) => {
        const next = prev.filter((x) => x.id !== c.id);
        if (category === c.name && next.length > 0) setCategory(next[0].name);
        return next;
      });
      setConfirmDeleteCategoryId(null);
    } catch (e) {
      setConfirmDeleteCategoryId(null);
      onError(e instanceof Error ? e.message : "カテゴリの削除に失敗しました");
    }
  };

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
      setConfirmDeleteId(null);
    } catch (e) {
      onError(e instanceof Error ? e.message : "削除に失敗しました");
    }
  };

  const toggleVisible = (id: string) => setHiddenIds((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));

  const startEdit = (entry: PasswordEntry) => {
    setEditingId(entry.id);
    setEditDraft({ category: entry.category, service: entry.service, url: entry.url, username: entry.username, usernameLabel: entry.usernameLabel || "ID", password: entry.password, notes: entry.notes });
  };

  const cancelEdit = () => setEditingId(null);

  const saveEdit = async (id: string) => {
    if (!editDraft.service.trim() || !editDraft.password) return;
    try {
      const updated = await api.patchPassword(id, editDraft);
      setEntries((prev) => prev.map((e) => (e.id === id ? updated : e)));
      setEditingId(null);
    } catch (e) {
      onError(e instanceof Error ? e.message : "保存に失敗しました");
    }
  };

  const filtered = entries.filter((e) => e.category === category);

  return (
    <div className="flex-1 overflow-y-auto p-6">
      <div className="max-w-6xl mx-auto">
        <div className="flex items-center gap-2 px-4 py-2 mb-4 text-sm rounded" style={{ backgroundColor: "#F3DEDC", color: COLORS.vermillion }}>
          <AlertTriangle size={16} className="flex-shrink-0" />
          パスワードは保存時に暗号化されますが、閲覧できるメンバーは共通です。取り扱いに注意してください。
        </div>

        <div className="flex gap-1.5 flex-wrap items-center mb-3">
          {categories.map((c) => (
            <button
              key={c.id}
              onClick={() => setCategory(c.name)}
              className="text-xs font-bold px-3 py-1.5 rounded-full"
              style={{
                backgroundColor: category === c.name ? COLORS.navy : "transparent",
                color: category === c.name ? "#fff" : COLORS.navy,
                border: `1px solid ${COLORS.navy}`,
              }}
            >
              {c.name}
            </button>
          ))}
          {categoriesLoaded && (
            <button onClick={() => setShowCategoryManager((v) => !v)} className="flex items-center gap-1 text-xs px-2.5 py-1.5 rounded-full hover:opacity-70" style={{ color: COLORS.slate, border: `1px dashed ${COLORS.brass}` }} title="カテゴリの追加・名前変更・削除">
              <Settings size={12} /> カテゴリを管理
            </button>
          )}
        </div>

        {showCategoryManager && (
          <div className="rounded p-4 mb-5" style={{ backgroundColor: COLORS.card, border: `1px solid ${COLORS.brassLight}` }}>
            <h3 className="text-sm font-bold mb-2" style={{ fontFamily: FONT_MINCHO, color: COLORS.navy }}>カテゴリの管理</h3>
            <p className="text-xs mb-3" style={{ color: COLORS.slate }}>追加・名前の変更・削除ができます。パスワードが登録されているカテゴリは、削除できません（先に別のカテゴリへ移動するか、削除してください）。</p>
            <div className="flex flex-col gap-1.5 mb-3">
              {categories.map((c) => (
                <div key={c.id} className="flex items-center gap-2 p-2 rounded text-sm" style={{ backgroundColor: COLORS.paper }}>
                  {renamingCategoryId === c.id ? (
                    <>
                      <TextInput type="text" value={renameDraft} onChange={(e) => setRenameDraft(e.target.value)} onKeyDown={(e) => e.key === "Enter" && renameCategory(c)} autoFocus className="flex-1" />
                      <button onClick={() => renameCategory(c)} className="flex items-center gap-1 text-xs font-bold px-2.5 py-1.5 rounded" style={{ backgroundColor: COLORS.navy, color: "#fff" }}><Save size={12} /> 保存</button>
                      <button onClick={() => setRenamingCategoryId(null)} className="text-xs px-2 py-1.5" style={{ color: COLORS.slate }}>キャンセル</button>
                    </>
                  ) : (
                    <>
                      <span className="flex-1 min-w-0 truncate">{c.name}<span className="text-xs ml-2" style={{ color: COLORS.slate }}>{entries.filter((e) => e.category === c.name).length}件</span></span>
                      <button onClick={() => { setRenamingCategoryId(c.id); setRenameDraft(c.name); }} className="p-1.5 rounded hover:opacity-70" style={{ color: COLORS.navy }} title="名前を変更"><Pencil size={15} /></button>
                      {confirmDeleteCategoryId === c.id ? (
                        <span className="flex items-center gap-2 text-xs">
                          <button onClick={() => removeCategory(c)} className="underline font-bold" style={{ color: COLORS.vermillion }}>削除確定</button>
                          <button onClick={() => setConfirmDeleteCategoryId(null)} className="underline" style={{ color: COLORS.slate }}>取消</button>
                        </span>
                      ) : (
                        <button onClick={() => setConfirmDeleteCategoryId(c.id)} className="p-1.5 rounded hover:opacity-70" style={{ color: COLORS.vermillion }} title="カテゴリを削除"><X size={16} /></button>
                      )}
                    </>
                  )}
                </div>
              ))}
            </div>
            <div className="flex gap-2">
              <TextInput type="text" placeholder="新しいカテゴリ名（例：イガワ）" value={newCategoryName} onChange={(e) => setNewCategoryName(e.target.value)} onKeyDown={(e) => e.key === "Enter" && addCategory()} className="flex-1" />
              <button onClick={addCategory} disabled={!newCategoryName.trim()} className="flex items-center gap-1 text-sm font-bold px-3 py-2 rounded disabled:opacity-40 flex-shrink-0" style={{ backgroundColor: COLORS.navy, color: "#fff" }}><Plus size={14} /> 追加</button>
            </div>
          </div>
        )}
        <div className="mb-2" />

        <div className="rounded p-5 mb-5" style={{ backgroundColor: COLORS.card, border: `1px solid ${COLORS.brassLight}` }}>
          <h3 className="text-sm font-bold mb-3" style={{ fontFamily: FONT_MINCHO, color: COLORS.navy }}>新規登録（{category}）</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2 mb-2">
            <TextInput type="text" placeholder="サービス名" value={form.service} onChange={(e) => setForm({ ...form, service: e.target.value })} />
            <TextInput type="text" placeholder="URL" value={form.url} onChange={(e) => setForm({ ...form, url: e.target.value })} />
            <div className="flex gap-2">
              <TextInput type="text" placeholder="ID欄の呼び方" value={form.usernameLabel} onChange={(e) => setForm({ ...form, usernameLabel: e.target.value })} className="w-28 flex-shrink-0" />
              <TextInput type="text" placeholder="ID / ユーザー名など" value={form.username} onChange={(e) => setForm({ ...form, username: e.target.value })} className="flex-1" />
            </div>
            <TextInput type="text" placeholder="パスワード" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} />
          </div>
          <TextInput type="text" placeholder="メモ" value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} className="w-full mb-3" />
          <button onClick={addEntry} disabled={!form.service.trim() || !form.password} className="text-sm font-bold px-4 py-2 rounded disabled:opacity-40" style={{ backgroundColor: COLORS.navy, color: "#fff" }}>登録する</button>
        </div>

        {filtered.length === 0 ? (
          <p className="text-sm py-10 text-center rounded" style={{ color: COLORS.slate, backgroundColor: COLORS.card, border: `1px solid ${COLORS.brassLight}` }}>登録されているパスワードはありません。</p>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-2 items-start">
            {filtered.map((entry) => {
              const visible = !hiddenIds.includes(entry.id);

              if (editingId === entry.id) {
                return (
                  <div key={entry.id} className="rounded p-4" style={{ backgroundColor: COLORS.card, border: `1px solid ${COLORS.navy}` }}>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mb-2">
                      <label className="text-xs sm:col-span-2" style={{ color: COLORS.slate }}>
                        カテゴリ
                        <select value={editDraft.category} onChange={(e) => setEditDraft({ ...editDraft, category: e.target.value })} className="mt-1 w-full text-sm p-2 rounded outline-none" style={{ border: `1px solid ${COLORS.brassLight}`, backgroundColor: COLORS.card }}>
                          {categories.some((c) => c.name === editDraft.category) ? null : <option value={editDraft.category}>{editDraft.category}</option>}
                          {categories.map((c) => <option key={c.id} value={c.name}>{c.name}</option>)}
                        </select>
                      </label>
                      <TextInput type="text" placeholder="サービス名" value={editDraft.service} onChange={(e) => setEditDraft({ ...editDraft, service: e.target.value })} />
                      <TextInput type="text" placeholder="URL" value={editDraft.url} onChange={(e) => setEditDraft({ ...editDraft, url: e.target.value })} />
                      <div className="flex gap-2">
                        <TextInput type="text" placeholder="ID欄の呼び方" value={editDraft.usernameLabel} onChange={(e) => setEditDraft({ ...editDraft, usernameLabel: e.target.value })} className="w-28 flex-shrink-0" />
                        <TextInput type="text" placeholder="ID / ユーザー名など" value={editDraft.username} onChange={(e) => setEditDraft({ ...editDraft, username: e.target.value })} className="flex-1" />
                      </div>
                      <TextInput type="text" placeholder="パスワード" value={editDraft.password} onChange={(e) => setEditDraft({ ...editDraft, password: e.target.value })} />
                    </div>
                    <TextInput type="text" placeholder="メモ" value={editDraft.notes} onChange={(e) => setEditDraft({ ...editDraft, notes: e.target.value })} className="w-full mb-3" />
                    <div className="flex justify-end gap-2">
                      <button onClick={cancelEdit} className="text-xs px-2.5 py-1.5 rounded" style={{ color: COLORS.slate }}>キャンセル</button>
                      <button onClick={() => saveEdit(entry.id)} disabled={!editDraft.service.trim() || !editDraft.password} className="flex items-center gap-1 text-sm font-bold px-3 py-1.5 rounded disabled:opacity-40" style={{ backgroundColor: COLORS.navy, color: "#fff" }}>
                        <Save size={13} /> 保存
                      </button>
                    </div>
                  </div>
                );
              }

              return (
                <div key={entry.id} className="rounded p-4" style={{ backgroundColor: COLORS.card, border: `1px solid ${COLORS.brassLight}` }}>
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1">
                      <p className="text-sm font-bold">{entry.service}</p>
                      {entry.url && <a href={entry.url} target="_blank" rel="noopener noreferrer" className="text-xs underline" style={{ color: COLORS.navy }}>{entry.url}</a>}
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      <button onClick={() => startEdit(entry)} style={{ color: COLORS.slate }} title="編集する"><Pencil size={14} /></button>
                      {confirmDeleteId === entry.id ? (
                        <div className="flex items-center gap-1.5 text-xs flex-shrink-0">
                          <button onClick={() => removeEntry(entry.id)} className="underline font-bold" style={{ color: COLORS.vermillion }}>削除確定</button>
                          <button onClick={() => setConfirmDeleteId(null)} className="underline" style={{ color: COLORS.slate }}>取消</button>
                        </div>
                      ) : (
                        <button onClick={() => setConfirmDeleteId(entry.id)} style={{ color: COLORS.slate }} title="削除する"><X size={14} /></button>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-2 mt-2 text-sm">
                    <span style={{ color: COLORS.slate }} className="w-16 flex-shrink-0 truncate" title={entry.usernameLabel || "ID"}>{entry.usernameLabel || "ID"}</span>
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
