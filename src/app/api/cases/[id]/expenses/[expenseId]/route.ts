import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";
import { caseInclude, serializeCase } from "@/lib/case-query";
import { getAccessibleCaseOrNull } from "@/lib/case-access";

// 顧客詳細「実費履歴」の請求チェック（v12 3.2）／経費入力ボードの請求済みチェック（v24）の切り替え
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string; expenseId: string }> }
) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "認証が必要です" }, { status: 401 });

  const { id, expenseId } = await params;
  const existing = await getAccessibleCaseOrNull(id, user.id);
  if (!existing) return NextResponse.json({ error: "案件が見つかりません" }, { status: 404 });

  const body = (await req.json()) as { checkedForBilling?: boolean; billedManually?: boolean };
  if (body.checkedForBilling === undefined && body.billedManually === undefined) {
    return NextResponse.json({ error: "checkedForBillingまたはbilledManuallyは必須です" }, { status: 400 });
  }

  await prisma.expense.update({
    where: { id: expenseId, caseId: id },
    data: {
      ...(body.checkedForBilling !== undefined && { checkedForBilling: body.checkedForBilling }),
      // 請求済みにした経費は、請求書作成用の「請求チェック」からは外す
      ...(body.billedManually !== undefined && { billedManually: body.billedManually, ...(body.billedManually && { checkedForBilling: false }) }),
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
