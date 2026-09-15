-- CreateTable
CREATE TABLE "AttendanceExtraSegment" (
    "id" TEXT NOT NULL,
    "attendanceId" TEXT NOT NULL,
    "startTime" TEXT NOT NULL,
    "endTime" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AttendanceExtraSegment_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "AttendanceExtraSegment_attendanceId_idx" ON "AttendanceExtraSegment"("attendanceId");

-- AddForeignKey
ALTER TABLE "AttendanceExtraSegment" ADD CONSTRAINT "AttendanceExtraSegment_attendanceId_fkey" FOREIGN KEY ("attendanceId") REFERENCES "AttendanceRecord"("id") ON DELETE CASCADE ON UPDATE CASCADE;
