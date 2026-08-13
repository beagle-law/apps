import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";
import { caseInclude, serializeCase } from "@/lib/case-query";
import { getAccessibleCaseOrNull } from "@/lib/case-access";

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "認証が必要です" }, { status: 401 });

  const { id } = await params;
  const existing = await getAccessibleCaseOrNull(id, user.id);
  if (!existing) return NextResponse.json({ error: "案件が見つかりません" }, { status: 404 });

  const body = (await req.json()) as {
    date?: string;
    amount?: number;
    category?: string;
    origin?: string;
    destination?: string;
    route?: string;
    notes?: string;
  };
  if (!body.date || !body.category?.trim() || !body.amount) {
    return NextResponse.json({ error: "日付・内訳・金額は必須です" }, { status: 400 });
  }

  const updated = await prisma.case.update({
    where: { id },
    data: {
      expenses: {
        create: [
          {
            date: body.date,
            amount: Math.round(Number(body.amount)),
            category: body.category.trim(),
            origin: body.origin?.trim() || "",
            destination: body.destination?.trim() || "",
            route: body.route?.trim() || "",
            notes: body.notes?.trim() || "",
          },
        ],
      },
    },
    include: caseInclude,
  });
  return NextResponse.json(serializeCase(updated));
}
