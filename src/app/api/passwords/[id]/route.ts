import { NextRequest, NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";
import { encryptField } from "@/lib/crypto";
import { serializePasswordEntry } from "@/lib/password-query";

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "認証が必要です" }, { status: 401 });

  const { id } = await params;
  const body = (await req.json()) as {
    category?: string;
    service?: string;
    url?: string;
    username?: string;
    password?: string;
    notes?: string;
  };

  const data: Prisma.PasswordEntryUpdateInput = {};
  if (body.category !== undefined) data.category = body.category;
  if (body.service !== undefined) data.service = body.service;
  if (body.url !== undefined) data.url = body.url;
  if (body.username !== undefined) data.username = encryptField(body.username);
  if (body.password !== undefined) data.password = encryptField(body.password);
  if (body.notes !== undefined) data.notes = body.notes;

  const updated = await prisma.passwordEntry.update({ where: { id }, data });
  await prisma.auditLog.create({
    data: { userId: user.id, action: "update-password-entry", targetType: "PasswordEntry", targetId: id },
  });
  return NextResponse.json(serializePasswordEntry(updated));
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "認証が必要です" }, { status: 401 });

  const { id } = await params;
  await prisma.passwordEntry.delete({ where: { id } });
  await prisma.auditLog.create({
    data: { userId: user.id, action: "delete-password-entry", targetType: "PasswordEntry", targetId: id },
  });
  return NextResponse.json({ ok: true });
}
