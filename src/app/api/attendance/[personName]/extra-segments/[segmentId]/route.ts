import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";
import { attendanceInclude, serializeAttendance } from "@/lib/attendance-query";

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ personName: string; segmentId: string }> }) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "認証が必要です" }, { status: 401 });

  const { personName, segmentId } = await params;
  const decoded = decodeURIComponent(personName);
  if (decoded !== user.displayName) {
    return NextResponse.json({ error: "自分の勤怠のみ削除できます" }, { status: 403 });
  }

  const segment = await prisma.attendanceExtraSegment.findUnique({ where: { id: segmentId }, include: { attendance: true } });
  if (!segment || segment.attendance.personName !== decoded) {
    return NextResponse.json({ error: "対象が見つかりません" }, { status: 404 });
  }

  await prisma.attendanceExtraSegment.delete({ where: { id: segmentId } });

  const updated = await prisma.attendanceRecord.findUnique({ where: { id: segment.attendanceId }, include: attendanceInclude });
  return NextResponse.json(serializeAttendance(updated!));
}
