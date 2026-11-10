// Imports Courtney's leads Google Sheet into the `lead` table.
//
//   node scripts/import-leads.mjs <file> [--timezone=America/New_York] [--dry-run]
//
// <file> is either a CSV download (File > Download > Comma-separated values) or
// a .tsv/.txt holding the rows copied straight out of the sheet.
//
// Safe to run again: each sheet row has a stable key, so a re-import updates the
// leads it created instead of adding duplicates. Only sheet-owned fields are
// written. Leads that have left the sheet are reported, never deleted.
//
// The sheet holds real people's details and this repository is public: keep the
// export outside the repository, and this script prints row numbers, not names.

import { randomUUID } from "node:crypto";
import { readFileSync } from "node:fs";
import pg from "pg";
// Node strips the types from this file at load time; it has no runtime imports.
import { mapSheetRows, parseDelimited } from "../src/server/leads/sheet-rows.ts";

const args = process.argv.slice(2);
const file = args.find((arg) => !arg.startsWith("--"));
const dryRun = args.includes("--dry-run");
const timeZone = args.find((arg) => arg.startsWith("--timezone="))?.slice("--timezone=".length) ?? "America/New_York";

if (!file) {
  console.error("Usage: node scripts/import-leads.mjs <file.csv|file.tsv> [--timezone=Area/City] [--dry-run]");
  process.exit(1);
}
try {
  new Intl.DateTimeFormat("en-US", { timeZone });
} catch {
  console.error(`Unknown time zone "${timeZone}".`);
  process.exit(1);
}

const text = readFileSync(file, "utf8");
const delimiter = file.toLowerCase().endsWith(".csv") ? "," : "\t";
const { leads, skipped, warnings } = mapSheetRows(parseDelimited(text, delimiter), { timeZone });

console.log(`Read ${leads.length} leads (dates in ${timeZone}).`);
for (const { rowNumber, message } of skipped) console.log(`  skipped row ${rowNumber}: ${message}`);
for (const { rowNumber, message } of warnings) console.log(`  row ${rowNumber}: ${message}`);

const byStage = Object.groupBy(leads, (lead) => lead.stage);
console.log(`Stages: ${Object.entries(byStage).map(([stage, list]) => `${stage} ${list.length}`).join(", ")}`);

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

const client = new pg.Client({ connectionString });
await client.connect();

// Timestamps are passed as UTC ISO strings: the columns are `timestamp without
// time zone` holding UTC, which is how Prisma reads them.
const NOW = "(now() at time zone 'utc')";
let inserted = 0;
let updated = 0;

try {
  await client.query("begin");
  for (const lead of leads) {
    const { rows } = await client.query(
      `insert into lead (id, origin, submitted_at, name, email, company, heard_from, services, channel, stage,
                         pipeline_note, won_on, sheet_row_key, sheet_row, sheet_synced_at, updated_at)
       values ($1, 'sheet', $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, ${NOW}, ${NOW})
       on conflict (sheet_row_key) do update set
         submitted_at = excluded.submitted_at, name = excluded.name, email = excluded.email,
         company = excluded.company, heard_from = excluded.heard_from, services = excluded.services,
         channel = excluded.channel, stage = excluded.stage, pipeline_note = excluded.pipeline_note,
         won_on = excluded.won_on, sheet_row = excluded.sheet_row,
         sheet_synced_at = excluded.sheet_synced_at, updated_at = excluded.updated_at
       returning id, (xmax = 0) as inserted`,
      [
        randomUUID(),
        lead.submittedAt,
        lead.name,
        lead.email,
        lead.company,
        lead.heardFrom,
        lead.services,
        lead.channel,
        lead.stage,
        lead.pipelineNote,
        lead.wonOn,
        lead.rowKey,
        JSON.stringify(lead.raw),
      ],
    );
    const { id, inserted: isNew } = rows[0];
    if (isNew) inserted++;
    else updated++;

    // Payments mirror the sheet's revenue cells exactly.
    await client.query("delete from lead_payment where lead_id = $1", [id]);
    for (const payment of lead.payments) {
      await client.query(
        `insert into lead_payment (id, lead_id, sequence, amount, commission, updated_at)
         values ($1, $2, $3, $4, $5, ${NOW})`,
        [randomUUID(), id, payment.sequence, payment.amount, payment.commission],
      );
    }
  }

  const { rows } = await client.query(
    "select count(*)::int as count from lead where origin = 'sheet' and not (sheet_row_key = any($1))",
    [leads.map((lead) => lead.rowKey)],
  );
  await client.query("commit");

  console.log(`Imported: ${inserted} new, ${updated} updated.`);
  if (rows[0].count > 0) {
    console.log(`${rows[0].count} leads from an earlier import are no longer in the sheet; left unchanged.`);
  }
} catch (error) {
  await client.query("rollback");
  console.error("Import failed; nothing was written.");
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
} finally {
  await client.end();
}
