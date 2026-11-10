"use client";

import { useState, useTransition, type FormEvent } from "react";
import { toast } from "sonner";
import { ConfirmDialog } from "@/components/data/confirm-dialog";
import { DataTable, type Column } from "@/components/data/data-table";
import { StatusBadge } from "@/components/data/status-badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ROLE_LABELS, ROLES, type AccessMember, type Role } from "@/lib/types/auth";
import { inviteMember, removeMember, resendInvite, type TeamActionResult } from "@/server/team/actions";
import { MEMBER_STATUS_META } from "./settings-meta";

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// Only admin is enforced today (Team & Access changes). Manager and member differ
// once role-based permissions arrive.
const ROLE_HINTS: Record<Role, string> = {
  admin: "Can use the whole dashboard and invite or remove people.",
  manager: "Can use the dashboard. Cannot invite or remove people.",
  member: "Can use the dashboard. Cannot invite or remove people.",
};

function showResult(result: TeamActionResult) {
  if (result.status === "success") toast.success(result.message);
  else if (result.status === "warning") toast.warning(result.message);
  else toast.error(result.message);
}

export function TeamMembers({
  members,
  currentEmail,
  canManage,
}: {
  members: AccessMember[];
  currentEmail: string;
  canManage: boolean;
}) {
  const [inviteOpen, setInviteOpen] = useState(false);
  const [pendingRemoval, setPendingRemoval] = useState<AccessMember | null>(null);
  const [busyEmail, setBusyEmail] = useState<string | null>(null);
  const [, startTransition] = useTransition();

  function run(email: string, action: () => Promise<TeamActionResult>) {
    setBusyEmail(email);
    startTransition(async () => {
      try {
        showResult(await action());
      } catch {
        toast.error("Something went wrong. Try again.");
      } finally {
        setBusyEmail(null);
      }
    });
  }

  const columns: Column<AccessMember>[] = [
    {
      id: "name",
      header: "Member",
      cell: (member) => (
        <span className="font-medium">
          {member.name ?? member.email}
          {member.email === currentEmail ? <span className="ml-1.5 text-xs font-normal text-muted-foreground">(you)</span> : null}
        </span>
      ),
      sortValue: (member) => (member.name ?? member.email).toLowerCase(),
    },
    { id: "email", header: "Email", hideBelow: "md", cell: (member) => <span className="text-muted-foreground">{member.email}</span>, sortValue: (member) => member.email },
    { id: "role", header: "Role", cell: (member) => ROLE_LABELS[member.role], sortValue: (member) => member.role },
    {
      id: "status",
      header: "Status",
      cell: (member) => {
        const meta = MEMBER_STATUS_META[member.status];
        return <StatusBadge tone={meta.tone} label={meta.label} />;
      },
      sortValue: (member) => member.status,
    },
    {
      id: "actions",
      header: "Access",
      align: "right",
      cell: (member) => {
        if (member.bootstrap) return <span className="text-xs text-muted-foreground">Admin set in server settings</span>;
        if (member.email === currentEmail) return <span className="text-xs text-muted-foreground">You</span>;
        if (!canManage) return null;
        const busy = busyEmail === member.email;
        return (
          <div className="flex justify-end gap-1">
            {member.status === "invited" ? (
              <Button
                variant="ghost"
                size="sm"
                disabled={busy}
                aria-label={`Resend invite to ${member.email}`}
                onClick={() => run(member.email, () => resendInvite(member.email))}
              >
                Resend invite
              </Button>
            ) : null}
            <Button
              variant="ghost"
              size="sm"
              disabled={busy}
              aria-label={`Remove ${member.name ?? member.email}`}
              onClick={() => setPendingRemoval(member)}
            >
              Remove
            </Button>
          </div>
        );
      },
    },
  ];

  return (
    <section aria-labelledby="team-heading" className="flex flex-col gap-3">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 id="team-heading" className="text-sm font-semibold">Team and access</h2>
          <p className="text-sm text-muted-foreground">
            {canManage
              ? "Who can sign in to this dashboard. Invited people sign in with the Google account for their email."
              : "Who can sign in to this dashboard. Only admins can invite or remove people."}
          </p>
        </div>
        {canManage ? <Button onClick={() => setInviteOpen(true)}>Invite member</Button> : null}
      </div>

      <DataTable
        caption="Team members and their roles"
        columns={columns}
        rows={members}
        getRowId={(member) => member.email}
        defaultSort={{ columnId: "name", direction: "asc" }}
      />

      {canManage ? <InviteDialog open={inviteOpen} onOpenChange={setInviteOpen} /> : null}

      <ConfirmDialog
        open={pendingRemoval !== null}
        onOpenChange={(open) => {
          if (!open) setPendingRemoval(null);
        }}
        title={`Remove ${pendingRemoval?.name ?? pendingRemoval?.email ?? "this member"}?`}
        description={
          pendingRemoval?.status === "active"
            ? "They are signed out now and can no longer sign in. You can invite them again later."
            : "Their invite is cancelled, so they cannot sign in. You can invite them again later."
        }
        confirmLabel="Remove"
        onConfirm={() => {
          const member = pendingRemoval;
          setPendingRemoval(null);
          if (member) run(member.email, () => removeMember(member.email));
        }}
      />
    </section>
  );
}

function InviteDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (open: boolean) => void }) {
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<Role>("member");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function handleOpenChange(next: boolean) {
    if (pending) return;
    if (!next) {
      setEmail("");
      setRole("member");
      setError(null);
    }
    onOpenChange(next);
  }

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
          // Keep the dialog open so the address can be corrected.
          setError(result.message);
          return;
        }
        showResult(result);
        setEmail("");
        setRole("member");
        setError(null);
        onOpenChange(false);
      } catch {
        setError("Something went wrong. Try again.");
      }
    });
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent>
        <form onSubmit={handleSubmit} noValidate className="flex flex-col gap-4">
          <DialogHeader>
            <DialogTitle>Invite member</DialogTitle>
            <DialogDescription>
              They get an email with a sign-in link, and can sign in with the Google account for this address.
            </DialogDescription>
          </DialogHeader>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="invite-email">Email</Label>
            <Input
              id="invite-email"
              type="email"
              autoComplete="off"
              value={email}
              disabled={pending}
              onChange={(event) => {
                setEmail(event.target.value);
                if (error) setError(null);
              }}
              aria-invalid={error ? true : undefined}
              aria-describedby={error ? "invite-email-error" : undefined}
            />
            {error ? (
              <p id="invite-email-error" role="alert" className="text-xs text-destructive">
                {error}
              </p>
            ) : null}
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="invite-role">Role</Label>
            <Select
              value={role}
              disabled={pending}
              onValueChange={(value) => {
                if ((ROLES as readonly string[]).includes(value)) setRole(value as Role);
              }}
            >
              <SelectTrigger id="invite-role" className="w-full">
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
            <p className="text-xs text-muted-foreground">{ROLE_HINTS[role]}</p>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" disabled={pending} onClick={() => handleOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={pending}>
              {pending ? "Sending…" : "Send invite"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
