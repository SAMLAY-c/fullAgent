-- P0: add Folder linkage and archive counter to Conversation
ALTER TABLE "Conversation"
ADD COLUMN "folder_id" TEXT;

ALTER TABLE "Conversation"
ADD COLUMN "archived_count" INTEGER NOT NULL DEFAULT 0;

-- Optional integrity: a conversation may belong to one folder
ALTER TABLE "Conversation"
ADD CONSTRAINT "Conversation_folder_id_fkey"
FOREIGN KEY ("folder_id") REFERENCES "Folder"("folder_id")
ON DELETE SET NULL ON UPDATE CASCADE;

CREATE INDEX "Conversation_folder_id_idx" ON "Conversation"("folder_id");
CREATE INDEX "Conversation_user_id_folder_id_is_deleted_updated_at_idx"
ON "Conversation"("user_id", "folder_id", "is_deleted", "updated_at");
