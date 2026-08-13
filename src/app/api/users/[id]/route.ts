import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser, hashPassword, isAdmin } from "@/lib/auth";

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "認証が必要です" }, { status: 401 });
  if (!isAdmin(user)) return NextResponse.json({ error: "管理者のみ操作できます" }, { status: 403 });

  const { id } = await params;
  if (id === user.id) {
    return NextResponse.json({ error: "自分自身は削除できません" }, { status: 400 });
  }

  await prisma.user.delete({ where: { id } });
  await prisma.auditLog.create({
    data: { userId: user.id, action: "delete-user", targetType: "User", targetId: id },
  });
  return NextResponse.json({ ok: true });
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "認証が必要です" }, { status: 401 });
  if (!isAdmin(user)) return NextResponse.json({ error: "管理者のみ操作できます" }, { status: 403 });

  const { id } = await params;
  const body = (await req.json()) as { newPassword?: string };
  if (!body.newPassword || body.newPassword.length < 8) {
    return NextResponse.json({ error: "新しいパスワードは8文字以上にしてください" }, { status: 400 });
  }

  const passwordHash = await hashPassword(body.newPassword);
  await prisma.user.update({ where: { id }, data: { passwordHash } });
  await prisma.auditLog.create({
    data: { userId: user.id, action: "reset-password", targetType: "User", targetId: id },
  });
  return NextResponse.json({ ok: true });
}
