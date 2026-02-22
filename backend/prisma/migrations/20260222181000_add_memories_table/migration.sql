-- P1: conversation archive memories table (separate from existing "Memory" table)
CREATE TABLE "memories" (
    "id" TEXT NOT NULL,
    "folder_id" TEXT NOT NULL,
    "conversation_id" TEXT NOT NULL,
    "title" TEXT,
    "summary" TEXT,
    "insight" TEXT,
    "tags" JSONB,
    "archive_index" INTEGER NOT NULL DEFAULT 1,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "memories_pkey" PRIMARY KEY ("id")
);

ALTER TABLE "memories"
ADD CONSTRAINT "memories_folder_id_fkey"
FOREIGN KEY ("folder_id") REFERENCES "Folder"("folder_id")
ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "memories"
ADD CONSTRAINT "memories_conversation_id_fkey"
FOREIGN KEY ("conversation_id") REFERENCES "Conversation"("conversation_id")
ON DELETE CASCADE ON UPDATE CASCADE;

CREATE INDEX "memories_folder_id_created_at_idx" ON "memories"("folder_id", "created_at");
CREATE INDEX "memories_conversation_id_idx" ON "memories"("conversation_id");
