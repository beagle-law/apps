"use client";

import { useEffect, useState } from "react";
import { Download, Trash2 } from "lucide-react";
import { COLORS, FONT_MINCHO, STAFF_MEMBERS } from "@/lib/constants";
import { TextInput } from "@/components/ui";
import * as api from "@/lib/api-client";
import type { User } from "@/lib/types";

interface Props {
  currentUser: User;
  onError: (msg: string) => void;
}

export default function SettingsView({ currentUser, onError }: Props) {
  const [users, setUsers] = useState<User[]>([]);
  const [newUserForm, setNewUserForm] = useState({ loginId: "", email: "", displayName: "", password: "", role: "user" });
  const [resetPasswordDrafts, setResetPasswordDrafts] = useState<Record<string, string>>({});
  const [pwForm, setPwForm] = useState({ currentPassword: "", newPassword: "" });
  const [pwMessage, setPwMessage] = useState("");

  useEffect(() => {
    if (currentUser.role === "admin") {
      api.fetchUsers().then(setUsers).catch((e) => onError(e instanceof Error ? e.message : "取得に失敗しました"));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentUser.role]);

  const createUser = async () => {
    if (!newUserForm.loginId.trim() || !newUserForm.email.trim() || !newUserForm.displayName.trim() || !newUserForm.password) return;
    try {
      const created = await api.createUser(newUserForm);
      setUsers((prev) => [...prev, created]);
      setNewUserForm({ loginId: "", email: "", displayName: "", password: "", role: "user" });
    } catch (e) {
      onError(e instanceof Error ? e.message : "作成に失敗しました");
    }
  };

  const removeUser = async (id: string) => {
    try {
      await api.deleteUser(id);
      setUsers((prev) => prev.filter((u) => u.id !== id));
    } catch (e) {
      onError(e instanceof Error ? e.message : "削除に失敗しました");
    }
  };

  const resetPassword = async (id: string) => {
    const newPassword = resetPasswordDrafts[id];
    if (!newPassword || newPassword.length < 8) {
      onError("新しいパスワードは8文字以上にしてください");
      return;
    }
    try {
      await api.resetUserPassword(id, newPassword);
      setResetPasswordDrafts((prev) => ({ ...prev, [id]: "" }));
      setPwMessage(`パスワードをリセットしました`);
    } catch (e) {
      onError(e instanceof Error ? e.message : "リセットに失敗しました");
    }
  };

  const changeOwnPassword = async () => {
    setPwMessage("");
    try {
      await api.changePassword(pwForm.currentPassword, pwForm.newPassword);
      setPwForm({ currentPassword: "", newPassword: "" });
      setPwMessage("パスワードを変更しました");
    } catch (e) {
      onError(e instanceof Error ? e.message : "変更に失敗しました");
    }
  };

  return (
    <div className="flex-1 overflow-y-auto p-6">
      <div className="max-w-2xl mx-auto flex flex-col gap-5">
        <h2 className="text-lg" style={{ fontFamily: FONT_MINCHO, color: COLORS.navy }}>設定</h2>

        <div className="rounded p-5 flex items-center gap-3" style={{ backgroundColor: COLORS.card, border: `1px solid ${COLORS.brassLight}` }}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/logo-mark.png" alt="" className="w-12 h-12 flex-shrink-0" style={{ opacity: 0.9 }} />
          <div>
            <p className="text-sm font-bold" style={{ fontFamily: FONT_MINCHO }}>Beagle総合法律事務所</p>
            <p className="text-xs" style={{ color: COLORS.slate }}>案件進捗管理 内製ツール</p>
          </div>
        </div>

        <div className="rounded p-5" style={{ backgroundColor: COLORS.card, border: `1px solid ${COLORS.brassLight}` }}>
          <h3 className="text-sm font-bold mb-3" style={{ fontFamily: FONT_MINCHO, color: COLORS.navy }}>担当者</h3>
          <div className="flex gap-1.5 flex-wrap mb-2">
            {STAFF_MEMBERS.map((m) => (
              <span key={m} className="text-xs font-bold px-2.5 py-1 rounded-full" style={{ backgroundColor: COLORS.paper, border: `1px solid ${COLORS.brassLight}` }}>{m}</span>
            ))}
          </div>
          <p className="text-xs" style={{ color: COLORS.slate }}>このリストはアプリ側で固定設定されています。追加・変更が必要な場合はご相談ください。</p>
        </div>

        <div className="rounded p-5" style={{ backgroundColor: COLORS.card, border: `1px solid ${COLORS.brassLight}` }}>
          <h3 className="text-sm font-bold mb-3" style={{ fontFamily: FONT_MINCHO, color: COLORS.navy }}>パスワード変更</h3>
          <div className="flex flex-col gap-2">
            <TextInput type="password" placeholder="現在のパスワード" value={pwForm.currentPassword} onChange={(e) => setPwForm({ ...pwForm, currentPassword: e.target.value })} />
            <TextInput type="password" placeholder="新しいパスワード（8文字以上）" value={pwForm.newPassword} onChange={(e) => setPwForm({ ...pwForm, newPassword: e.target.value })} />
            <button onClick={changeOwnPassword} disabled={!pwForm.currentPassword || !pwForm.newPassword} className="self-start text-sm font-bold px-4 py-2 rounded disabled:opacity-40" style={{ backgroundColor: COLORS.navy, color: "#fff" }}>変更する</button>
            {pwMessage && <p className="text-xs" style={{ color: COLORS.moss }}>{pwMessage}</p>}
          </div>
        </div>

        {currentUser.role === "admin" && (
          <div className="rounded p-5" style={{ backgroundColor: COLORS.card, border: `1px solid ${COLORS.brassLight}` }}>
            <h3 className="text-sm font-bold mb-3" style={{ fontFamily: FONT_MINCHO, color: COLORS.navy }}>ユーザー管理（管理者のみ）</h3>
            <div className="flex flex-col gap-2 mb-4">
              {users.map((u) => (
                <div key={u.id} className="p-3 rounded" style={{ backgroundColor: COLORS.paper }}>
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-bold">{u.displayName}　<span className="text-xs font-normal" style={{ color: COLORS.slate }}>{u.loginId} / {u.role === "admin" ? "管理者" : "一般"}</span></p>
                      <p className="text-xs" style={{ color: COLORS.slate }}>{u.email}</p>
                    </div>
                    {u.id !== currentUser.id && (
                      <button onClick={() => removeUser(u.id)} style={{ color: COLORS.vermillion }}><Trash2 size={14} /></button>
                    )}
                  </div>
                  <div className="flex items-center gap-2 mt-2">
                    <TextInput type="password" placeholder="新しいパスワード" value={resetPasswordDrafts[u.id] || ""} onChange={(e) => setResetPasswordDrafts((prev) => ({ ...prev, [u.id]: e.target.value }))} className="flex-1" />
                    <button onClick={() => resetPassword(u.id)} className="text-xs font-bold px-3 py-2 rounded" style={{ backgroundColor: COLORS.navy, color: "#fff" }}>リセット</button>
                  </div>
                </div>
              ))}
            </div>
            <p className="text-xs font-bold mb-2" style={{ color: COLORS.slate }}>新規ユーザーを追加</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mb-2">
              <TextInput type="text" placeholder="ログインID" value={newUserForm.loginId} onChange={(e) => setNewUserForm({ ...newUserForm, loginId: e.target.value })} />
              <TextInput type="text" placeholder="表示名" value={newUserForm.displayName} onChange={(e) => setNewUserForm({ ...newUserForm, displayName: e.target.value })} />
              <TextInput type="text" placeholder="メールアドレス" value={newUserForm.email} onChange={(e) => setNewUserForm({ ...newUserForm, email: e.target.value })} />
              <TextInput type="password" placeholder="初期パスワード" value={newUserForm.password} onChange={(e) => setNewUserForm({ ...newUserForm, password: e.target.value })} />
            </div>
            <label className="flex items-center gap-1.5 text-xs mb-2" style={{ color: COLORS.slate }}>
              <input type="checkbox" checked={newUserForm.role === "admin"} onChange={(e) => setNewUserForm({ ...newUserForm, role: e.target.checked ? "admin" : "user" })} /> 管理者にする
            </label>
            <button onClick={createUser} className="text-sm font-bold px-4 py-2 rounded" style={{ backgroundColor: COLORS.vermillion, color: "#fff" }}>ユーザーを作成</button>
          </div>
        )}

        <div className="rounded p-5" style={{ backgroundColor: COLORS.card, border: `1px solid ${COLORS.brassLight}` }}>
          <h3 className="text-sm font-bold mb-2" style={{ fontFamily: FONT_MINCHO, color: COLORS.navy }}>データについて</h3>
          <p className="text-xs mb-3" style={{ color: COLORS.slate }}>
            パスワード管理・依頼者個人情報はデータベース保存時に暗号化されています。バックアップファイルには、パスワード管理データが復号済み（平文）で含まれます。取り扱いに十分ご注意ください。
          </p>
          <a href={api.backupUrl} className="inline-flex items-center gap-1.5 text-sm font-bold px-4 py-2 rounded" style={{ backgroundColor: COLORS.navy, color: "#fff" }}>
            <Download size={14} /> 全データをバックアップ（JSON）
          </a>
        </div>
      </div>
    </div>
  );
}
