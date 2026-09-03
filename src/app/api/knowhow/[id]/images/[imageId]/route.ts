import { NextRequest, NextResponse } from "next/server";
import { get, del } from "@vercel/blob";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";

// privateなVercel Blobストアから画像を配信する（<img src>から直接参照するためインライン表示）。
export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string; imageId: string }> }) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "認証が必要です" }, { status: 401 });

  const { imageId } = await params;
  const image = await prisma.knowhowImage.findUnique({ where: { id: imageId } });
  if (!image) return NextResponse.json({ error: "画像が見つかりません" }, { status: 404 });

  const result = await get(image.blobUrl, { access: "private" });
  if (!result || result.statusCode !== 200 || !result.stream) {
    return NextResponse.json({ error: "画像の取得に失敗しました" }, { status: 404 });
  }

  return new NextResponse(result.stream, {
    headers: {
      "Content-Type": result.blob.contentType || image.mimeType || "application/octet-stream",
      "X-Content-Type-Options": "nosniff",
      "Cache-Control": "private, max-age=3600",
    },
  });
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string; imageId: string }> }) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "認証が必要です" }, { status: 401 });

  const { id, imageId } = await params;
  const image = await prisma.knowhowImage.findUnique({ where: { id: imageId, knowhowId: id } });
  if (image) {
    await del(image.blobUrl).catch(() => {});
    await prisma.knowhowImage.delete({ where: { id: imageId } });
  }
  return NextResponse.json({ ok: true });
}
