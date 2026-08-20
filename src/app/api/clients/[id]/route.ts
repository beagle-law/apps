import { NextRequest, NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";
import { encryptField } from "@/lib/crypto";
import { serializeClient } from "@/lib/client-query";

interface PatchClientBody {
  companyName?: string;
  clientType?: string;
  address?: string;
  contactName?: string;
  phone?: string;
  email?: string;
  contactMethod?: string;
  source?: string;
  referrerName?: string;
  notes?: string;
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "認証が必要です" }, { status: 401 });

  const { id } = await params;
  const body = (await req.json()) as PatchClientBody;

  const data: Prisma.ClientUpdateInput = {};
  if (body.companyName !== undefined) data.companyName = body.companyName;
  if (body.clientType !== undefined) data.clientType = body.clientType;
  if (body.address !== undefined) data.address = encryptField(body.address);
  if (body.contactName !== undefined) data.contactName = encryptField(body.contactName);
  if (body.phone !== undefined) data.phone = encryptField(body.phone);
  if (body.email !== undefined) data.email = encryptField(body.email);
  if (body.contactMethod !== undefined) data.contactMethod = body.contactMethod;
  if (body.source !== undefined) data.source = body.source;
  if (body.referrerName !== undefined) data.referrerName = body.source === "紹介" || body.source === undefined ? body.referrerName : "";
  if (body.notes !== undefined) data.notes = body.notes;

  const updated = await prisma.client.update({ where: { id }, data });
  return NextResponse.json(serializeClient(updated));
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "認証が必要です" }, { status: 401 });

  const { id } = await params;
  await prisma.client.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
