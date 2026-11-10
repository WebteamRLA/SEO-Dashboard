"use client";

import { useState } from "react";
import { CheckCircle2, Circle, ListChecks } from "lucide-react";
import { EmptyState } from "@/components/data/empty-state";
import { MetricCard, MetricGrid } from "@/components/data/metric-card";
import { ProgressBar } from "@/components/data/progress-bar";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { computeRoadmapProgress } from "@/lib/domain/progress";
import { formatMonthSpan, monthsInRange, type DateRange } from "@/lib/date-range";
import { formatMonth } from "@/lib/format";
import type { MonthKey, RoadmapItemWithProgress } from "@/lib/types";
import {
  describeItemProgress,
  filterByStatus,
  groupByCategory,
  groupByMonth,
  type StatusFilter,
} from "./group";

const FILTERS: { value: StatusFilter; label: string }[] = [
  { value: "all", label: "All" },
  { value: "completed", label: "Completed" },
  { value: "pending", label: "Pending" },
];

function ItemRow({ item }: { item: RoadmapItemWithProgress }) {
  const done = item.status === "completed";
  const Icon = done ? CheckCircle2 : Circle;
  return (
    <li className="flex items-start justify-between gap-3 py-2">
      <div className="flex min-w-0 items-start gap-2">
        <Icon className={`mt-0.5 size-4 shrink-0 ${done ? "text-foreground" : "text-muted-foreground"}`} aria-hidden />
        <div className="min-w-0">
          <p className="text-sm font-medium">{item.title}</p>
          <p className="text-xs text-muted-foreground">{done ? "Completed" : "Pending"}</p>
        </div>
      </div>
      <p className="shrink-0 text-xs text-muted-foreground tabular-nums">{describeItemProgress(item.progress)}</p>
    </li>
  );
}

function CategoryGroups({ items }: { items: RoadmapItemWithProgress[] }) {
  return (
    <div className="flex flex-col gap-3">
      {groupByCategory(items).map((group) => (
        <div key={group.category}>
          <h4 className="text-xs font-medium text-muted-foreground">{group.category}</h4>
          <ul className="divide-y divide-border">
            {group.items.map((item) => (
              <ItemRow key={item.id} item={item} />
            ))}
          </ul>
        </div>
      ))}
    </div>
  );
}

export function RoadmapView({
  range,
  months,
  items,
}: {
  range: DateRange;
  months: MonthKey[];
  items: RoadmapItemWithProgress[];
}) {
  const [filter, setFilter] = useState<StatusFilter>("all");

  const yearly = computeRoadmapProgress(items);
  const periodMonths = monthsInRange(range);
  const periodItems = items.filter((item) => periodMonths.includes(item.month));
  const monthly = computeRoadmapProgress(periodItems);
  const periodLabel = formatMonthSpan(periodMonths);
  const selected = filterByStatus(periodItems, filter);
  const fullYear = groupByMonth(filterByStatus(items, filter), months);

  return (
    <>
      <MetricGrid>
        <MetricCard
          label="Yearly strategy progress"
          value={`${yearly.percent}%`}
          detail={`${yearly.completed} of ${yearly.total} items`}
          footer={<ProgressBar progress={yearly} label="Yearly strategy progress" />}
        />
        <MetricCard
          label={`Plan progress, ${periodLabel}`}
          value={`${monthly.percent}%`}
          detail={`${monthly.completed} of ${monthly.total} items`}
          footer={<ProgressBar progress={monthly} label="Monthly plan progress" />}
        />
        <MetricCard
          label="Completed items"
          value={String(yearly.completed)}
          detail="Across the year"
          icon={CheckCircle2}
        />
        <MetricCard
          label="Pending items"
          value={String(yearly.total - yearly.completed)}
          detail="Across the year"
          icon={Circle}
        />
      </MetricGrid>

      <p className="text-xs text-muted-foreground">
        Progress is derived from linked tasks in the Monthly Work Tracker. An item is complete when all of its tasks
        are complete, and shows Not started until tasks are linked.
      </p>

      <Tabs defaultValue="period" className="gap-3">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <TabsList>
            <TabsTrigger value="period">Selected period</TabsTrigger>
            <TabsTrigger value="year">Full year</TabsTrigger>
          </TabsList>
          <div role="group" aria-label="Filter by status" className="inline-flex gap-1">
            {FILTERS.map((option) => (
              <button
                key={option.value}
                type="button"
                aria-pressed={filter === option.value}
                onClick={() => setFilter(option.value)}
                className="h-8 rounded-md border border-border bg-card px-3 text-xs font-medium text-muted-foreground outline-none hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring aria-pressed:border-foreground/40 aria-pressed:text-foreground"
              >
                {option.label}
              </button>
            ))}
          </div>
        </div>

        <TabsContent value="period">
          <section className="rounded-lg border border-border bg-card p-4">
            <h2 className="mb-3 text-sm font-semibold">{periodLabel}</h2>
            {selected.length === 0 ? (
              <EmptyState
                icon={ListChecks}
                title="No roadmap items"
                description={filter === "all" ? `Nothing is planned for ${periodLabel}.` : "No items match this filter."}
              />
            ) : (
              <CategoryGroups items={selected} />
            )}
          </section>
        </TabsContent>

        <TabsContent value="year">
          <div className="flex flex-col gap-3">
            {fullYear.map((group) => {
              const progress = computeRoadmapProgress(items, group.month);
              return (
                <section key={group.month} className="rounded-lg border border-border bg-card p-4">
                  <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                    <h2 className="text-sm font-semibold">{formatMonth(group.month)}</h2>
                    <p className="text-xs text-muted-foreground tabular-nums">
                      {progress.total === 0
                        ? "No items planned"
                        : `${progress.completed} of ${progress.total} items complete (${progress.percent}%)`}
                    </p>
                  </div>
                  {progress.total > 0 ? (
                    <ProgressBar progress={progress} label={`${formatMonth(group.month)} progress`} className="mb-3" />
                  ) : null}
                  {group.items.length === 0 ? (
                    <p className="text-sm text-muted-foreground">
                      {progress.total === 0 ? "No items planned." : "No items match this filter."}
                    </p>
                  ) : (
                    <CategoryGroups items={group.items} />
                  )}
                </section>
              );
            })}
          </div>
        </TabsContent>
      </Tabs>
    </>
  );
}
