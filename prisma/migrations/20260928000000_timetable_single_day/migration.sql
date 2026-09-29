-- Migration: timetable_single_day
--
-- WHAT THIS DOES
-- --------------
-- The previous model stored multiple weekdays in one TimetableEntry row using
-- a comma-separated text column `daysOfWeek` (e.g. "1,3,5").
-- This forced Monday and Wednesday to always share the same startTime/endTime/
-- room/periodLabel, making independent per-day schedules impossible.
--
-- The new model stores exactly ONE weekday per TimetableEntry row in an integer
-- column `dayOfWeek` (0=Sun … 6=Sat, matching JavaScript's Date.getDay()).
-- A "Biology on Monday 08:00 and Wednesday 10:30" assignment becomes two rows.
--
-- DATA PRESERVATION
-- -----------------
-- For every existing row that has N days in `daysOfWeek`:
--   - The original row is updated: `daysOfWeek` is removed, `dayOfWeek` is set
--     to the FIRST day in the list (preserving the row's id so foreign-key
--     references in attendance_session and timetable_exception remain valid).
--   - N-1 new rows are inserted for the remaining days, each as an independent
--     clone with a new cuid-like id.  They inherit the same startTime/endTime/
--     room/periodLabel because at migration time all days had the same schedule
--     — the admin can edit each day independently after migration.
--
-- FOREIGN KEY SAFETY
-- ------------------
-- attendance_session.timetableEntryId → timetable_entry.id
-- timetable_exception.timetableEntryId → timetable_entry.id
-- Both reference timetable_entry by id. We keep the first-day row's id intact,
-- so ALL existing sessions/exceptions remain correctly linked to the first day.
-- New rows for additional days start with zero sessions/exceptions — correct,
-- since no attendance was ever recorded against a specific weekday independently.

-- Step 1: Add the new integer column, temporarily nullable for the transition.
ALTER TABLE "timetable_entry" ADD COLUMN "dayOfWeek" INTEGER;

-- Step 2: For every existing row, set dayOfWeek to the first value in
-- daysOfWeek.  The SPLIT_PART / TRIM approach works for any valid stored value.
UPDATE "timetable_entry"
SET "dayOfWeek" = CAST(TRIM(SPLIT_PART("daysOfWeek", ',', 1)) AS INTEGER);

-- Step 3: Expand multi-day rows into additional single-day rows.
-- For each day BEYOND the first in a row's daysOfWeek list, insert a new row
-- that is a clone of the original but with dayOfWeek set to that specific day.
-- We use a recursive unnest approach that works cleanly in PostgreSQL.
INSERT INTO "timetable_entry" (
  "id", "organizationId", "teacherPersonId", "classId", "subjectId",
  "roomId", "startTime", "endTime", "dayOfWeek",
  "effectiveFrom", "effectiveTo", "periodLabel", "status",
  "createdAt", "updatedAt"
)
SELECT
  -- Generate a new unique id: reuse the original id prefix + day index
  -- gen_random_uuid() is always available in PostgreSQL 13+
  gen_random_uuid()::text,
  e."organizationId",
  e."teacherPersonId",
  e."classId",
  e."subjectId",
  e."roomId",
  e."startTime",
  e."endTime",
  CAST(TRIM(day_str) AS INTEGER),
  e."effectiveFrom",
  e."effectiveTo",
  e."periodLabel",
  e."status",
  e."createdAt",
  e."updatedAt"
FROM "timetable_entry" e,
  LATERAL (
    SELECT TRIM(unnest(string_to_array(e."daysOfWeek", ','))) AS day_str
  ) AS days
WHERE
  -- Only the days AFTER the first (first day stays in the original row)
  CAST(TRIM(day_str) AS INTEGER) <> e."dayOfWeek"
  -- Guard: skip rows where daysOfWeek was empty / had only one value
  AND e."daysOfWeek" IS NOT NULL
  AND e."daysOfWeek" <> '';

-- Step 4: Make dayOfWeek NOT NULL now that every row has a value.
ALTER TABLE "timetable_entry" ALTER COLUMN "dayOfWeek" SET NOT NULL;

-- Step 5: Drop the old daysOfWeek column.
ALTER TABLE "timetable_entry" DROP COLUMN "daysOfWeek";

-- Step 6: Add index on dayOfWeek for efficient server-side filtering.
CREATE INDEX "timetable_entry_dayOfWeek_idx" ON "timetable_entry"("dayOfWeek");
