import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";
import { caseInclude, serializeCase } from "@/lib/case-query";
import { getAccessibleCaseOrNull } from "@/lib/case-access";

// v27：預り金の入金を登録する（経費とは別枠。金額はプラスの数字）。更新後の案件を返す。
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "認証が必要です" }, { status: 401 });

  const { id } = await params;
  const existing = await getAccessibleCaseOrNull(id, user.id);
  if (!existing) return NextResponse.json({ error: "案件が見つかりません" }, { status: 404 });

  const body = (await req.json()) as { date?: string; amount?: number; notes?: string };
  const amount = Math.round(Number(body.amount));
  if (!body.date || !Number.isFinite(amount) || amount <= 0) {
    return NextResponse.json({ error: "日付と金額（プラスの数字）は必須です" }, { status: 400 });
  }

  const updated = await prisma.case.update({
    where: { id },
    data: { deposits: { create: [{ date: body.date, amount, notes: body.notes?.trim() || "" }] } },
    include: caseInclude,
  });
  return NextResponse.json(serializeCase(updated));
}
