-- CreateTable
CREATE TABLE "site_health_run" (
    "id" TEXT NOT NULL,
    "kind" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'running',
    "error" TEXT,
    "result" JSONB,
    "started_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "finished_at" TIMESTAMP(3),

    CONSTRAINT "site_health_run_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "site_health_run_kind_started_at_idx" ON "site_health_run"("kind", "started_at");
