-- AlterTable
ALTER TABLE "lead" ADD COLUMN     "assignee_id" TEXT,
ADD COLUMN     "deal_value" DECIMAL(12,2),
ADD COLUMN     "edited_at" TIMESTAMP(3),
ADD COLUMN     "spam_filtered_by" TEXT;

-- CreateTable
CREATE TABLE "lead_note" (
    "id" TEXT NOT NULL,
    "lead_id" TEXT NOT NULL,
    "author_id" TEXT,
    "author_name" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "lead_note_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "lead_event" (
    "id" TEXT NOT NULL,
    "lead_id" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "actor_id" TEXT,
    "actor_name" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "lead_event_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "notification_preference" (
    "user_id" TEXT NOT NULL,
    "event_id" TEXT NOT NULL,
    "email" BOOLEAN NOT NULL,
    "in_app" BOOLEAN NOT NULL,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "notification_preference_pkey" PRIMARY KEY ("user_id","event_id")
);

-- CreateIndex
CREATE INDEX "lead_note_lead_id_created_at_idx" ON "lead_note"("lead_id", "created_at");

-- CreateIndex
CREATE INDEX "lead_event_lead_id_created_at_idx" ON "lead_event"("lead_id", "created_at");

-- AddForeignKey
ALTER TABLE "lead" ADD CONSTRAINT "lead_assignee_id_fkey" FOREIGN KEY ("assignee_id") REFERENCES "user"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "lead_note" ADD CONSTRAINT "lead_note_lead_id_fkey" FOREIGN KEY ("lead_id") REFERENCES "lead"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "lead_note" ADD CONSTRAINT "lead_note_author_id_fkey" FOREIGN KEY ("author_id") REFERENCES "user"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "lead_event" ADD CONSTRAINT "lead_event_lead_id_fkey" FOREIGN KEY ("lead_id") REFERENCES "lead"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "lead_event" ADD CONSTRAINT "lead_event_actor_id_fkey" FOREIGN KEY ("actor_id") REFERENCES "user"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "notification_preference" ADD CONSTRAINT "notification_preference_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;

