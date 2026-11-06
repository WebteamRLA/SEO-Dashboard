// The OpenNext adapter copies .env files into the Worker, so a secret in one
// would be deployed inside the code without any error. This fails the build
// if anything other than a public variable reaches the bundle.
import { existsSync } from "node:fs";
import { resolve } from "node:path";
import { pathToFileURL } from "node:url";
import { findLeakedKeys } from "./leaked-env-keys.mjs";

const file = resolve(".open-next/cloudflare/next-env.mjs");
if (!existsSync(file)) {
  console.error("Run the Cloudflare build first: .open-next/cloudflare/next-env.mjs was not found.");
  process.exit(1);
}

const env = await import(pathToFileURL(file).href);
const leaked = findLeakedKeys(env);

if (leaked.length > 0) {
  // Names only. Printing the values would put the secrets in the CI logs.
  console.error(`Secrets would be deployed in the Worker: ${leaked.join(", ")}`);
  console.error("Move them to .dev.vars locally and to Cloudflare secrets in production.");
  process.exit(1);
}
console.log("Worker secrets check passed: no private variables in the bundle.");
