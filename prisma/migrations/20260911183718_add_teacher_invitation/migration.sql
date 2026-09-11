-- CreateEnum
CREATE TYPE "InvitationStatus" AS ENUM ('PENDING', 'ACCEPTED', 'REVOKED', 'EXPIRED');

-- CreateTable
CREATE TABLE "teacher_invitation" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "personId" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "status" "InvitationStatus" NOT NULL DEFAULT 'PENDING',
    "email" TEXT,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "acceptedByUserId" TEXT,
    "acceptedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "teacher_invitation_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "teacher_invitation_token_key" ON "teacher_invitation"("token");

-- CreateIndex
CREATE INDEX "teacher_invitation_organizationId_idx" ON "teacher_invitation"("organizationId");

-- CreateIndex
CREATE INDEX "teacher_invitation_personId_idx" ON "teacher_invitation"("personId");

-- CreateIndex
CREATE INDEX "teacher_invitation_token_idx" ON "teacher_invitation"("token");

-- AddForeignKey
ALTER TABLE "teacher_invitation" ADD CONSTRAINT "teacher_invitation_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "teacher_invitation" ADD CONSTRAINT "teacher_invitation_personId_fkey" FOREIGN KEY ("personId") REFERENCES "person"("id") ON DELETE CASCADE ON UPDATE CASCADE;
