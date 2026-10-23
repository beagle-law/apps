// v37：自動バックアップの保存先（Box）への、アップロードと古いバックアップの削除。
// 認証は、Box の「サーバー認証（Client Credentials Grant）」のカスタムアプリを使う。設定手順は docs/自動バックアップの設定手順.md を参照。
//
// 必要な環境変数（Vercel）：
//   BOX_CLIENT_ID / BOX_CLIENT_SECRET / BOX_ENTERPRISE_ID / BOX_BACKUP_FOLDER_ID
// テスト用に、接続先を BOX_API_BASE / BOX_UPLOAD_BASE で差し替えられる。

import { BACKUP_FILE_PREFIX, jstDate } from "@/lib/backup";

const API = () => process.env.BOX_API_BASE || "https://api.box.com";
const UPLOAD = () => process.env.BOX_UPLOAD_BASE || "https://upload.box.com";

export function boxConfig() {
  const clientId = process.env.BOX_CLIENT_ID;
  const clientSecret = process.env.BOX_CLIENT_SECRET;
  const enterpriseId = process.env.BOX_ENTERPRISE_ID;
  const folderId = process.env.BOX_BACKUP_FOLDER_ID;
  if (!clientId || !clientSecret || !enterpriseId || !folderId) return null;
  return { clientId, clientSecret, enterpriseId, folderId };
}

async function getAccessToken(cfg: NonNullable<ReturnType<typeof boxConfig>>): Promise<string> {
  const res = await fetch(`${API()}/oauth2/token`, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "client_credentials",
      client_id: cfg.clientId,
      client_secret: cfg.clientSecret,
      box_subject_type: "enterprise",
      box_subject_id: cfg.enterpriseId,
    }),
  });
  if (!res.ok) throw new Error(`Boxの認証に失敗しました（${res.status}）。アプリの設定と、管理者の承認を確認してください。`);
  const json = (await res.json()) as { access_token?: string };
  if (!json.access_token) throw new Error("Boxの認証に失敗しました（アクセストークンがありません）。");
  return json.access_token;
}

/** バックアップのファイルをBoxのフォルダへ保存する。同じ名前が既にある場合（同じ日に再実行した場合）は、新しい版として上書きする。 */
export async function uploadBackupToBox(fileName: string, data: Buffer): Promise<{ fileId: string; folderName: string }> {
  const cfg = boxConfig();
  if (!cfg) throw new Error("Boxの連携が未設定です（環境変数 BOX_CLIENT_ID などを設定してください）。");
  const token = await getAccessToken(cfg);

  const send = async (url: string, attributes: Record<string, unknown>) => {
    const form = new FormData();
    form.append("attributes", JSON.stringify(attributes));
    form.append("file", new Blob([new Uint8Array(data)], { type: "application/json" }), fileName);
    return fetch(url, { method: "POST", headers: { Authorization: `Bearer ${token}` }, body: form });
  };

  let res = await send(`${UPLOAD()}/api/2.0/files/content`, { name: fileName, parent: { id: cfg.folderId } });
  if (res.status === 409) {
    // 同名のファイルがある：その新しい版として保存する
    const conflict = (await res.json()) as { context_info?: { conflicts?: { id?: string } | { id?: string }[] } };
    const c = conflict.context_info?.conflicts;
    const existingId = Array.isArray(c) ? c[0]?.id : c?.id;
    if (!existingId) throw new Error("Boxへの保存に失敗しました（同名のファイルを特定できません）。");
    res = await send(`${UPLOAD()}/api/2.0/files/${existingId}/content`, { name: fileName });
  }
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`Boxへの保存に失敗しました（${res.status}）。保存先フォルダの権限（編集者）を確認してください。${text.slice(0, 120)}`);
  }
  const json = (await res.json()) as { entries?: { id: string; parent?: { id?: string; name?: string } }[] };
  const entry = json.entries?.[0];
  return { fileId: entry?.id ?? "", folderName: entry?.parent?.name ?? "" };
}

/** 保存期間（日数）より古いバックアップを削除する。名前が「beagle-backup_日付.json」のファイルだけが対象。 */
export async function pruneOldBackups(keepDays: number): Promise<number> {
  const cfg = boxConfig();
  if (!cfg) return 0;
  const token = await getAccessToken(cfg);
  const res = await fetch(`${API()}/2.0/folders/${cfg.folderId}/items?limit=1000&fields=id,name,type`, { headers: { Authorization: `Bearer ${token}` } });
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`Boxのフォルダの一覧を取得できませんでした（${res.status}）。${text.slice(0, 160)}`);
  }
  const json = (await res.json()) as { entries?: { id: string; name: string; type: string }[] };

  const cutoff = jstDate(new Date(Date.now() - keepDays * 24 * 60 * 60 * 1000));
  const pattern = new RegExp(`^${BACKUP_FILE_PREFIX}(\\d{4}-\\d{2}-\\d{2})\\.json$`);
  let deleted = 0;
  for (const e of json.entries ?? []) {
    if (e.type !== "file") continue;
    const m = pattern.exec(e.name);
    if (!m || m[1] >= cutoff) continue;
    const del = await fetch(`${API()}/2.0/files/${e.id}`, { method: "DELETE", headers: { Authorization: `Bearer ${token}` } });
    if (del.ok || del.status === 404) deleted += 1;
  }
  return deleted;
}
