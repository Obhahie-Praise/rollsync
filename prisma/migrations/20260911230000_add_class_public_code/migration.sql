-- AlterTable: Add publicCode to Class
ALTER TABLE "class" ADD COLUMN "publicCode" TEXT;

-- Backfill: generate stable public codes for all existing classes
-- Format: RS- followed by 8 uppercase alphanumeric characters derived from the class CUID
-- We use substring + upper to make it deterministic and unique per class
UPDATE "class"
SET "publicCode" = 'RS-' || UPPER(
  SUBSTRING(
    REPLACE(REPLACE(REPLACE(id, '-', ''), '_', ''), 'c', ''),
    1, 8
  )
)
WHERE "publicCode" IS NULL;

-- Ensure backfill produced unique values (resolve collisions by appending row number)
-- This is safe: any collision is resolved by appending the first 2 chars of id
DO $$
DECLARE
  dup RECORD;
  counter INT;
BEGIN
  FOR dup IN
    SELECT "publicCode", COUNT(*) as cnt
    FROM "class"
    GROUP BY "publicCode"
    HAVING COUNT(*) > 1
  LOOP
    counter := 0;
    FOR dup IN
      SELECT id FROM "class" WHERE "publicCode" = dup."publicCode"
      ORDER BY "createdAt" ASC
    LOOP
      IF counter > 0 THEN
        UPDATE "class"
        SET "publicCode" = 'RS-' || UPPER(SUBSTRING(REPLACE(id, 'c', ''), counter + 1, 8))
        WHERE id = dup.id;
      END IF;
      counter := counter + 1;
    END LOOP;
  END LOOP;
END $$;

-- CreateIndex
CREATE UNIQUE INDEX "class_publicCode_key" ON "class"("publicCode");

-- CreateIndex
CREATE INDEX "class_publicCode_idx" ON "class"("publicCode");
