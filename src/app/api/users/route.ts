import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser, hashPassword, isAdmin } from "@/lib/auth";

export async function GET() {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "認証が必要です" }, { status: 401 });
  if (!isAdmin(user)) return NextResponse.json({ error: "管理者のみ操作できます" }, { status: 403 });

  const users = await prisma.user.findMany({
    select: { id: true, loginId: true, email: true, displayName: true, role: true, createdAt: true },
    orderBy: { createdAt: "asc" },
  });
  return NextResponse.json(users);
}

export async function POST(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "認証が必要です" }, { status: 401 });
  if (!isAdmin(user)) return NextResponse.json({ error: "管理者のみ操作できます" }, { status: 403 });

  const body = (await req.json()) as {
    loginId?: string;
    email?: string;
    displayName?: string;
    password?: string;
    role?: string;
  };
  if (!body.loginId?.trim() || !body.email?.trim() || !body.displayName?.trim() || !body.password) {
    return NextResponse.json({ error: "loginId・email・displayName・passwordは必須です" }, { status: 400 });
  }

  const passwordHash = await hashPassword(body.password);
  const created = await prisma.user.create({
    data: {
      loginId: body.loginId.trim(),
      email: body.email.trim(),
      displayName: body.displayName.trim(),
      passwordHash,
      role: body.role === "admin" ? "admin" : "user",
    },
    select: { id: true, loginId: true, email: true, displayName: true, role: true, createdAt: true },
  });

  await prisma.auditLog.create({
    data: { userId: user.id, action: "create-user", targetType: "User", targetId: created.id },
  });

  return NextResponse.json(created, { status: 201 });
}
