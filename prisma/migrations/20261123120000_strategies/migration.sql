
-- CreateTable
CREATE TABLE "strategy" (
    "id" TEXT NOT NULL,
    "source_key" TEXT NOT NULL,
    "sort_order" INTEGER NOT NULL,
    "priority" TEXT NOT NULL,
    "goal_type" TEXT NOT NULL,
    "initiative" TEXT NOT NULL,
    "action" TEXT,
    "start_date" DATE,
    "end_date" DATE,
    "next_review" DATE,
    "duration" TEXT,
    "kpi_target" TEXT,
    "kpi_current" TEXT,
    "owner" TEXT,
    "work_progress" INTEGER,
    "status" TEXT NOT NULL,
    "work_completed" TEXT,
    "evidence_url" TEXT,
    "next_steps" TEXT,
    "outcome" TEXT,
    "expected_impact" TEXT,
    "time_to_impact" TEXT,
    "task_url" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "strategy_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "strategy_source_key_key" ON "strategy"("source_key");

