-- AlterTable: add breakMinutes, backfill from existing breakStart/breakEnd, then drop old columns.
ALTER TABLE "AttendanceRecord" ADD COLUMN "breakMinutes" INTEGER NOT NULL DEFAULT 0;

UPDATE "AttendanceRecord"
SET "breakMinutes" = GREATEST(
  0,
  (split_part("breakEnd", ':', 1)::int * 60 + split_part("breakEnd", ':', 2)::int)
  - (split_part("breakStart", ':', 1)::int * 60 + split_part("breakStart", ':', 2)::int)
)
WHERE "breakStart" ~ '^[0-9]{1,2}:[0-9]{2}$' AND "breakEnd" ~ '^[0-9]{1,2}:[0-9]{2}$';

ALTER TABLE "AttendanceRecord" DROP COLUMN "breakEnd",
DROP COLUMN "breakStart";
