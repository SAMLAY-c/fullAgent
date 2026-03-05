-- Phase 1 foundation: message edit/version chain + soft delete
-- Includes reserved fields for later phases to avoid repeated table rewrites.

ALTER TABLE "Message"
ADD COLUMN "parent_id" TEXT,
ADD COLUMN "version" INTEGER NOT NULL DEFAULT 1,
ADD COLUMN "edited_at" TIMESTAMP(3),
ADD COLUMN "is_deleted" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN "feedback" TEXT,
ADD COLUMN "feedback_reason" TEXT,
ADD COLUMN "reference_id" TEXT,
ADD COLUMN "checkpoint_id" TEXT;

ALTER TABLE "Message"
ADD CONSTRAINT "Message_parent_id_fkey"
FOREIGN KEY ("parent_id") REFERENCES "Message"("message_id")
ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "Message"
ADD CONSTRAINT "Message_reference_id_fkey"
FOREIGN KEY ("reference_id") REFERENCES "Message"("message_id")
ON DELETE SET NULL ON UPDATE CASCADE;

-- Backfill for safety (existing rows should already pick default in PostgreSQL)
UPDATE "Message" SET "version" = 1 WHERE "version" IS NULL;
UPDATE "Message" SET "is_deleted" = false WHERE "is_deleted" IS NULL;

CREATE INDEX "Message_parent_id_idx" ON "Message"("parent_id");
CREATE INDEX "Message_reference_id_idx" ON "Message"("reference_id");
CREATE INDEX "Message_checkpoint_id_idx" ON "Message"("checkpoint_id");
CREATE INDEX "Message_conversation_id_version_idx" ON "Message"("conversation_id", "version");
CREATE INDEX "Message_conversation_id_is_deleted_timestamp_idx" ON "Message"("conversation_id", "is_deleted", "timestamp");
