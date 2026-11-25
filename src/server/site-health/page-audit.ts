import type { PageFacts } from "./types";

export interface AuditInput {
  url: string;
  status: number;
  redirectedTo: string | null;
  responseMs: number;
  /** Response body. Null when the request failed or was not a 2xx. */
  html: string | null;
  headers: { get(name: string): string | null } | null;
}

const NAMED_ENTITIES: Record<string, string> = {
  amp: "&",
  lt: "<",
  gt: ">",
  quot: '"',
  apos: "'",
  nbsp: " ",
};

/** Single pass, so "&amp;lt;" correctly becomes "&lt;" and not "<". */
function decodeEntities(text: string): string {
  return text.replace(/&(#x[0-9a-f]+|#\d+|[a-z]+);/gi, (whole, body: string) => {
    if (body[0] === "#") {
      const code = body[1] === "x" || body[1] === "X" ? parseInt(body.slice(2), 16) : parseInt(body.slice(1), 10);
      if (!Number.isFinite(code) || code <= 0 || code > 0x10ffff) return whole;
      return String.fromCodePoint(code);
    }
    return NAMED_ENTITIES[body.toLowerCase()] ?? whole;
  });
}

function cleanText(text: string): string | null {
  const value = decodeEntities(text).replace(/\s+/g, " ").trim();
  return value === "" ? null : value;
}

/** Fake tags inside scripts, styles and comments (JSON-LD, inline templates) must not be counted. */
function stripIgnored(html: string): string {
  return html
    .replace(/<!--[\s\S]*?(?:-->|$)/g, "")
    .replace(/<(script|style|noscript|template)\b[^>]*>[\s\S]*?(?:<\/\1\s*>|$)/gi, "");
}

// Quoted attribute values may contain ">", so they are matched as units.
const TAG = /<(meta|link|img|a)(?=[\s/>])((?:"[^"]*"|'[^']*'|[^'">])*)>/gi;
const ATTRIBUTE = /([^\s"'<>/=]+)(?:\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s"'=<>`]+)))?/g;

function parseAttributes(source: string): Map<string, string> {
  const attrs = new Map<string, string>();
  for (const match of source.matchAll(ATTRIBUTE)) {
    const name = (match[1] ?? "").toLowerCase();
    if (attrs.has(name)) continue; // browsers use the first occurrence
    attrs.set(name, decodeEntities(match[2] ?? match[3] ?? match[4] ?? ""));
  }
  return attrs;
}

const NON_PAGE_EXTENSIONS = /\.(?:jpe?g|png|gif|webp|svg|pdf|zip|mp3|mp4|webm|avif|ico|css|js|xml)$/i;

function hostKey(host: string): string {
  return host.toLowerCase().replace(/^www\./, "");
}

function isSkippedPath(pathname: string, search: string): boolean {
  const path = pathname.toLowerCase();
  if (NON_PAGE_EXTENSIONS.test(path)) return true;
  if (path.startsWith("/wp-admin") || path.startsWith("/wp-login.php") || path.startsWith("/wp-json")) return true;
  if (path.startsWith("/xmlrpc.php") || path.startsWith("/wp-content/") || path.includes("/wp-content/")) return true;
  if (path === "/feed" || path.endsWith("/feed") || path.includes("/feed/")) return true;
  return search.toLowerCase().includes("?replytocom=");
}

function resolveInternal(href: string, base: URL): string | null {
  const trimmed = href.trim();
  if (trimmed === "" || trimmed.startsWith("#")) return null;
  let target: URL;
  try {
    target = new URL(trimmed, base);
  } catch {
    return null;
  }
  if (target.protocol !== "http:" && target.protocol !== "https:") return null;
  if (hostKey(target.hostname) !== hostKey(base.hostname)) return null;
  target.hash = "";
  if (isSkippedPath(target.pathname, target.search)) return null;
  return target.href;
}

function hasNoindex(content: string): boolean {
  return content
    .toLowerCase()
    .split(/[\s,]+/)
    .includes("noindex");
}

/**
 * Reads the SEO-relevant facts from one fetched page. Pure: the crawler does the
 * fetching and passes the first response's status, timing, body and headers in.
 */
export function auditPage(input: AuditInput): PageFacts {
  const { url, status, redirectedTo, responseMs, html, headers } = input;
  const facts: PageFacts = {
    url,
    status,
    isHtml: html !== null,
    redirectedTo,
    responseMs,
    title: null,
    metaDescription: null,
    h1Count: 0,
    noindex: hasNoindex(headers?.get("x-robots-tag") ?? ""),
    canonical: null,
    imagesMissingAlt: 0,
    internalLinks: [],
  };
  if (html === null) return facts;

  let base: URL | null = null;
  try {
    base = new URL(url);
  } catch {
    base = null;
  }

  const body = stripIgnored(html);

  const titleMatch = /<title(?=[\s>/])[^>]*>([\s\S]*?)<\/title\s*>/i.exec(body);
  facts.title = titleMatch ? cleanText(titleMatch[1] ?? "") : null;
  facts.h1Count = body.match(/<h1(?=[\s>/])/gi)?.length ?? 0;

  const links = new Set<string>();
  for (const match of body.matchAll(TAG)) {
    const tag = (match[1] ?? "").toLowerCase();
    const attrs = parseAttributes(match[2] ?? "");

    if (tag === "meta") {
      const name = attrs.get("name")?.trim().toLowerCase();
      const content = attrs.get("content");
      if (content === undefined) continue;
      if (name === "description" && facts.metaDescription === null) facts.metaDescription = cleanText(content);
      if ((name === "robots" || name === "googlebot") && hasNoindex(content)) facts.noindex = true;
    } else if (tag === "link") {
      const rel = (attrs.get("rel") ?? "").toLowerCase().split(/\s+/);
      const href = attrs.get("href");
      if (rel.includes("canonical") && href && facts.canonical === null && base) {
        try {
          facts.canonical = new URL(href.trim(), base).href;
        } catch {
          // an unparseable canonical is treated as absent
        }
      }
    } else if (tag === "img") {
      if (!attrs.has("alt")) facts.imagesMissingAlt += 1;
    } else if (base) {
      const href = attrs.get("href");
      const resolved = href === undefined ? null : resolveInternal(href, base);
      if (resolved) links.add(resolved);
    }
  }
  facts.internalLinks = [...links];
  return facts;
}
