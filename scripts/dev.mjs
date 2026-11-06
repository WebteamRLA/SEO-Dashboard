// Starts `next dev` with secrets from .dev.vars. They must not live in .env
// files, which the OpenNext adapter copies into the Worker.
import { spawn } from "node:child_process";

try {
  process.loadEnvFile(".dev.vars");
} catch {
  console.warn("No .dev.vars found. Copy .dev.vars.example to connect to a database.");
}

const next = spawn(process.execPath, ["node_modules/next/dist/bin/next", "dev", ...process.argv.slice(2)], {
  stdio: "inherit",
});
for (const signal of ["SIGINT", "SIGTERM"]) process.on(signal, () => next.kill(signal));
next.on("exit", (code) => process.exit(code ?? 0));
