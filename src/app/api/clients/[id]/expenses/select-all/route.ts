import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";
import { caseVisibilityFilter } from "@/lib/case-access";

// 実費履歴の「すべて選択」チェックボックス（v12 3.2）。未請求（billedInInvoiceIdなし）の実費のみが対象。
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "認証が必要です" }, { status: 401 });

  const { id } = await params;
  const body = (await req.json()) as { checked?: boolean };
  if (body.checked === undefined) {
    return NextResponse.json({ error: "checkedは必須です" }, { status: 400 });
  }

  await prisma.expense.updateMany({
    where: { case: { clientId: id, ...caseVisibilityFilter(user.id) }, billedInInvoiceId: null },
    data: { checkedForBilling: body.checked },
  });
  return NextResponse.json({ ok: true });
}
