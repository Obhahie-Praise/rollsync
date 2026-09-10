-- CreateEnum
CREATE TYPE "PersonType" AS ENUM ('STUDENT', 'TEACHER', 'STAFF', 'ADMINISTRATOR', 'DIRECTOR');

-- CreateEnum
CREATE TYPE "PersonStatus" AS ENUM ('ACTIVE', 'INACTIVE');

-- CreateTable
CREATE TABLE "person" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT,
    "phone" TEXT,
    "orgIdentifier" TEXT,
    "personType" "PersonType" NOT NULL,
    "status" "PersonStatus" NOT NULL DEFAULT 'ACTIVE',
    "linkedUserId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "person_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "person_organizationId_idx" ON "person"("organizationId");

-- CreateIndex
CREATE INDEX "person_linkedUserId_idx" ON "person"("linkedUserId");

-- CreateIndex
CREATE UNIQUE INDEX "person_organizationId_orgIdentifier_key" ON "person"("organizationId", "orgIdentifier");

-- AddForeignKey
ALTER TABLE "person" ADD CONSTRAINT "person_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "person" ADD CONSTRAINT "person_linkedUserId_fkey" FOREIGN KEY ("linkedUserId") REFERENCES "user"("id") ON DELETE SET NULL ON UPDATE CASCADE;
