import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";
import { caseInclude, serializeCase } from "@/lib/case-query";
import { getAccessibleCaseOrNull } from "@/lib/case-access";

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string; depositId: string }> }
) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "認証が必要です" }, { status: 401 });

  const { id, depositId } = await params;
  const existing = await getAccessibleCaseOrNull(id, user.id);
  if (!existing) return NextResponse.json({ error: "案件が見つかりません" }, { status: 404 });

  await prisma.deposit.delete({ where: { id: depositId, caseId: id } });
  const c = await prisma.case.findUnique({ where: { id }, include: caseInclude });
  return NextResponse.json(serializeCase(c!));
}

// v28：預り金の入金を編集する（日付・金額（プラス）・メモ）。更新後の案件を返す。
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string; depositId: string }> }
) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "認証が必要です" }, { status: 401 });

  const { id, depositId } = await params;
  const existing = await getAccessibleCaseOrNull(id, user.id);
  if (!existing) return NextResponse.json({ error: "案件が見つかりません" }, { status: 404 });

  const body = (await req.json()) as { date?: string; amount?: number; notes?: string };
  const data: { date?: string; amount?: number; notes?: string } = {};
  if (body.date !== undefined) {
    if (!body.date) return NextResponse.json({ error: "日付は必須です" }, { status: 400 });
    data.date = body.date;
  }
  if (body.amount !== undefined) {
    const amount = Math.round(Number(body.amount));
    if (!Number.isFinite(amount) || amount <= 0) {
      return NextResponse.json({ error: "金額はプラスの数字で入力してください" }, { status: 400 });
    }
    data.amount = amount;
  }
  if (body.notes !== undefined) data.notes = body.notes.trim();

  const target = await prisma.deposit.findFirst({ where: { id: depositId, caseId: id } });
  if (!target) return NextResponse.json({ error: "預り金の入金が見つかりません" }, { status: 404 });

  await prisma.deposit.update({ where: { id: depositId }, data });
  const c = await prisma.case.findUnique({ where: { id }, include: caseInclude });
  return NextResponse.json(serializeCase(c!));
}
