-- CreateEnum
CREATE TYPE "ClassStatus" AS ENUM ('ACTIVE', 'INACTIVE');

-- CreateEnum
CREATE TYPE "TimetableStatus" AS ENUM ('ACTIVE', 'INACTIVE');

-- CreateEnum
CREATE TYPE "ExceptionType" AS ENUM ('CANCELLED', 'RESCHEDULED', 'SUBSTITUTED', 'ROOM_CHANGE', 'OTHER');

-- CreateTable
CREATE TABLE "class" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "code" TEXT,
    "description" TEXT,
    "status" "ClassStatus" NOT NULL DEFAULT 'ACTIVE',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "class_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "class_membership" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "classId" TEXT NOT NULL,
    "personId" TEXT NOT NULL,
    "startDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "endDate" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "class_membership_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "subject" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "code" TEXT,
    "description" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "subject_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "room" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "code" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "room_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "timetable_entry" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "teacherPersonId" TEXT NOT NULL,
    "classId" TEXT NOT NULL,
    "subjectId" TEXT NOT NULL,
    "roomId" TEXT,
    "startTime" TEXT NOT NULL,
    "endTime" TEXT NOT NULL,
    "daysOfWeek" TEXT NOT NULL,
    "effectiveFrom" TIMESTAMP(3) NOT NULL,
    "effectiveTo" TIMESTAMP(3),
    "periodLabel" TEXT,
    "status" "TimetableStatus" NOT NULL DEFAULT 'ACTIVE',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "timetable_entry_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "timetable_exception" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "timetableEntryId" TEXT NOT NULL,
    "exceptionDate" TIMESTAMP(3) NOT NULL,
    "exceptionType" "ExceptionType" NOT NULL,
    "newDate" TIMESTAMP(3),
    "newStartTime" TEXT,
    "newEndTime" TEXT,
    "substitutePersonId" TEXT,
    "newRoomId" TEXT,
    "note" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "timetable_exception_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "class_organizationId_idx" ON "class"("organizationId");

-- CreateIndex
CREATE UNIQUE INDEX "class_organizationId_name_key" ON "class"("organizationId", "name");

-- CreateIndex
CREATE INDEX "class_membership_organizationId_idx" ON "class_membership"("organizationId");

-- CreateIndex
CREATE INDEX "class_membership_classId_idx" ON "class_membership"("classId");

-- CreateIndex
CREATE INDEX "class_membership_personId_idx" ON "class_membership"("personId");

-- CreateIndex
CREATE INDEX "subject_organizationId_idx" ON "subject"("organizationId");

-- CreateIndex
CREATE UNIQUE INDEX "subject_organizationId_name_key" ON "subject"("organizationId", "name");

-- CreateIndex
CREATE INDEX "room_organizationId_idx" ON "room"("organizationId");

-- CreateIndex
CREATE UNIQUE INDEX "room_organizationId_name_key" ON "room"("organizationId", "name");

-- CreateIndex
CREATE INDEX "timetable_entry_organizationId_idx" ON "timetable_entry"("organizationId");

-- CreateIndex
CREATE INDEX "timetable_entry_teacherPersonId_idx" ON "timetable_entry"("teacherPersonId");

-- CreateIndex
CREATE INDEX "timetable_entry_classId_idx" ON "timetable_entry"("classId");

-- CreateIndex
CREATE INDEX "timetable_entry_subjectId_idx" ON "timetable_entry"("subjectId");

-- CreateIndex
CREATE INDEX "timetable_exception_organizationId_idx" ON "timetable_exception"("organizationId");

-- CreateIndex
CREATE INDEX "timetable_exception_timetableEntryId_idx" ON "timetable_exception"("timetableEntryId");

-- CreateIndex
CREATE UNIQUE INDEX "timetable_exception_timetableEntryId_exceptionDate_key" ON "timetable_exception"("timetableEntryId", "exceptionDate");

-- AddForeignKey
ALTER TABLE "class" ADD CONSTRAINT "class_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "class_membership" ADD CONSTRAINT "class_membership_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "class_membership" ADD CONSTRAINT "class_membership_classId_fkey" FOREIGN KEY ("classId") REFERENCES "class"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "class_membership" ADD CONSTRAINT "class_membership_personId_fkey" FOREIGN KEY ("personId") REFERENCES "person"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "subject" ADD CONSTRAINT "subject_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "room" ADD CONSTRAINT "room_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "timetable_entry" ADD CONSTRAINT "timetable_entry_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "timetable_entry" ADD CONSTRAINT "timetable_entry_teacherPersonId_fkey" FOREIGN KEY ("teacherPersonId") REFERENCES "person"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "timetable_entry" ADD CONSTRAINT "timetable_entry_classId_fkey" FOREIGN KEY ("classId") REFERENCES "class"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "timetable_entry" ADD CONSTRAINT "timetable_entry_subjectId_fkey" FOREIGN KEY ("subjectId") REFERENCES "subject"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "timetable_entry" ADD CONSTRAINT "timetable_entry_roomId_fkey" FOREIGN KEY ("roomId") REFERENCES "room"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "timetable_exception" ADD CONSTRAINT "timetable_exception_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "timetable_exception" ADD CONSTRAINT "timetable_exception_timetableEntryId_fkey" FOREIGN KEY ("timetableEntryId") REFERENCES "timetable_entry"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "timetable_exception" ADD CONSTRAINT "timetable_exception_substitutePersonId_fkey" FOREIGN KEY ("substitutePersonId") REFERENCES "person"("id") ON DELETE SET NULL ON UPDATE CASCADE;
