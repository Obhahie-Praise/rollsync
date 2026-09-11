-- AddColumn: human-facing public organization identifier
ALTER TABLE "organization" ADD COLUMN "publicId" TEXT;

-- CreateUniqueIndex
CREATE UNIQUE INDEX "organization_publicId_key" ON "organization"("publicId");
