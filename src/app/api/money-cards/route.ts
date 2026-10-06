import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";

const YM = /^\d{4}-\d{2}$/;

function serialize(c: { id: string; yearMonth: string; kind: string; title: string; amount: number | null; note: string; createdAt: Date }) {
  return { ...c, createdAt: c.createdAt.toISOString() };
}

// v21：経費入力ボードの「お金に関する情報」カード（案件に紐づかない予定請求・支出メモ）。
export async function GET(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "認証が必要です" }, { status: 401 });

  const month = req.nextUrl.searchParams.get("month");
  if (!month || !YM.test(month)) return NextResponse.json({ error: "monthはYYYY-MM形式で指定してください" }, { status: 400 });

  const cards = await prisma.moneyCard.findMany({ where: { yearMonth: month }, orderBy: { createdAt: "asc" } });
  return NextResponse.json(cards.map(serialize));
}

export async function POST(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "認証が必要です" }, { status: 401 });

  const body = (await req.json()) as { yearMonth?: string; kind?: string; title?: string; amount?: number | null; note?: string };
  if (!body.yearMonth || !YM.test(body.yearMonth) || !body.title?.trim()) {
    return NextResponse.json({ error: "年月とタイトルは必須です" }, { status: 400 });
  }
  const amount = body.amount === null || body.amount === undefined || Number.isNaN(Number(body.amount)) ? null : Math.round(Number(body.amount));

  const created = await prisma.moneyCard.create({
    data: {
      yearMonth: body.yearMonth,
      kind: body.kind === "income" ? "income" : "expense",
      title: body.title.trim(),
      amount,
      note: body.note?.trim() || "",
    },
  });
  return NextResponse.json(serialize(created), { status: 201 });
}
