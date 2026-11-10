-- CreateTable
CREATE TABLE "lead" (
    "id" TEXT NOT NULL,
    "origin" TEXT NOT NULL,
    "submitted_at" TIMESTAMP(3),
    "name" TEXT,
    "email" TEXT,
    "company" TEXT,
    "heard_from" TEXT,
    "channel" TEXT NOT NULL DEFAULT 'Unknown',
    "budget" TEXT,
    "services" TEXT,
    "message" TEXT,
    "stage" TEXT NOT NULL DEFAULT 'new',
    "pipeline_note" TEXT,
    "won_on" DATE,
    "sheet_row_key" TEXT,
    "sheet_row" JSONB,
    "sheet_synced_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "lead_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "lead_payment" (
    "id" TEXT NOT NULL,
    "lead_id" TEXT NOT NULL,
    "sequence" INTEGER NOT NULL,
    "amount" DECIMAL(12,2) NOT NULL,
    "commission" DECIMAL(12,2),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "lead_payment_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "lead_sheet_row_key_key" ON "lead"("sheet_row_key");

-- CreateIndex
CREATE INDEX "lead_submitted_at_idx" ON "lead"("submitted_at");

-- CreateIndex
CREATE INDEX "lead_stage_idx" ON "lead"("stage");

-- CreateIndex
CREATE UNIQUE INDEX "lead_payment_lead_id_sequence_key" ON "lead_payment"("lead_id", "sequence");

-- AddForeignKey
ALTER TABLE "lead_payment" ADD CONSTRAINT "lead_payment_lead_id_fkey" FOREIGN KEY ("lead_id") REFERENCES "lead"("id") ON DELETE CASCADE ON UPDATE CASCADE;
