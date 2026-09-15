import type { Prisma } from "@prisma/client";

export const attendanceInclude = {
  extraSegments: { orderBy: { createdAt: "asc" } },
} satisfies Prisma.AttendanceRecordInclude;

export type FullAttendanceRecord = Prisma.AttendanceRecordGetPayload<{ include: typeof attendanceInclude }>;

export function serializeAttendance(r: FullAttendanceRecord) {
  return {
    ...r,
    createdAt: r.createdAt.toISOString(),
    updatedAt: r.updatedAt.toISOString(),
    extraSegments: r.extraSegments.map((s) => ({ ...s, createdAt: s.createdAt.toISOString() })),
  };
}
