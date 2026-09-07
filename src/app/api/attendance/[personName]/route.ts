import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";
import { PERSONAL_TASK_TABS } from "@/lib/constants";

function serialize(r: {
  id: string;
  personName: string;
  date: string;
  clockIn: string;
  clockOut: string;
  breakStart: string;
  breakEnd: string;
  createdAt: Date;
  updatedAt: Date;
}) {
  return { ...r, createdAt: r.createdAt.toISOString(), updatedAt: r.updatedAt.toISOString() };
}

// 勤怠（v14）：出勤・退勤・休憩の時刻を記録する。月次でExcel出力し給与明細作成に使うため、
// 閲覧は本人以外（管理者が集計する場合等）も可能。記録（POST）はなりすまし防止のため本人名義に固定する。
export async function GET(req: NextRequest, { params }: { params: Promise<{ personName: string }> }) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "認証が必要です" }, { status: 401 });

  const { personName } = await params;
  const decoded = decodeURIComponent(personName);
  if (!PERSONAL_TASK_TABS.includes(decoded)) {
    return NextResponse.json({ error: "対象者ではありません" }, { status: 400 });
  }

  const month = req.nextUrl.searchParams.get("month"); // YYYY-MM
  const records = await prisma.attendanceRecord.findMany({
    where: { personName: decoded, ...(month ? { date: { startsWith: month } } : {}) },
    orderBy: { date: "asc" },
  });
  return NextResponse.json(records.map(serialize));
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ personName: string }> }) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "認証が必要です" }, { status: 401 });

  const { personName } = await params;
  const decoded = decodeURIComponent(personName);
  if (decoded !== user.displayName) {
    return NextResponse.json({ error: "自分の勤怠のみ記録できます" }, { status: 403 });
  }

  const body = (await req.json()) as { date?: string; clockIn?: string; clockOut?: string; breakStart?: string; breakEnd?: string };
  if (!body.date) {
    return NextResponse.json({ error: "日付は必須です" }, { status: 400 });
  }

  const data = {
    clockIn: body.clockIn?.trim() || "",
    clockOut: body.clockOut?.trim() || "",
    breakStart: body.breakStart?.trim() || "",
    breakEnd: body.breakEnd?.trim() || "",
  };

  const record = await prisma.attendanceRecord.upsert({
    where: { personName_date: { personName: decoded, date: body.date } },
    create: { personName: decoded, date: body.date, ...data },
    update: data,
  });
  return NextResponse.json(serialize(record));
}
