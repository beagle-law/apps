import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";
import { caseInclude, serializeCase } from "@/lib/case-query";
import { getAccessibleCaseOrNull } from "@/lib/case-access";

// 顧客詳細「実費履歴」の請求チェック（v12 3.2）／経費入力ボードの請求済みチェック（v24）の切り替え、
// および実費の内容の訂正（v38：請求書にあげる前に、日付・内訳・金額・経路・備考を直せる）
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string; expenseId: string }> }
) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "認証が必要です" }, { status: 401 });

  const { id, expenseId } = await params;
  const existing = await getAccessibleCaseOrNull(id, user.id);
  if (!existing) return NextResponse.json({ error: "案件が見つかりません" }, { status: 404 });

  const body = (await req.json()) as {
    checkedForBilling?: boolean;
    billedManually?: boolean;
    date?: string;
    amount?: number;
    category?: string;
    origin?: string;
    destination?: string;
    route?: string;
    notes?: string;
  };
  const editing =
    body.date !== undefined || body.amount !== undefined || body.category !== undefined || body.origin !== undefined ||
    body.destination !== undefined || body.route !== undefined || body.notes !== undefined;
  if (body.checkedForBilling === undefined && body.billedManually === undefined && !editing) {
    return NextResponse.json({ error: "checkedForBilling・billedManually・訂正する項目のいずれかは必須です" }, { status: 400 });
  }

  if (editing) {
    const target = await prisma.expense.findFirst({ where: { id: expenseId, caseId: id } });
    if (!target) return NextResponse.json({ error: "実費が見つかりません" }, { status: 404 });
    if (target.billedInInvoiceId) return NextResponse.json({ error: "請求書に反映済みの実費は訂正できません" }, { status: 400 });
    if (body.date !== undefined && !body.date) return NextResponse.json({ error: "日付は必須です" }, { status: 400 });
    if (body.category !== undefined && !body.category.trim()) return NextResponse.json({ error: "内訳は必須です" }, { status: 400 });
    if (body.amount !== undefined && !Math.round(Number(body.amount))) return NextResponse.json({ error: "金額は必須です" }, { status: 400 });
  }

  await prisma.expense.update({
    where: { id: expenseId, caseId: id },
    data: {
      ...(body.checkedForBilling !== undefined && { checkedForBilling: body.checkedForBilling }),
      // 請求済みにした経費は、請求書作成用の「請求チェック」からは外す
      ...(body.billedManually !== undefined && { billedManually: body.billedManually, ...(body.billedManually && { checkedForBilling: false }) }),
      ...(body.date !== undefined && { date: body.date }),
      ...(body.amount !== undefined && { amount: Math.round(Number(body.amount)) }),
      ...(body.category !== undefined && { category: body.category.trim() }),
      ...(body.origin !== undefined && { origin: body.origin.trim() }),
      ...(body.destination !== undefined && { destination: body.destination.trim() }),
      ...(body.route !== undefined && { route: body.route.trim() }),
      ...(body.notes !== undefined && { notes: body.notes.trim() }),
    },
  });
  const c = await prisma.case.findUnique({ where: { id }, include: caseInclude });
  return NextResponse.json(serializeCase(c!));
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string; expenseId: string }> }
) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "認証が必要です" }, { status: 401 });

  const { id, expenseId } = await params;
  const existing = await getAccessibleCaseOrNull(id, user.id);
  if (!existing) return NextResponse.json({ error: "案件が見つかりません" }, { status: 404 });

  await prisma.expense.delete({ where: { id: expenseId, caseId: id } });
  const c = await prisma.case.findUnique({ where: { id }, include: caseInclude });
  return NextResponse.json(serializeCase(c!));
}
