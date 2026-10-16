import type { Case, User } from "@/lib/types";

// v32：スマホでの起動を速くするため、前回表示した「ユーザー情報」と「個人メモ」を端末（localStorage）に保存しておき、
// 次に開いたときはサーバーの応答を待たずにすぐ表示する（表示後に最新の内容へ置き換える）。
// ・スマホ幅のときだけ保存する（共有のパソコンなどには残さない）
// ・ログアウト時・ログイン時に必ず消す（別のユーザーの内容が一瞬でも表示されないように）
// ・保存するのは本人の個人メモのみ。案件・顧客などの業務データは保存しない

const KEY = "bootCacheV1";

export interface BootCache {
  user: User;
  memoCase: Case;
  savedAt: number;
}

export function loadBootCache(): BootCache | null {
  try {
    const raw = window.localStorage.getItem(KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as BootCache;
    return parsed?.user && parsed?.memoCase ? parsed : null;
  } catch {
    return null;
  }
}

export function saveBootCache(user: User, memoCase: Case) {
  try {
    window.localStorage.setItem(KEY, JSON.stringify({ user, memoCase, savedAt: Date.now() } satisfies BootCache));
  } catch {
    // 保存できない環境（プライベートモード・容量不足など）では何もしない
  }
}

export function clearBootCache() {
  try {
    window.localStorage.removeItem(KEY);
  } catch {
    // 何もしない
  }
}
