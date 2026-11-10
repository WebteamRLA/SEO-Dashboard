/**
 * Google service-account sign-in, with no SDK: a signed JWT is exchanged for a
 * one-hour access token. Uses Web Crypto only, so it runs on Node, Vercel, and
 * Cloudflare Workers alike, and adds nothing to the bundle.
 *
 * This file has no imports on purpose: scripts/check-google.mjs loads it
 * directly with Node's type stripping, which cannot resolve extensionless or
 * aliased imports.
 */

export interface ServiceAccountKey {
  clientEmail: string;
  privateKey: string;
}

export interface AccessToken {
  token: string;
  /** Epoch milliseconds. */
  expiresAt: number;
}

export const GOOGLE_SCOPES = [
  "https://www.googleapis.com/auth/webmasters.readonly",
  "https://www.googleapis.com/auth/analytics.readonly",
] as const;

const TOKEN_URL = "https://oauth2.googleapis.com/token";

export class GoogleCredentialsError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "GoogleCredentialsError";
  }
}

/**
 * Accepts the JSON key file Google downloads, either as raw JSON or base64 of
 * it (easier to paste into an env var). Errors never echo the value.
 */
export function parseServiceAccountKey(raw: string): ServiceAccountKey {
  const text = raw.trim();
  let json: unknown;
  try {
    json = JSON.parse(text.startsWith("{") ? text : atob(text));
  } catch {
    throw new GoogleCredentialsError(
      "GOOGLE_SERVICE_ACCOUNT_KEY is not valid JSON or base64-encoded JSON.",
    );
  }
  const record = (json ?? {}) as Record<string, unknown>;
  const clientEmail = record.client_email;
  const privateKey = record.private_key;
  if (typeof clientEmail !== "string" || typeof privateKey !== "string" || !privateKey.includes("PRIVATE KEY")) {
    throw new GoogleCredentialsError(
      "GOOGLE_SERVICE_ACCOUNT_KEY must be a service account key with client_email and private_key.",
    );
  }
  // Keys pasted through some tools arrive with literal "\n" sequences.
  return { clientEmail, privateKey: privateKey.replace(/\\n/g, "\n") };
}

function base64Url(bytes: Uint8Array): string {
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

const encodeJson = (value: unknown) => base64Url(new TextEncoder().encode(JSON.stringify(value)));

function pemToDer(pem: string): ArrayBuffer {
  const body = pem.replace(/-----(BEGIN|END) PRIVATE KEY-----/g, "").replace(/\s+/g, "");
  const binary = atob(body);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i += 1) bytes[i] = binary.charCodeAt(i);
  return bytes.buffer;
}

/** An RS256 JWT assertion for Google's token endpoint. */
export async function createAssertion(
  key: ServiceAccountKey,
  scopes: readonly string[],
  nowMs: number = Date.now(),
): Promise<string> {
  const iat = Math.floor(nowMs / 1000);
  const header = encodeJson({ alg: "RS256", typ: "JWT" });
  const claims = encodeJson({
    iss: key.clientEmail,
    scope: scopes.join(" "),
    aud: TOKEN_URL,
    iat,
    exp: iat + 3600,
  });
  let cryptoKey: CryptoKey;
  try {
    cryptoKey = await crypto.subtle.importKey(
      "pkcs8",
      pemToDer(key.privateKey),
      { name: "RSASSA-PKCS1-v1_5", hash: "SHA-256" },
      false,
      ["sign"],
    );
  } catch {
    throw new GoogleCredentialsError("The service account private key could not be read.");
  }
  const input = `${header}.${claims}`;
  const signature = await crypto.subtle.sign("RSASSA-PKCS1-v1_5", cryptoKey, new TextEncoder().encode(input));
  return `${input}.${base64Url(new Uint8Array(signature))}`;
}

/** Exchanges a signed assertion for an access token. */
export async function fetchAccessToken(
  key: ServiceAccountKey,
  scopes: readonly string[] = GOOGLE_SCOPES,
  timeoutMs = 8_000,
): Promise<AccessToken> {
  const assertion = await createAssertion(key, scopes);
  let response: Response;
  try {
    response = await fetch(TOKEN_URL, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer",
        assertion,
      }),
      signal: AbortSignal.timeout(timeoutMs),
      cache: "no-store",
    });
  } catch {
    throw new GoogleCredentialsError("Could not reach Google's sign-in service.");
  }
  const body = (await response.json().catch(() => ({}))) as {
    access_token?: string;
    expires_in?: number;
    error?: string;
    error_description?: string;
  };
  if (!response.ok || !body.access_token) {
    // Google's error codes (e.g. invalid_grant) are safe to show; they hold no secret.
    const reason = [body.error, body.error_description].filter(Boolean).join(": ");
    throw new GoogleCredentialsError(
      `Google rejected the service account sign-in (${response.status}${reason ? `, ${reason}` : ""}).`,
    );
  }
  return { token: body.access_token, expiresAt: Date.now() + (body.expires_in ?? 3600) * 1000 };
}
