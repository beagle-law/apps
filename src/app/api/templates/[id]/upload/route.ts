import { NextRequest, NextResponse } from "next/server";
import { put, del } from "@vercel/blob";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";

const MAX_SIZE = 3 * 1024 * 1024; // 3MB（v10 3.4）
const ALLOWED_EXTENSIONS = [".doc", ".docx"];
const ALLOWED_MIME_TYPES = [
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
];

// ひな形Wordファイルのアップロード／差し替え（v10 3.4・5章）。実ファイルはVercel Blobに保存する。
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "認証が必要です" }, { status: 401 });

  const { id } = await params;
  const existing = await prisma.template.findUnique({ where: { id } });
  if (!existing) return NextResponse.json({ error: "ひな形が見つかりません" }, { status: 404 });

  const formData = await req.formData();
  const file = formData.get("file");
  if (!(file instanceof File)) {
    return NextResponse.json({ error: "ファイルを選択してください" }, { status: 400 });
  }
  const ext = file.name.slice(file.name.lastIndexOf(".")).toLowerCase();
  if (!ALLOWED_EXTENSIONS.includes(ext) || (file.type && !ALLOWED_MIME_TYPES.includes(file.type))) {
    return NextResponse.json({ error: "Word形式（.doc/.docx）のファイルのみアップロードできます" }, { status: 400 });
  }
  if (file.size > MAX_SIZE) {
    return NextResponse.json({ error: "ファイルサイズは3MBまでです" }, { status: 400 });
  }

  const blob = await put(`templates/${id}/${Date.now()}${ext}`, file, {
    access: "public",
    token: process.env.BLOB_READ_WRITE_TOKEN,
  });

  if (existing.blobUrl) {
    await del(existing.blobUrl, { token: process.env.BLOB_READ_WRITE_TOKEN }).catch(() => {});
  }

  const updated = await prisma.template.update({
    where: { id },
    data: {
      blobUrl: blob.url,
      originalFileName: file.name,
      fileSize: file.size,
      mimeType: file.type || "",
    },
  });
  return NextResponse.json(updated);
}
