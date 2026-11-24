// Imports the RLA SEO strategy sheet into the `strategy` table.
//
//   npm run import:strategies -- <file.tsv|file.csv> [--dry-run]
//
// Copy the strategy rows from Google Sheets (with or without the header row),
// paste them into a .tsv file OUTSIDE this repository (it is public), and run
// this. Strategies are matched on priority + goal type + initiative + action:
// a re-import updates them in place, and strategies missing from the file are
// removed, so the sheet stays the source of truth until the Strategy Builder exists.
// Node strips the types from the imported .ts files at load time.
import { randomUUID } from "node:crypto";
import { readFileSync } from "node:fs";
import pg from "pg";
import { parseDelimited } from "../src/server/leads/sheet-rows.ts";
import { mapStrategyRows } from "../src/server/strategy/sheet.ts";

const args = process.argv.slice(2);
const file = args.find((arg) => !arg.startsWith("--"));
const dryRun = args.includes("--dry-run");

if (!file) {
  console.error("Usage: npm run import:strategies -- <file.tsv|file.csv> [--dry-run]");
  process.exit(1);
}

const text = readFileSync(file, "utf8");
const delimiter = file.toLowerCase().endsWith(".csv") ? "," : "\t";
const { strategies, skipped, warnings } = mapStrategyRows(parseDelimited(text, delimiter));

console.log(`Read ${strategies.length} strategies.`);
for (const s of strategies) {
  const action = s.action ? ` — ${s.action.split("\n")[0]}` : "";
  const goal = s.kpiTarget ? ` · goal ${s.kpiTarget}` : "";
  const now = s.kpiCurrent ? ` · now ${s.kpiCurrent}` : "";
  console.log(`  ${s.priority} / ${s.goalType} / ${s.initiative}${action} · ${s.status}${goal}${now}`);
}
for (const { rowNumber, message } of skipped) console.log(`  skipped row ${rowNumber}: ${message}`);
for (const { rowNumber, message } of warnings) console.log(`  row ${rowNumber}: ${message}`);

if (strategies.length === 0) {
  console.error("Nothing to import.");
  process.exit(1);
}
if (dryRun) {
  console.log("Dry run: nothing written.");
  process.exit(0);
}

try {
  process.loadEnvFile(".dev.vars");
} catch {
  // No file: rely on the environment.
}
const connectionString = process.env.DIRECT_DATABASE_URL || process.env.DATABASE_URL;
if (!connectionString) {
  console.error("Set DIRECT_DATABASE_URL or DATABASE_URL.");
  process.exit(1);
}

const COLUMNS = [
  ["sortOrder", "sort_order"],
  ["priority", "priority"],
  ["goalType", "goal_type"],
  ["initiative", "initiative"],
  ["action", "action"],
  ["startDate", "start_date"],
  ["endDate", "end_date"],
  ["nextReview", "next_review"],
  ["duration", "duration"],
  ["kpiTarget", "kpi_target"],
  ["kpiCurrent", "kpi_current"],
  ["owner", "owner"],
  ["workProgress", "work_progress"],
  ["status", "status"],
  ["workCompleted", "work_completed"],
  ["evidenceUrl", "evidence_url"],
  ["nextSteps", "next_steps"],
  ["outcome", "outcome"],
  ["expectedImpact", "expected_impact"],
  ["timeToImpact", "time_to_impact"],
  ["taskUrl", "task_url"],
];

const client = new pg.Client({ connectionString });
await client.connect();
try {
  await client.query("BEGIN");
  let created = 0;
  let updated = 0;
  for (const strategy of strategies) {
    const values = COLUMNS.map(([key]) => strategy[key]);
    const result = await client.query(
      `INSERT INTO strategy (id, source_key, ${COLUMNS.map(([, column]) => column).join(", ")}, updated_at)
       VALUES ($1, $2, ${COLUMNS.map((_, i) => `$${i + 3}`).join(", ")}, now())
       ON CONFLICT (source_key) DO UPDATE SET
         ${COLUMNS.map(([, column]) => `${column} = EXCLUDED.${column}`).join(", ")}, updated_at = now()
       RETURNING (xmax = 0) AS inserted`,
      [randomUUID(), strategy.sourceKey, ...values],
    );
    if (result.rows[0]?.inserted) created += 1;
    else updated += 1;
  }
  // The sheet is the source of truth: strategies no longer in it are dropped.
  const keys = strategies.map((strategy) => strategy.sourceKey);
  const removed = await client.query(
    "DELETE FROM strategy WHERE NOT (source_key = ANY($1)) RETURNING initiative",
    [keys],
  );
  await client.query("COMMIT");
  console.log(`Saved: ${created} new, ${updated} updated, ${removed.rowCount} removed.`);
  for (const row of removed.rows) console.log(`  removed: ${row.initiative}`);
} catch (error) {
  await client.query("ROLLBACK");
  console.error("Import failed, nothing changed:", error instanceof Error ? error.message : error);
  process.exitCode = 1;
} finally {
  await client.end();
}
