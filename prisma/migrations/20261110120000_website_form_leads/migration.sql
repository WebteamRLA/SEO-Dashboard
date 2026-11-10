-- Website-form leads (Fluent Forms webhook). All columns are nullable: sheet leads leave them empty.
ALTER TABLE "lead" ADD COLUMN "phone" TEXT,
ADD COLUMN "form_name" TEXT,
ADD COLUMN "page_url" TEXT,
ADD COLUMN "landing_page" TEXT,
ADD COLUMN "referrer" TEXT,
ADD COLUMN "utm_source" TEXT,
ADD COLUMN "utm_medium" TEXT,
ADD COLUMN "utm_campaign" TEXT,
ADD COLUMN "form_entry_key" TEXT,
ADD COLUMN "form_payload" JSONB;

-- CreateIndex
CREATE UNIQUE INDEX "lead_form_entry_key_key" ON "lead"("form_entry_key");
