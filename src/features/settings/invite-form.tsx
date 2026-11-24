"use client";

import { Loader2, Mail } from "lucide-react";
import { useId, useState, useTransition, type FormEvent } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ROLE_LABELS, ROLES, type Role } from "@/lib/types/auth";
import { inviteMember, type TeamActionResult } from "@/server/team/actions";

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const DEFAULT_ROLE: Role = "member";

export function showResult(result: TeamActionResult) {
  if (result.status === "success") toast.success(result.message);
  else if (result.status === "warning") toast.warning(result.message);
  else toast.error(result.message);
}

/** The design's inline invite row: email, role, Send invite. Same action and checks as before. */
export function InviteForm() {
  const id = useId();
  const emailId = `${id}-email`;
  const roleId = `${id}-role`;
  const errorId = `${id}-error`;
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<Role>(DEFAULT_ROLE);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const trimmed = email.trim();
    if (!EMAIL_PATTERN.test(trimmed)) {
      setError("Enter an email address, such as name@example.com.");
      return;
    }
    startTransition(async () => {
      try {
        const result = await inviteMember({ email: trimmed, role });
        if (result.status === "error") {
          // Keep the address so it can be corrected.
          setError(result.message);
          return;
        }
        showResult(result);
        setEmail("");
        setRole(DEFAULT_ROLE);
        setError(null);
      } catch {
        setError("Something went wrong. Try again.");
      }
    });
  }

  return (
    <form onSubmit={handleSubmit} noValidate className="flex flex-col gap-2.5">
      <div className="flex flex-wrap items-start gap-2.5">
        <div className="min-w-0 flex-[1_1_320px]">
          <label
            htmlFor={emailId}
            className={`flex h-10 items-center gap-2 rounded-lg border bg-card px-3 focus-within:border-ring focus-within:ring-3 focus-within:ring-ring/50 ${
              error ? "border-destructive" : "border-input"
            }`}
          >
            <Mail aria-hidden className="size-4 shrink-0 text-ink-quiet" />
            <span className="sr-only">Email address</span>
            <input
              id={emailId}
              type="email"
              autoComplete="off"
              placeholder="name@company.com"
              value={email}
              disabled={pending}
              onChange={(event) => {
                setEmail(event.target.value);
                if (error) setError(null);
              }}
              aria-invalid={error ? true : undefined}
              aria-describedby={error ? errorId : undefined}
              className="min-w-0 flex-1 border-0 bg-transparent text-sm text-ink outline-none placeholder:text-ink-quiet disabled:opacity-50"
            />
          </label>
        </div>
        <Select
          value={role}
          disabled={pending}
          onValueChange={(value) => {
            if ((ROLES as readonly string[]).includes(value)) setRole(value as Role);
          }}
        >
          <SelectTrigger id={roleId} aria-label="Role" className="h-10 min-w-32 text-sm max-sm:w-full">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {ROLES.map((option) => (
              <SelectItem key={option} value={option}>
                {ROLE_LABELS[option]}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Button type="submit" size="lg" disabled={pending} className="h-10 px-[18px] max-sm:w-full">
          {pending ? <Loader2 aria-hidden className="size-4 animate-spin" /> : null}
          {pending ? "Sending…" : "Send invite"}
        </Button>
      </div>
      <p id={errorId} role="alert" aria-live="polite" className={error ? "text-xs text-destructive" : "sr-only"}>
        {error}
      </p>
      <p className="text-xs text-ink-quiet">
        <strong className="font-semibold text-ink-body">Member</strong> sees every page.{" "}
        <strong className="font-semibold text-ink-body">Manager</strong> also writes report notes and finalises reports.{" "}
        <strong className="font-semibold text-ink-body">Admin</strong> also invites and removes people.
      </p>
    </form>
  );
}
