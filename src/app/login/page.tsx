import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { Lock, TriangleAlert } from "lucide-react";
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
    <main className="flex min-h-dvh flex-col items-center justify-center bg-surface-subtle px-6 py-10">
      <div className="flex w-full max-w-[400px] flex-col items-center gap-7">
        <div className="flex flex-col items-center gap-1.5">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/rla-logo.svg" alt="Right Left Agency" width={220} height={22} className="block h-auto w-[220px]" />
          <span className="pl-[26px] text-xs tracking-[0.08em] text-[#556cce] uppercase">Client dashboard</span>
        </div>

        <div className="flex w-full flex-col items-center gap-5 rounded-2xl border border-border bg-card p-8 text-center shadow-[0_1px_2px_#1118270a,0_12px_32px_#1118270a]">
          <div className="flex flex-col gap-1.5">
            <h1 className="text-2xl leading-tight font-semibold tracking-tight text-ink">Sign in</h1>
            <p className="text-sm text-ink-quiet">Use the Google account your team invited.</p>
          </div>

          {errorMessage ? (
            <p role="alert" className="w-full rounded-lg bg-tone-critical-bg px-3 py-2.5 text-left text-[13px] text-ink-body">
              <TriangleAlert className="mr-1.5 inline size-4 align-text-bottom text-status-critical" aria-hidden />
              {errorMessage}
            </p>
          ) : null}

          <div className="w-full">
            <GoogleSignInButton disabled={!configured} />
          </div>

          {configured ? null : (
            <p className="text-[13px] text-ink-quiet">Sign-in isn&apos;t set up on this server yet.</p>
          )}

          <p className="flex items-center gap-1.5 text-xs text-ink-quiet">
            <Lock className="size-3.5" aria-hidden />
            Access is by invitation only
          </p>
        </div>

        <p className="max-w-[340px] text-center text-[13px] leading-relaxed text-ink-quiet">
          No invitation yet? Ask the account admin or the Right Left Agency team.
        </p>
        <p className="mt-6 text-xs text-[#9ca3af]">© {new Date().getFullYear()} Right Left Agency</p>
      </div>
    </main>
  );
}
