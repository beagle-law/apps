"use client";

import { useEffect, useRef, useState } from "react";
import { X, Plus, Upload, Download } from "lucide-react";
import { COLORS, FONT_MINCHO } from "@/lib/constants";
import { formatDate } from "@/lib/dates";
import { TextInput } from "@/components/ui";
import * as api from "@/lib/api-client";
import type { KnowhowEntry, Template, CaseClassification } from "@/lib/types";

interface Props {
  classifications: CaseClassification[];
  onAddClassification: (name: string) => Promise<CaseClassification>;
  onError: (msg: string) => void;
}

export default function KnowledgeView({ classifications, onAddClassification, onError }: Props) {
  const [subView, setSubView] = useState<"knowhow" | "templates">("knowhow");
  const [knowhow, setKnowhow] = useState<KnowhowEntry[]>([]);
  const [templates, setTemplates] = useState<Template[]>([]);
  const [category, setCategory] = useState("");
  const [newCategoryInput, setNewCategoryInput] = useState("");
  const [newKnowhow, setNewKnowhow] = useState({ title: "", content: "" });
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editDraft, setEditDraft] = useState({ title: "", content: "" });
  const [newTemplateName, setNewTemplateName] = useState("");
  const [uploadingId, setUploadingId] = useState<string | null>(null);
  const fileInputs = useRef<Record<string, HTMLInputElement | null>>({});
  const [uploadingImageId, setUploadingImageId] = useState<string | null>(null);
  const knowhowFileInputs = useRef<Record<string, HTMLInputElement | null>>({});

  useEffect(() => {
    api.fetchKnowhow().then(setKnowhow).catch((e) => onError(e instanceof Error ? e.message : "取得に失敗しました"));
    api.fetchTemplates().then(setTemplates).catch((e) => onError(e instanceof Error ? e.message : "取得に失敗しました"));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!category && classifications.length > 0) setCategory(classifications[0].name);
  }, [classifications, category]);

  const addKnowhowEntry = async () => {
    if (!newKnowhow.title.trim() || !category) return;
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

  // v10 3.5：一覧のエントリをクリックすると編集フォームに読み込まれ、上書き保存できる
  const startEditKnowhow = (k: KnowhowEntry) => {
    setEditingId(k.id);
    setEditDraft({ title: k.title, content: k.content });
  };
  const saveEditKnowhow = async () => {
    if (!editingId || !editDraft.title.trim()) return;
    try {
      const updated = await api.updateKnowhow(editingId, { title: editDraft.title.trim(), content: editDraft.content });
      setKnowhow((prev) => prev.map((k) => (k.id === editingId ? updated : k)));
      setEditingId(null);
    } catch (e) {
      onError(e instanceof Error ? e.message : "保存に失敗しました");
    }
  };

  // v13：ノウハウにスクリーンショット等の画像を添付できるようにする。
  const uploadKnowhowImage = async (knowhowId: string, file: File) => {
    if (file.size > 5 * 1024 * 1024) {
      onError("ファイルサイズは5MBまでです");
      return;
    }
    setUploadingImageId(knowhowId);
    try {
      const image = await api.uploadKnowhowImage(knowhowId, file);
      setKnowhow((prev) => prev.map((k) => (k.id === knowhowId ? { ...k, images: [...k.images, image] } : k)));
    } catch (e) {
      onError(e instanceof Error ? e.message : "アップロードに失敗しました");
    } finally {
      setUploadingImageId(null);
    }
  };
  const removeKnowhowImage = async (knowhowId: string, imageId: string) => {
    try {
      await api.deleteKnowhowImage(knowhowId, imageId);
      setKnowhow((prev) => prev.map((k) => (k.id === knowhowId ? { ...k, images: k.images.filter((i) => i.id !== imageId) } : k)));
    } catch (e) {
      onError(e instanceof Error ? e.message : "削除に失敗しました");
    }
  };

  const addCategory = async () => {
    const name = newCategoryInput.trim();
    if (!name) return;
    try {
      const created = await onAddClassification(name);
      setCategory(created.name);
      setNewCategoryInput("");
    } catch (e) {
      onError(e instanceof Error ? e.message : "分類の追加に失敗しました");
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
  const removeTemplate = async (id: string) => {
    try {
      await api.deleteTemplate(id);
      setTemplates((prev) => prev.filter((t) => t.id !== id));
    } catch (e) {
      onError(e instanceof Error ? e.message : "削除に失敗しました");
    }
  };
  const uploadTemplate = async (id: string, file: File) => {
    if (file.size > 3 * 1024 * 1024) {
      onError("ファイルサイズは3MBまでです");
      return;
    }
    setUploadingId(id);
    try {
      const updated = await api.uploadTemplateFile(id, file);
      setTemplates((prev) => prev.map((t) => (t.id === id ? updated : t)));
    } catch (e) {
      onError(e instanceof Error ? e.message : "アップロードに失敗しました");
    } finally {
      setUploadingId(null);
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
            <div className="flex gap-1.5 flex-wrap items-center mb-4">
              {classifications.map((c) => (
                <button key={c.id} onClick={() => setCategory(c.name)} className="text-xs px-2.5 py-1 rounded-full" style={{ backgroundColor: category === c.name ? COLORS.brass : "transparent", color: category === c.name ? "#fff" : COLORS.brass, border: `1px solid ${COLORS.brass}` }}>{c.name}</button>
              ))}
              <div className="flex items-center gap-1">
                <TextInput type="text" placeholder="新しい分類" value={newCategoryInput} onChange={(e) => setNewCategoryInput(e.target.value)} style={{ width: 110 }} />
                <button onClick={addCategory} disabled={!newCategoryInput.trim()} className="p-1.5 rounded disabled:opacity-40" style={{ border: `1px solid ${COLORS.brassLight}`, color: COLORS.navy }}><Plus size={13} /></button>
              </div>
            </div>
            <div className="rounded p-5 mb-4" style={{ backgroundColor: COLORS.card, border: `1px solid ${COLORS.brassLight}` }}>
              <TextInput type="text" placeholder="タイトル" value={newKnowhow.title} onChange={(e) => setNewKnowhow({ ...newKnowhow, title: e.target.value })} className="w-full mb-2" />
              <textarea value={newKnowhow.content} onChange={(e) => setNewKnowhow({ ...newKnowhow, content: e.target.value })} rows={3} placeholder="内容" className="w-full text-sm p-2 rounded outline-none resize-none mb-2" style={{ border: `1px solid ${COLORS.brassLight}` }} />
              <button onClick={addKnowhowEntry} disabled={!newKnowhow.title.trim() || !category} className="text-sm font-bold px-4 py-2 rounded disabled:opacity-40" style={{ backgroundColor: COLORS.navy, color: "#fff" }}>登録する</button>
            </div>
            <div className="flex flex-col gap-2">
              {knowhow.filter((k) => k.category === category).map((k) =>
                editingId === k.id ? (
                  <div key={k.id} className="rounded p-4" style={{ backgroundColor: COLORS.card, border: `1px solid ${COLORS.navy}` }}>
                    <TextInput type="text" value={editDraft.title} onChange={(e) => setEditDraft({ ...editDraft, title: e.target.value })} className="w-full mb-2" />
                    <textarea value={editDraft.content} onChange={(e) => setEditDraft({ ...editDraft, content: e.target.value })} rows={4} className="w-full text-sm p-2 rounded outline-none resize-none mb-2" style={{ border: `1px solid ${COLORS.brassLight}` }} />
                    <KnowhowImageGallery
                      knowhowId={k.id}
                      images={k.images}
                      uploading={uploadingImageId === k.id}
                      fileInputRef={(el) => { knowhowFileInputs.current[k.id] = el; }}
                      onSelectFile={() => knowhowFileInputs.current[k.id]?.click()}
                      onUpload={(file) => uploadKnowhowImage(k.id, file)}
                      onRemove={(imageId) => removeKnowhowImage(k.id, imageId)}
                    />
                    <div className="flex justify-end gap-2 mt-2">
                      <button onClick={() => setEditingId(null)} className="text-xs px-3 py-1.5 rounded" style={{ color: COLORS.slate }}>キャンセル</button>
                      <button onClick={saveEditKnowhow} disabled={!editDraft.title.trim()} className="text-xs font-bold px-3 py-1.5 rounded disabled:opacity-40" style={{ backgroundColor: COLORS.navy, color: "#fff" }}>保存</button>
                    </div>
                  </div>
                ) : (
                  <div key={k.id} className="rounded p-4 cursor-pointer hover:opacity-90" style={{ backgroundColor: COLORS.card, border: `1px solid ${COLORS.brassLight}` }} onClick={() => startEditKnowhow(k)}>
                    <div className="flex items-start justify-between gap-2">
                      <p className="text-sm font-bold">{k.title}</p>
                      <button onClick={(e) => { e.stopPropagation(); removeKnowhow(k.id); }} style={{ color: COLORS.slate }}><X size={14} /></button>
                    </div>
                    {k.content && <p className="text-sm mt-1 whitespace-pre-wrap">{k.content}</p>}
                    <p className="text-xs mt-2" style={{ color: COLORS.slate }}>{formatDate(k.createdAt.slice(0, 10))}</p>
                    <div onClick={(e) => e.stopPropagation()}>
                      <KnowhowImageGallery
                        knowhowId={k.id}
                        images={k.images}
                        uploading={uploadingImageId === k.id}
                        fileInputRef={(el) => { knowhowFileInputs.current[k.id] = el; }}
                        onSelectFile={() => knowhowFileInputs.current[k.id]?.click()}
                        onUpload={(file) => uploadKnowhowImage(k.id, file)}
                        onRemove={(imageId) => removeKnowhowImage(k.id, imageId)}
                      />
                    </div>
                  </div>
                )
              )}
            </div>
          </>
        ) : (
          <>
            <div className="flex gap-2 mb-4">
              <TextInput type="text" placeholder="ひな形の名称" value={newTemplateName} onChange={(e) => setNewTemplateName(e.target.value)} className="flex-1" />
              <button onClick={addTemplateEntry} disabled={!newTemplateName.trim()} className="text-sm font-bold px-4 rounded disabled:opacity-40" style={{ backgroundColor: COLORS.navy, color: "#fff" }}>追加</button>
            </div>
            <p className="text-xs mb-4" style={{ color: COLORS.slate }}>Wordファイル（.doc/.docx、3MBまで）をアップロードしてください。</p>
            <div className="flex flex-col gap-3">
              {templates.map((t) => (
                <div key={t.id} className="rounded p-4" style={{ backgroundColor: COLORS.card, border: `1px solid ${COLORS.brassLight}` }}>
                  <div className="flex items-center justify-between mb-2 gap-2">
                    <p className="text-sm font-bold">{t.name}</p>
                    <button onClick={() => removeTemplate(t.id)} style={{ color: COLORS.slate }}><X size={14} /></button>
                  </div>
                  {t.blobUrl ? (
                    <div className="flex items-center justify-between gap-2 text-xs" style={{ color: COLORS.slate }}>
                      <span className="truncate">{t.originalFileName}（{Math.round(t.fileSize / 1024)}KB）・最終更新：{formatDate(t.updatedAt.slice(0, 10))}</span>
                      <div className="flex items-center gap-2 flex-shrink-0">
                        <a href={`/api/templates/${t.id}/download`} className="flex items-center gap-1 font-bold" style={{ color: COLORS.navy }}><Download size={12} /> ダウンロード</a>
                        <button onClick={() => fileInputs.current[t.id]?.click()} disabled={uploadingId === t.id} className="flex items-center gap-1 font-bold disabled:opacity-40" style={{ color: COLORS.navy }}>
                          <Upload size={12} /> 差し替え
                        </button>
                      </div>
                    </div>
                  ) : (
                    <button
                      onClick={() => fileInputs.current[t.id]?.click()}
                      disabled={uploadingId === t.id}
                      className="flex items-center gap-1.5 text-xs font-bold px-3 py-2 rounded disabled:opacity-40"
                      style={{ border: `1px dashed ${COLORS.brassLight}`, color: COLORS.navy }}
                    >
                      <Upload size={13} /> {uploadingId === t.id ? "アップロード中..." : "ファイルを選択"}
                    </button>
                  )}
                  <input
                    ref={(el) => { fileInputs.current[t.id] = el; }}
                    type="file"
                    accept=".doc,.docx"
                    className="hidden"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) uploadTemplate(t.id, file);
                      e.target.value = "";
                    }}
                  />
                </div>
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  );
}

// v13：ノウハウのスクリーンショット等の画像添付欄（登録済みの一覧・編集フォームの両方から共用）。
function KnowhowImageGallery({
  knowhowId,
  images,
  uploading,
  fileInputRef,
  onSelectFile,
  onUpload,
  onRemove,
}: {
  knowhowId: string;
  images: KnowhowEntry["images"];
  uploading: boolean;
  fileInputRef: (el: HTMLInputElement | null) => void;
  onSelectFile: () => void;
  onUpload: (file: File) => void;
  onRemove: (imageId: string) => void;
}) {
  return (
    <div className="flex flex-wrap items-center gap-2 mt-2">
      {images.map((img) => (
        <div key={img.id} className="relative group">
          <img
            src={`/api/knowhow/${knowhowId}/images/${img.id}`}
            alt={img.originalFileName}
            className="rounded object-cover"
            style={{ width: 64, height: 64, border: `1px solid ${COLORS.brassLight}` }}
          />
          <button
            onClick={() => onRemove(img.id)}
            className="absolute -top-1.5 -right-1.5 rounded-full opacity-0 group-hover:opacity-100 transition"
            style={{ backgroundColor: COLORS.card, border: `1px solid ${COLORS.brassLight}` }}
          >
            <X size={11} />
          </button>
        </div>
      ))}
      <button
        onClick={onSelectFile}
        disabled={uploading}
        title="画像を追加"
        className="flex items-center justify-center rounded disabled:opacity-40"
        style={{ width: 64, height: 64, border: `1px dashed ${COLORS.brassLight}`, color: COLORS.navy }}
      >
        <Upload size={15} />
      </button>
      <input
        ref={fileInputRef}
        type="file"
        accept="image/png,image/jpeg,image/gif,image/webp"
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) onUpload(file);
          e.target.value = "";
        }}
      />
    </div>
  );
}
