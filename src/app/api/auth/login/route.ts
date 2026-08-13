import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { verifyPassword } from "@/lib/auth";
import { createSessionToken, SESSION_COOKIE, SESSION_MAX_AGE } from "@/lib/session";

export async function POST(req: NextRequest) {
  let body: { loginId?: string; password?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "リクエストが不正です" }, { status: 400 });
  }

  const loginId = body.loginId?.trim() ?? "";
  const password = body.password ?? "";
  if (!loginId || !password) {
    return NextResponse.json({ error: "IDとパスワードを入力してください" }, { status: 400 });
  }

  const user = await prisma.user.findUnique({ where: { loginId } });
  // Always run bcrypt.compare (against a dummy hash if the user doesn't exist)
  // so response timing doesn't reveal whether the loginId exists.
  const hashToCheck =
    user?.passwordHash ?? "$2a$12$CwTycUXWue0Thq9StjUM0uJ8i8Q1nJqz6r4t3Q5W0mkDkg8kFY0Pu";
  const valid = await verifyPassword(password, hashToCheck);

  if (!user || !valid) {
    return NextResponse.json({ error: "IDまたはパスワードが違います" }, { status: 401 });
  }

  await prisma.auditLog.create({
    data: { userId: user.id, action: "login", targetType: "User", targetId: user.id },
  });

  const token = await createSessionToken(user.id);
  const res = NextResponse.json({
    ok: true,
    user: { id: user.id, loginId: user.loginId, displayName: user.displayName, role: user.role },
  });
  res.cookies.set(SESSION_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: SESSION_MAX_AGE,
  });
  return res;
}
