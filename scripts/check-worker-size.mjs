// Fails CI if the Worker approaches Cloudflare's 64 MiB limit, so a dependency
// that bloats the bundle is caught here rather than at deploy time.
import { execFileSync } from "node:child_process";

const LIMIT_MIB = 64;
const BUDGET_MIB = 40;

const output = execFileSync("npx", ["wrangler", "deploy", "--dry-run"], { encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] });
const match = output.match(/Total Upload:\s*([\d.]+)\s*(KiB|MiB)/);
if (!match) throw new Error("Could not read the Worker size from wrangler's output.");

const size = Number(match[1]) / (match[2] === "KiB" ? 1024 : 1);
console.log(`Worker size: ${size.toFixed(1)} MiB (budget ${BUDGET_MIB} MiB, limit ${LIMIT_MIB} MiB)`);
if (size > BUDGET_MIB) process.exit(1);
