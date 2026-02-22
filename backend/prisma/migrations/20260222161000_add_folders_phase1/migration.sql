-- CreateTable
CREATE TABLE "Folder" (
    "folder_id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "color" TEXT NOT NULL DEFAULT '#6366f1',
    "icon_type" TEXT NOT NULL DEFAULT 'random',
    "icon_url" TEXT,
    "icon_data" JSONB,
    "is_deleted" BOOLEAN NOT NULL DEFAULT false,
    "deleted_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Folder_pkey" PRIMARY KEY ("folder_id")
);

-- CreateIndex
CREATE INDEX "Folder_user_id_is_deleted_idx" ON "Folder"("user_id", "is_deleted");

-- CreateIndex
CREATE INDEX "Folder_deleted_at_idx" ON "Folder"("deleted_at");
