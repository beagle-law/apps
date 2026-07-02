import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { caseInclude, serializeCase } from "@/lib/case-query";

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const body = (await req.json()) as {
    date?: string;
    time?: string;
    purpose?: string;
    location?: string;
    url?: string;
    notes?: string;
  };

  if (!body.date || !body.purpose?.trim()) {
    return NextResponse.json({ error: "期日と用件は必須です" }, { status: 400 });
  }

  const updated = await prisma.case.update({
    where: { id },
    data: {
      hearings: {
        create: [
          {
            date: body.date,
            time: body.time?.trim() || "",
            purpose: body.purpose.trim(),
            location: body.location?.trim() || "",
            url: body.url?.trim() || "",
            notes: body.notes?.trim() || "",
          },
        ],
      },
    },
    include: caseInclude,
  });
  return NextResponse.json(serializeCase(updated));
}
