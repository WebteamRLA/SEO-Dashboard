import { toNextJsHandler } from "better-auth/next-js";
import { getAuth } from "@/server/auth/auth";

function notConfigured() {
  return Response.json({ error: "Sign-in is not configured." }, { status: 503 });
}

export async function GET(request: Request) {
  const auth = getAuth();
  return auth ? toNextJsHandler(auth).GET(request) : notConfigured();
}

export async function POST(request: Request) {
  const auth = getAuth();
  return auth ? toNextJsHandler(auth).POST(request) : notConfigured();
}
