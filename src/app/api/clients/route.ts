import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";
import { encryptField } from "@/lib/crypto";
import { serializeClient } from "@/lib/client-query";
import { suggestedNewClientNumber } from "@/lib/business/caseNumber";

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
    clientType?: string;
    address?: string;
    contactName?: string;
    phone?: string;
    email?: string;
    contactMethod?: string;
    source?: string;
    referrerName?: string;
    notes?: string;
  };
  if (!body.companyName?.trim()) {
    return NextResponse.json({ error: "企業名は必須です" }, { status: 400 });
  }

  const existing = await prisma.client.findMany({ select: { clientNumber: true } });
  const clientNumber = suggestedNewClientNumber(existing.map((c) => c.clientNumber));

  const created = await prisma.client.create({
    data: {
      clientNumber,
      companyName: body.companyName.trim(),
      clientType: body.clientType?.trim() || "法人",
      address: encryptField(body.address?.trim() || ""),
      contactName: encryptField(body.contactName?.trim() || ""),
      phone: encryptField(body.phone?.trim() || ""),
      email: encryptField(body.email?.trim() || ""),
      contactMethod: body.contactMethod?.trim() || "",
      source: body.source?.trim() || "",
      referrerName: body.source?.trim() === "紹介" ? body.referrerName?.trim() || "" : "",
      notes: body.notes?.trim() || "",
    },
  });
  return NextResponse.json(serializeClient(created), { status: 201 });
}
