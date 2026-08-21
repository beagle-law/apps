import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";
import { getAccessibleCaseOrNull } from "@/lib/case-access";

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
