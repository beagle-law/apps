import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";
import { attendanceInclude, serializeAttendance } from "@/lib/attendance-query";

// v17：退勤後に改めて作業した分など、通常の出退勤に収まらない稼働時間を
// 開始・終了時刻の組で複数件記録する。なりすまし防止のため本人名義のみ登録可能。
export async function POST(req: NextRequest, { params }: { params: Promise<{ personName: string }> }) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "認証が必要です" }, { status: 401 });

  const { personName } = await params;
  const decoded = decodeURIComponent(personName);
  if (decoded !== user.displayName) {
    return NextResponse.json({ error: "自分の勤怠のみ記録できます" }, { status: 403 });
  }

  const body = (await req.json()) as { date?: string; startTime?: string; endTime?: string };
  if (!body.date || !body.startTime?.trim() || !body.endTime?.trim()) {
    return NextResponse.json({ error: "日付・開始時刻・終了時刻は必須です" }, { status: 400 });
  }

  const attendance = await prisma.attendanceRecord.upsert({
    where: { personName_date: { personName: decoded, date: body.date } },
    create: { personName: decoded, date: body.date },
    update: {},
  });

  await prisma.attendanceExtraSegment.create({
    data: { attendanceId: attendance.id, startTime: body.startTime.trim(), endTime: body.endTime.trim() },
  });

  const updated = await prisma.attendanceRecord.findUnique({ where: { id: attendance.id }, include: attendanceInclude });
  return NextResponse.json(serializeAttendance(updated!));
}
