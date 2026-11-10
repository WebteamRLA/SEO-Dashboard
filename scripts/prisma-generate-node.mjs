// Regenerates the Prisma client for the Node.js runtime. Vercel runs this
// before `next build` (see vercel.json); Cloudflare keeps the schema's
// `workerd` runtime.
//
// Why: the workerd client imports its query compiler as a `.wasm` module.
// Turbopack loads that through a loader with a dynamic path, so every route
// using Prisma traces almost all of node_modules: about 293 MB and 18,500 files
// per route. Vercel caps a function at 250 MB and Hobby at 12 functions, and
// routes that large cannot be grouped, so the deploy fails. The Node.js client
// embeds the compiler as base64 instead, which brings a route to about 9 MB.
// Workers cannot compile WebAssembly from bytes at runtime, so Cloudflare must
// keep the workerd client.
import { execFileSync } from "node:child_process";
import { readFileSync, rmSync, writeFileSync } from "node:fs";

const SOURCE = "prisma/schema.prisma";
// Same folder as the source, so the generator's relative `output` is unchanged.
const TEMP = "prisma/.schema.node.prisma";
const FROM = /runtime\s*=\s*"workerd"/;

const schema = readFileSync(SOURCE, "utf8");
if (!FROM.test(schema)) {
  console.error(`${SOURCE} no longer sets runtime = "workerd"; update ${import.meta.filename}.`);
  process.exit(1);
}

writeFileSync(TEMP, schema.replace(FROM, 'runtime = "nodejs"'));
try {
  execFileSync("npx", ["prisma", "generate", "--schema", TEMP], { stdio: "inherit" });
} finally {
  rmSync(TEMP, { force: true });
}
