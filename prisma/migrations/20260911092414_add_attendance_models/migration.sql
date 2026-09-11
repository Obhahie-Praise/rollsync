-- CreateEnum
CREATE TYPE "ArrivalStatus" AS ENUM ('EARLY', 'ON_TIME', 'LATE', 'VERY_LATE');

-- CreateEnum
CREATE TYPE "SessionStatus" AS ENUM ('ACTIVE', 'COMPLETED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "AttendanceStatus" AS ENUM ('PRESENT', 'ABSENT', 'LATE', 'EXCUSED');

-- CreateTable
CREATE TABLE "attendance_session" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "timetableEntryId" TEXT NOT NULL,
    "teacherPersonId" TEXT NOT NULL,
    "classId" TEXT NOT NULL,
    "subjectId" TEXT NOT NULL,
    "sessionDate" TIMESTAMP(3) NOT NULL,
    "checkinAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "arrivalStatus" "ArrivalStatus" NOT NULL,
    "status" "SessionStatus" NOT NULL DEFAULT 'ACTIVE',
    "roomId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "attendance_session_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "attendance_record" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "attendanceSessionId" TEXT NOT NULL,
    "personId" TEXT NOT NULL,
    "status" "AttendanceStatus" NOT NULL,
    "note" TEXT,
    "recordedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "attendance_record_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "attendance_session_organizationId_idx" ON "attendance_session"("organizationId");

-- CreateIndex
CREATE INDEX "attendance_session_teacherPersonId_idx" ON "attendance_session"("teacherPersonId");

-- CreateIndex
CREATE INDEX "attendance_session_classId_idx" ON "attendance_session"("classId");

-- CreateIndex
CREATE UNIQUE INDEX "attendance_session_timetableEntryId_sessionDate_key" ON "attendance_session"("timetableEntryId", "sessionDate");

-- CreateIndex
CREATE INDEX "attendance_record_organizationId_idx" ON "attendance_record"("organizationId");

-- CreateIndex
CREATE INDEX "attendance_record_attendanceSessionId_idx" ON "attendance_record"("attendanceSessionId");

-- CreateIndex
CREATE INDEX "attendance_record_personId_idx" ON "attendance_record"("personId");

-- CreateIndex
CREATE UNIQUE INDEX "attendance_record_attendanceSessionId_personId_key" ON "attendance_record"("attendanceSessionId", "personId");

-- AddForeignKey
ALTER TABLE "attendance_session" ADD CONSTRAINT "attendance_session_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "attendance_session" ADD CONSTRAINT "attendance_session_timetableEntryId_fkey" FOREIGN KEY ("timetableEntryId") REFERENCES "timetable_entry"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "attendance_session" ADD CONSTRAINT "attendance_session_teacherPersonId_fkey" FOREIGN KEY ("teacherPersonId") REFERENCES "person"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "attendance_session" ADD CONSTRAINT "attendance_session_classId_fkey" FOREIGN KEY ("classId") REFERENCES "class"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "attendance_session" ADD CONSTRAINT "attendance_session_subjectId_fkey" FOREIGN KEY ("subjectId") REFERENCES "subject"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "attendance_record" ADD CONSTRAINT "attendance_record_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "attendance_record" ADD CONSTRAINT "attendance_record_attendanceSessionId_fkey" FOREIGN KEY ("attendanceSessionId") REFERENCES "attendance_session"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "attendance_record" ADD CONSTRAINT "attendance_record_personId_fkey" FOREIGN KEY ("personId") REFERENCES "person"("id") ON DELETE CASCADE ON UPDATE CASCADE;
