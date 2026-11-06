// GitHub masks a secret only as a whole. `prisma migrate deploy` prints the host
// and database name on their own, and this repository's logs may be public.
const value = process.env.DIRECT_DATABASE_URL;
if (!value) {
  console.error("DIRECT_DATABASE_URL is not set.");
  process.exit(1);
}

let url;
try {
  url = new URL(value);
} catch {
  // Never include the value: it holds the password.
  console.error("DIRECT_DATABASE_URL is not a valid URL.");
  process.exit(1);
}

for (const part of [url.hostname, url.username, url.password, url.pathname.slice(1)]) {
  if (part) console.log(`::add-mask::${decodeURIComponent(part)}`);
}
