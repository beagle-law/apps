import { NextRequest, NextResponse } from "next/server";
import { get } from "@vercel/blob";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";

// privateなVercel Blobストアからひな形ファイルを配信する（v10 3.4）。
// privateブロブは直リンクできないため、認証済みユーザーのみこの経由で取得できる。
export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "認証が必要です" }, { status: 401 });

  const { id } = await params;
  const template = await prisma.template.findUnique({ where: { id } });
  if (!template?.blobUrl) return NextResponse.json({ error: "ひな形が見つかりません" }, { status: 404 });

  const result = await get(template.blobUrl, { access: "private" });
  if (!result || result.statusCode !== 200 || !result.stream) {
    return NextResponse.json({ error: "ファイルの取得に失敗しました" }, { status: 404 });
  }

  const filename = encodeURIComponent(template.originalFileName || template.name);
  return new NextResponse(result.stream, {
    headers: {
      "Content-Type": result.blob.contentType || template.mimeType || "application/octet-stream",
      "Content-Disposition": `attachment; filename*=UTF-8''${filename}`,
      "X-Content-Type-Options": "nosniff",
      "Cache-Control": "private, no-cache",
    },
  });
}
