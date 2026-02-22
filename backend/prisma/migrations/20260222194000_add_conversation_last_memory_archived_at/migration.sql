-- Add last memory archive timestamp to conversation
ALTER TABLE "Conversation"
ADD COLUMN "last_memory_archived_at" TIMESTAMP(3);
