"use client";

import { useEffect, useState } from "react";
import { COLORS, FONT_MINCHO } from "@/lib/constants";
import * as api from "@/lib/api-client";
import type { BackupLogRow } from "@/lib/api-client";

const fmt = (iso: string) =>
  new Date(iso).toLocaleString("ja-JP", { timeZone: "Asia/Tokyo", year: "numeric", month: "numeric", day: "numeric", hour: "2-digit", minute: "2-digit" });

// v37：自動バックアップの状況（管理者のみ）。毎日0:00（日本時間）に、全データを Box のフォルダへ保存する。
export default function BackupCard({ onError }: { onError: (msg: string) => void }) {
  const [status, setStatus] = useState<{ boxConfigured: boolean; cronConfigured: boolean; logs: BackupLogRow[] } | null>(null);
  const [running, setRunning] = useState(false);
  const [message, setMessage] = useState("");

  const load = () => api.fetchBackupStatus().then(setStatus).catch((e) => onError(e instanceof Error ? e.message : "取得に失敗しました"));
  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const runNow = async () => {
    if (!window.confirm("今すぐ、全データのバックアップを Box に保存します。よろしいですか？")) return;
    setRunning(true);
    setMessage("");
    try {
      const r = await api.runBackupNow();
      setMessage(r.ok ? `完了：${r.fileName}（${(r.sizeBytes / 1024).toFixed(0)}KB）` : `失敗：${r.message}`);
      await load();
    } catch (e) {
      onError(e instanceof Error ? e.message : "バックアップに失敗しました");
    } finally {
      setRunning(false);
    }
  };

  return (
    <div className="rounded p-5" style={{ backgroundColor: COLORS.card, border: `1px solid ${COLORS.brassLight}` }}>
      <h3 className="text-sm font-bold mb-2" style={{ fontFamily: FONT_MINCHO, color: COLORS.navy }}>自動バックアップ（管理者のみ）</h3>
      <p className="text-xs mb-3" style={{ color: COLORS.slate }}>
        毎日0:00（日本時間）に、全データ（添付ファイルの本体と個人メモを除く）を Box のフォルダへ保存します。保存期間は30日分です。
      </p>

      {status && (
        <div className="flex flex-col gap-1 text-xs mb-3">
          <p>Box連携：<b style={{ color: status.boxConfigured ? COLORS.moss : COLORS.vermillion }}>{status.boxConfigured ? "設定済み" : "未設定（環境変数が必要です）"}</b></p>
          <p>毎日の自動実行：<b style={{ color: status.cronConfigured ? COLORS.moss : COLORS.vermillion }}>{status.cronConfigured ? "設定済み" : "未設定（CRON_SECRET が必要です）"}</b></p>
        </div>
      )}

      <button onClick={runNow} disabled={running} className="text-sm font-bold px-4 py-2 rounded disabled:opacity-40" style={{ backgroundColor: COLORS.navy, color: "#fff" }}>
        {running ? "バックアップ中..." : "今すぐバックアップ"}
      </button>
      {message && <p className="text-xs mt-2" style={{ color: message.startsWith("完了") ? COLORS.moss : COLORS.vermillion }}>{message}</p>}

      <p className="text-xs font-bold mt-4 mb-1" style={{ color: COLORS.navy }}>最近の実行結果</p>
      {!status || status.logs.length === 0 ? (
        <p className="text-xs" style={{ color: COLORS.slate }}>まだ実行されていません。</p>
      ) : (
        <div className="flex flex-col gap-1.5">
          {status.logs.map((l) => (
            <div key={l.id} className="text-xs p-2 rounded" style={{ backgroundColor: COLORS.paper }}>
              <div className="flex items-center gap-2 flex-wrap">
                <b style={{ color: l.ok ? COLORS.moss : COLORS.vermillion }}>{l.ok ? "成功" : "失敗"}</b>
                <span style={{ color: COLORS.slate }}>{fmt(l.createdAt)}（{l.trigger === "cron" ? "自動" : "手動"}）</span>
                {l.sizeBytes > 0 && <span style={{ color: COLORS.slate }}>{(l.sizeBytes / 1024).toFixed(0)}KB</span>}
              </div>
              <p className="mt-0.5 break-words" style={{ color: COLORS.ink }}>{l.message}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
