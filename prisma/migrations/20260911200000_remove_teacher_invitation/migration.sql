-- Remove teacher_invitation table and InvitationStatus enum
-- The invitation/claim flow is replaced by "Add Member" direct account provisioning.

-- DropForeignKey
ALTER TABLE "teacher_invitation" DROP CONSTRAINT IF EXISTS "teacher_invitation_organizationId_fkey";
ALTER TABLE "teacher_invitation" DROP CONSTRAINT IF EXISTS "teacher_invitation_personId_fkey";

-- DropTable
DROP TABLE IF EXISTS "teacher_invitation";

-- DropEnum
DROP TYPE IF EXISTS "InvitationStatus";
