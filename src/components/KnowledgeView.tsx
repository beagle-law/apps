"use client";

import { useEffect, useState } from "react";
import { X } from "lucide-react";
import { COLORS, FONT_MINCHO, CASE_CLASSIFICATIONS } from "@/lib/constants";
import { formatDate } from "@/lib/dates";
import { TextInput } from "@/components/ui";
import * as api from "@/lib/api-client";
import type { KnowhowEntry, Template } from "@/lib/types";

interface Props {
  onError: (msg: string) => void;
}

export default function KnowledgeView({ onError }: Props) {
  const [subView, setSubView] = useState<"knowhow" | "templates">("knowhow");
  const [knowhow, setKnowhow] = useState<KnowhowEntry[]>([]);
  const [templates, setTemplates] = useState<Template[]>([]);
  const [category, setCategory] = useState(CASE_CLASSIFICATIONS[0]);
  const [newKnowhow, setNewKnowhow] = useState({ title: "", content: "" });
  const [newTemplateName, setNewTemplateName] = useState("");

  useEffect(() => {
    api.fetchKnowhow().then(setKnowhow).catch((e) => onError(e instanceof Error ? e.message : "取得に失敗しました"));
    api.fetchTemplates().then(setTemplates).catch((e) => onError(e instanceof Error ? e.message : "取得に失敗しました"));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const addKnowhowEntry = async () => {
    if (!newKnowhow.title.trim()) return;
    try {
      const created = await api.addKnowhow({ category, title: newKnowhow.title, content: newKnowhow.content });
      setKnowhow((prev) => [created, ...prev]);
      setNewKnowhow({ title: "", content: "" });
    } catch (e) {
      onError(e instanceof Error ? e.message : "登録に失敗しました");
    }
  };
  const removeKnowhow = async (id: string) => {
    try {
      await api.deleteKnowhow(id);
      setKnowhow((prev) => prev.filter((k) => k.id !== id));
    } catch (e) {
      onError(e instanceof Error ? e.message : "削除に失敗しました");
    }
  };

  const addTemplateEntry = async () => {
    if (!newTemplateName.trim()) return;
    try {
      const created = await api.addTemplate(newTemplateName.trim());
      setTemplates((prev) => [created, ...prev]);
      setNewTemplateName("");
    } catch (e) {
      onError(e instanceof Error ? e.message : "登録に失敗しました");
    }
  };
  const saveTemplate = async (id: string, content: string) => {
    try {
      const updated = await api.saveTemplateContent(id, content);
      setTemplates((prev) => prev.map((t) => (t.id === id ? updated : t)));
    } catch (e) {
      onError(e instanceof Error ? e.message : "保存に失敗しました");
    }
  };
  const removeTemplate = async (id: string) => {
    try {
      await api.deleteTemplate(id);
      setTemplates((prev) => prev.filter((t) => t.id !== id));
    } catch (e) {
      onError(e instanceof Error ? e.message : "削除に失敗しました");
    }
  };

  return (
    <div className="flex-1 overflow-y-auto p-6">
      <div className="max-w-2xl mx-auto">
        <h2 className="text-lg mb-4" style={{ fontFamily: FONT_MINCHO, color: COLORS.navy }}>ノウハウ・ひながた</h2>

        <div className="flex gap-2 mb-5">
          {(["knowhow", "templates"] as const).map((v) => (
            <button
              key={v}
              onClick={() => setSubView(v)}
              className="text-sm font-bold px-4 py-1.5 rounded-full"
              style={{ backgroundColor: subView === v ? COLORS.navy : "transparent", color: subView === v ? "#fff" : COLORS.navy, border: `1px solid ${COLORS.navy}` }}
            >
              {v === "knowhow" ? "ノウハウ" : "ひながた"}
            </button>
          ))}
        </div>

        {subView === "knowhow" ? (
          <>
            <div className="flex gap-1.5 flex-wrap mb-4">
              {CASE_CLASSIFICATIONS.map((c) => (
                <button key={c} onClick={() => setCategory(c)} className="text-xs px-2.5 py-1 rounded-full" style={{ backgroundColor: category === c ? COLORS.brass : "transparent", color: category === c ? "#fff" : COLORS.brass, border: `1px solid ${COLORS.brass}` }}>{c}</button>
              ))}
            </div>
            <div className="rounded p-5 mb-4" style={{ backgroundColor: COLORS.card, border: `1px solid ${COLORS.brassLight}` }}>
              <TextInput type="text" placeholder="タイトル" value={newKnowhow.title} onChange={(e) => setNewKnowhow({ ...newKnowhow, title: e.target.value })} className="w-full mb-2" />
              <textarea value={newKnowhow.content} onChange={(e) => setNewKnowhow({ ...newKnowhow, content: e.target.value })} rows={3} placeholder="内容" className="w-full text-sm p-2 rounded outline-none resize-none mb-2" style={{ border: `1px solid ${COLORS.brassLight}` }} />
              <button onClick={addKnowhowEntry} disabled={!newKnowhow.title.trim()} className="text-sm font-bold px-4 py-2 rounded disabled:opacity-40" style={{ backgroundColor: COLORS.navy, color: "#fff" }}>登録する</button>
            </div>
            <div className="flex flex-col gap-2">
              {knowhow.filter((k) => k.category === category).map((k) => (
                <div key={k.id} className="rounded p-4" style={{ backgroundColor: COLORS.card, border: `1px solid ${COLORS.brassLight}` }}>
                  <div className="flex items-start justify-between gap-2">
                    <p className="text-sm font-bold">{k.title}</p>
                    <button onClick={() => removeKnowhow(k.id)} style={{ color: COLORS.slate }}><X size={14} /></button>
                  </div>
                  {k.content && <p className="text-sm mt-1 whitespace-pre-wrap">{k.content}</p>}
                  <p className="text-xs mt-2" style={{ color: COLORS.slate }}>{formatDate(k.createdAt.slice(0, 10))}</p>
                </div>
              ))}
            </div>
          </>
        ) : (
          <>
            <div className="flex gap-2 mb-4">
              <TextInput type="text" placeholder="ひな形の名称" value={newTemplateName} onChange={(e) => setNewTemplateName(e.target.value)} className="flex-1" />
              <button onClick={addTemplateEntry} disabled={!newTemplateName.trim()} className="text-sm font-bold px-4 rounded disabled:opacity-40" style={{ backgroundColor: COLORS.navy, color: "#fff" }}>追加</button>
            </div>
            <div className="flex flex-col gap-3">
              {templates.map((t) => (
                <div key={t.id} className="rounded p-4" style={{ backgroundColor: COLORS.card, border: `1px solid ${COLORS.brassLight}` }}>
                  <div className="flex items-center justify-between mb-2">
                    <p className="text-sm font-bold">{t.name}</p>
                    <div className="flex items-center gap-2">
                      <span className="text-xs" style={{ color: COLORS.slate }}>最終更新：{formatDate(t.updatedAt.slice(0, 10))}</span>
                      <button onClick={() => removeTemplate(t.id)} style={{ color: COLORS.slate }}><X size={14} /></button>
                    </div>
                  </div>
                  <textarea defaultValue={t.content} onBlur={(e) => saveTemplate(t.id, e.target.value)} rows={6} className="w-full text-sm p-2 rounded outline-none font-mono resize-none" style={{ border: `1px solid ${COLORS.brassLight}` }} />
                </div>
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
