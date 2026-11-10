import "server-only";
import { cache } from "react";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import type { SessionUser } from "@/lib/types/auth";
import { isRole } from "./access";
import { getAuth } from "./auth";

/** The signed-in user for this request, or null. Null too when sign-in is not configured. */
export const getSessionUser = cache(async (): Promise<SessionUser | null> => {
  const auth = getAuth();
  if (!auth) return null;
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) return null;
  const { id, name, email, image, role } = session.user;
  return { id, name, email, image: image ?? null, role: isRole(role) ? role : "member" };
});

/** For protected pages: the signed-in user, or a redirect to the login page. */
export async function requireSessionUser(): Promise<SessionUser> {
  const user = await getSessionUser();
  if (!user) redirect("/login");
  return user;
}
