import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";
import { encryptField } from "@/lib/crypto";
import { serializeClient } from "@/lib/client-query";

export async function GET() {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "認証が必要です" }, { status: 401 });

  const clients = await prisma.client.findMany({ orderBy: { clientNumber: "asc" } });
  return NextResponse.json(clients.map(serializeClient));
}

export async function POST(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "認証が必要です" }, { status: 401 });

  const body = (await req.json()) as {
    companyName?: string;
    address?: string;
    contactName?: string;
    phone?: string;
    email?: string;
    contactMethod?: string;
    source?: string;
    notes?: string;
  };
  if (!body.companyName?.trim()) {
    return NextResponse.json({ error: "企業名は必須です" }, { status: 400 });
  }

  const last = await prisma.client.findFirst({ orderBy: { clientNumber: "desc" } });
  const clientNumber = (last?.clientNumber ?? 0) + 1;

  const created = await prisma.client.create({
    data: {
      clientNumber,
      companyName: body.companyName.trim(),
      address: encryptField(body.address?.trim() || ""),
      contactName: encryptField(body.contactName?.trim() || ""),
      phone: encryptField(body.phone?.trim() || ""),
      email: encryptField(body.email?.trim() || ""),
      contactMethod: body.contactMethod?.trim() || "",
      source: body.source?.trim() || "",
      notes: body.notes?.trim() || "",
    },
  });
  return NextResponse.json(serializeClient(created), { status: 201 });
}
