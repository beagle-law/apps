import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";
import { getAccessibleCaseOrNull, caseVisibilityFilter } from "@/lib/case-access";

// v21：経費入力ボード用。指定月（YYYY-MM）の全案件のタイムチャージを返す（閲覧可能な案件のみ）。
export async function GET(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "認証が必要です" }, { status: 401 });

  const month = req.nextUrl.searchParams.get("month");
  if (!month || !/^\d{4}-\d{2}$/.test(month)) {
    return NextResponse.json({ error: "monthはYYYY-MM形式で指定してください" }, { status: 400 });
  }

  const rows = await prisma.timeCharge.findMany({
    where: { date: { startsWith: month }, case: caseVisibilityFilter(user.id) },
    orderBy: [{ date: "asc" }, { startTime: "asc" }],
  });
  return NextResponse.json(rows.map((r) => ({ ...r, createdAt: r.createdAt.toISOString() })));
}

export async function POST(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "認証が必要です" }, { status: 401 });

  const body = (await req.json()) as {
    date?: string;
    caseId?: string;
    startTime?: string;
    endTime?: string;
    hours?: number;
    content?: string;
  };
  if (!body.date || !body.caseId || !body.hours) {
    return NextResponse.json({ error: "日付・案件・時間は必須です" }, { status: 400 });
  }

  const targetCase = await getAccessibleCaseOrNull(body.caseId, user.id);
  if (!targetCase) return NextResponse.json({ error: "案件が見つかりません" }, { status: 404 });

  const created = await prisma.timeCharge.create({
    data: {
      personName: user.displayName, // 本人名義に固定（なりすまし防止）
      date: body.date,
      caseId: body.caseId,
      startTime: body.startTime?.trim() || "",
      endTime: body.endTime?.trim() || "",
      hours: Number(body.hours),
      content: body.content?.trim() || "",
    },
  });
  return NextResponse.json({ ...created, createdAt: created.createdAt.toISOString() }, { status: 201 });
}
