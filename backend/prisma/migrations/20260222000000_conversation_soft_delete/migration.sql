-- Add soft delete fields to Conversation
ALTER TABLE "Conversation"
ADD COLUMN "is_deleted" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN "deleted_at" TIMESTAMP(3),
ADD COLUMN "delete_reason" TEXT;

-- Add indexes for filtering and cleanup
CREATE INDEX "Conversation_bot_id_is_deleted_updated_at_idx"
ON "Conversation"("bot_id", "is_deleted", "updated_at");

CREATE INDEX "Conversation_deleted_at_idx"
ON "Conversation"("deleted_at");
