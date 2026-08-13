import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";
import { encryptField } from "@/lib/crypto";
import { serializePasswordEntry } from "@/lib/password-query";

export async function GET() {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "認証が必要です" }, { status: 401 });

  const entries = await prisma.passwordEntry.findMany({ orderBy: { createdAt: "desc" } });
  return NextResponse.json(entries.map(serializePasswordEntry));
}

export async function POST(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "認証が必要です" }, { status: 401 });

  const body = (await req.json()) as {
    category?: string;
    service?: string;
    url?: string;
    username?: string;
    password?: string;
    notes?: string;
  };
  if (!body.category || !body.service?.trim() || !body.password) {
    return NextResponse.json({ error: "カテゴリ・サービス名・パスワードは必須です" }, { status: 400 });
  }

  const created = await prisma.passwordEntry.create({
    data: {
      category: body.category,
      service: body.service.trim(),
      url: body.url?.trim() || "",
      username: encryptField(body.username?.trim() || ""),
      password: encryptField(body.password),
      notes: body.notes?.trim() || "",
    },
  });

  await prisma.auditLog.create({
    data: { userId: user.id, action: "create-password-entry", targetType: "PasswordEntry", targetId: created.id },
  });

  return NextResponse.json(serializePasswordEntry(created), { status: 201 });
}
