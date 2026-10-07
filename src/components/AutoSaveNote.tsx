"use client";

import { useEffect, useState } from "react";
import { COLORS } from "@/lib/constants";
import * as api from "@/lib/api-client";

interface Props {
  noteKey: string;
  placeholder?: string;
  rows?: number;
  onError: (msg: string) => void;
}

// v22：フリー入力メモ。入力欄の外をクリックすると自動保存される（noteKeyごとに1件）。
export default function AutoSaveNote({ noteKey, placeholder, rows = 10, onError }: Props) {
  const [content, setContent] = useState("");
  const [savedContent, setSavedContent] = useState("");
  const [loaded, setLoaded] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    let cancelled = false;
    setLoaded(false);
    api
      .fetchMonthlyNote(noteKey)
      .then((n) => {
        if (cancelled) return;
        setContent(n.content);
        setSavedContent(n.content);
        setLoaded(true);
      })
      .catch((e) => onError(e instanceof Error ? e.message : "取得に失敗しました"));
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [noteKey]);

  const save = async () => {
    if (!loaded || content === savedContent) return;
    setSaving(true);
    try {
      const n = await api.saveMonthlyNote(noteKey, content);
      setSavedContent(n.content);
    } catch (e) {
      onError(e instanceof Error ? e.message : "保存に失敗しました");
    } finally {
      setSaving(false);
    }
  };

  return (
    <>
      <textarea
        value={content}
        onChange={(e) => setContent(e.target.value)}
        onBlur={save}
        disabled={!loaded}
        placeholder={placeholder}
        rows={rows}
        className="w-full text-sm p-2 rounded outline-none resize-y"
        style={{ border: `1px solid ${COLORS.brassLight}`, lineHeight: 1.7, backgroundColor: COLORS.card }}
      />
      <p className="text-xs mt-1 text-right" style={{ color: COLORS.slate }}>
        {saving ? "保存中..." : loaded && content === savedContent ? "保存済み（入力欄の外をクリックすると自動保存されます）" : "未保存（入力欄の外をクリックすると自動保存されます）"}
      </p>
    </>
  );
}
