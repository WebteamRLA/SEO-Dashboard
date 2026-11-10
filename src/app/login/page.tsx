import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { TriangleAlert } from "lucide-react";
import { GoogleSignInButton } from "@/features/auth/google-sign-in-button";
import { signInErrorMessage } from "@/features/auth/sign-in-errors";
import { getAuthConfig } from "@/server/auth/config";
import { getSessionUser } from "@/server/auth/session";

export const metadata: Metadata = { title: "Sign in" };

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string | string[] }>;
}) {
  if (await getSessionUser()) redirect("/overview");

  const configured = getAuthConfig() !== null;
  const errorMessage = signInErrorMessage((await searchParams).error);

  return (
    <main className="flex min-h-dvh items-center justify-center bg-background px-4 py-12">
      <div className="flex w-full max-w-sm flex-col items-center text-center">
        <span
          className="flex size-11 items-center justify-center rounded-lg bg-primary text-base font-semibold text-primary-foreground"
          aria-hidden
        >
          RL
        </span>
        <p className="mt-3 text-sm font-semibold">SEO Dashboard</p>
        <p className="text-xs text-muted-foreground">RightLeft Agency</p>

        <h1 className="mt-8 text-xl font-semibold tracking-tight">Sign in</h1>
        <p className="mt-1.5 text-sm text-muted-foreground">Use the Google account your team invited.</p>

        {errorMessage ? (
          <p role="alert" className="mt-5 w-full rounded-md bg-muted px-3 py-2.5 text-sm">
            <TriangleAlert className="mr-1.5 inline size-4 align-text-bottom text-status-critical" aria-hidden />
            {errorMessage}
          </p>
        ) : null}

        <div className="mt-6 w-full">
          <GoogleSignInButton disabled={!configured} />
        </div>

        {configured ? null : (
          <p className="mt-3 text-sm text-muted-foreground">Sign-in isn&apos;t set up on this server yet.</p>
        )}

        <p className="mt-8 text-xs text-muted-foreground">Access is by invitation only.</p>
      </div>
    </main>
  );
}
