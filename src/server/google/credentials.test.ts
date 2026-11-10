import { generateKeyPairSync, createVerify } from "node:crypto";
import { describe, expect, it } from "vitest";
import { createAssertion, GoogleCredentialsError, parseServiceAccountKey } from "./credentials";

const { privateKey, publicKey } = generateKeyPairSync("rsa", { modulusLength: 2048 });
const pem = privateKey.export({ type: "pkcs8", format: "pem" }).toString();
const keyFile = JSON.stringify({
  type: "service_account",
  client_email: "dashboard@example.iam.gserviceaccount.com",
  private_key: pem,
});

const decode = (part: string) => JSON.parse(Buffer.from(part, "base64url").toString("utf8"));

describe("parseServiceAccountKey", () => {
  it("accepts the downloaded JSON and base64 of it", () => {
    const fromJson = parseServiceAccountKey(keyFile);
    expect(fromJson.clientEmail).toBe("dashboard@example.iam.gserviceaccount.com");
    expect(parseServiceAccountKey(Buffer.from(keyFile).toString("base64"))).toEqual(fromJson);
  });

  it("restores escaped newlines in the private key", () => {
    const escaped = JSON.stringify({ client_email: "a@b.c", private_key: pem.replace(/\n/g, "\\n") });
    expect(parseServiceAccountKey(escaped).privateKey).toBe(pem);
  });

  it("rejects malformed input without echoing it", () => {
    expect(() => parseServiceAccountKey("not-a-key")).toThrow(GoogleCredentialsError);
    expect(() => parseServiceAccountKey('{"client_email":"a@b.c"}')).toThrow(/client_email and private_key/);
    try {
      parseServiceAccountKey("secret-value!");
    } catch (error) {
      expect((error as Error).message).not.toContain("secret-value");
    }
  });
});

describe("createAssertion", () => {
  it("signs an RS256 JWT for Google's token endpoint", async () => {
    const key = parseServiceAccountKey(keyFile);
    const now = Date.UTC(2026, 10, 10, 12);
    const jwt = await createAssertion(key, ["scope-a", "scope-b"], now);
    const [header, claims, signature] = jwt.split(".") as [string, string, string];

    expect(decode(header)).toEqual({ alg: "RS256", typ: "JWT" });
    expect(decode(claims)).toEqual({
      iss: "dashboard@example.iam.gserviceaccount.com",
      scope: "scope-a scope-b",
      aud: "https://oauth2.googleapis.com/token",
      iat: now / 1000,
      exp: now / 1000 + 3600,
    });
    const verifier = createVerify("RSA-SHA256");
    verifier.update(`${header}.${claims}`);
    expect(verifier.verify(publicKey, Buffer.from(signature, "base64url"))).toBe(true);
  });

  it("reports an unreadable private key clearly", async () => {
    await expect(
      createAssertion({ clientEmail: "a@b.c", privateKey: "-----BEGIN PRIVATE KEY-----\nAAAA\n-----END PRIVATE KEY-----" }, []),
    ).rejects.toThrow(/could not be read/);
  });
});
