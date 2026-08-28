import { NextRequest, NextResponse } from "next/server";
import { del } from "@vercel/blob";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "認証が必要です" }, { status: 401 });

  const { id } = await params;
  const existing = await prisma.template.findUnique({ where: { id } });
  if (existing?.blobUrl) {
    await del(existing.blobUrl).catch(() => {});
  }
  await prisma.template.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
