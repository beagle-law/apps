// v29：電波がない／弱いときに個人メモ（タスク・メモ）を入力しても失われないよう、端末に一時保存して
// オンラインに戻ったときに自動で送信するための待ち行列。端末内（localStorage）にのみ保存し、送信できたら消す。

export interface PendingMemo {
  id: string;
  caseId: string;
  content: string;
  lane: "task" | "memo";
  at: number;
}

const KEY = "pendingClaimMemos";
const EVENT = "pending-memos-changed";

function read(): PendingMemo[] {
  try {
    const raw = window.localStorage.getItem(KEY);
    return raw ? (JSON.parse(raw) as PendingMemo[]) : [];
  } catch {
    return [];
  }
}

function write(list: PendingMemo[]) {
  try {
    window.localStorage.setItem(KEY, JSON.stringify(list));
  } catch {
    // 保存できない環境（プライベートモード等）では何もしない
  }
  window.dispatchEvent(new Event(EVENT));
}

export function getPendingMemos(caseId?: string): PendingMemo[] {
  const all = read();
  return caseId ? all.filter((m) => m.caseId === caseId) : all;
}

export function enqueueMemo(caseId: string, content: string, lane: "task" | "memo"): PendingMemo {
  const item: PendingMemo = { id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`, caseId, content, lane, at: Date.now() };
  write([...read(), item]);
  return item;
}

export function removePendingMemo(id: string) {
  write(read().filter((m) => m.id !== id));
}

/** 待ち行列が変わったとき（同じ画面・別タブとも）に呼ばれる。解除関数を返す。 */
export function subscribePending(fn: () => void): () => void {
  window.addEventListener(EVENT, fn);
  window.addEventListener("storage", fn);
  return () => {
    window.removeEventListener(EVENT, fn);
    window.removeEventListener("storage", fn);
  };
}

/** 電波がない・サーバーに届かないために失敗したか（サーバーが返したエラーは含まない）。 */
export function isNetworkFailure(e: unknown): boolean {
  return (typeof navigator !== "undefined" && navigator.onLine === false) || e instanceof TypeError;
}
