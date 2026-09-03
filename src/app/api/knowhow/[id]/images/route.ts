import { NextRequest, NextResponse } from "next/server";
import { put } from "@vercel/blob";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";

const MAX_SIZE = 5 * 1024 * 1024; // 5MB（スクリーンショット等の画像添付、v13）
const ALLOWED_MIME_TYPES = ["image/png", "image/jpeg", "image/gif", "image/webp"];

// ノウハウへのスクリーンショット等の画像アップロード。実ファイルはVercel Blobに保存する。
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "認証が必要です" }, { status: 401 });

  const { id } = await params;
  const existing = await prisma.knowhowEntry.findUnique({ where: { id } });
  if (!existing) return NextResponse.json({ error: "ノウハウが見つかりません" }, { status: 404 });

  const formData = await req.formData();
  const file = formData.get("file");
  if (!(file instanceof File)) {
    return NextResponse.json({ error: "ファイルを選択してください" }, { status: 400 });
  }
  if (!ALLOWED_MIME_TYPES.includes(file.type)) {
    return NextResponse.json({ error: "画像ファイル（PNG/JPEG/GIF/WEBP）のみアップロードできます" }, { status: 400 });
  }
  if (file.size > MAX_SIZE) {
    return NextResponse.json({ error: "ファイルサイズは5MBまでです" }, { status: 400 });
  }

  const ext = file.name.includes(".") ? file.name.slice(file.name.lastIndexOf(".")).toLowerCase() : "";
  const blob = await put(`knowhow/${id}/${Date.now()}${ext}`, file, { access: "private" });

  const created = await prisma.knowhowImage.create({
    data: {
      knowhowId: id,
      blobUrl: blob.url,
      originalFileName: file.name,
      fileSize: file.size,
      mimeType: file.type,
    },
  });
  return NextResponse.json(created, { status: 201 });
}
