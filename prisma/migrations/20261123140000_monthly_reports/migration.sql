-- CreateTable
CREATE TABLE "monthly_report" (
    "month" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'draft',
    "highlights" TEXT,
    "missed" TEXT,
    "next_month" TEXT,
    "snapshot" JSONB,
    "finalized_at" TIMESTAMP(3),
    "finalized_by_id" TEXT,
    "updated_by_id" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "monthly_report_pkey" PRIMARY KEY ("month")
);

