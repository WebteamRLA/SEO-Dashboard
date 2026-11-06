"use client";

import { useState, type FormEvent } from "react";
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
import type { TeamMember, TeamRole } from "@/lib/types";
import { MEMBER_STATUS_META, INVITABLE_ROLES, isInvitableRole } from "./settings-meta";

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function TeamMembers({ initialMembers }: { initialMembers: TeamMember[] }) {
  // Local state only. Nothing is saved or sent, and a reload restores the sample list.
  const [members, setMembers] = useState<TeamMember[]>(initialMembers);
  const [inviteOpen, setInviteOpen] = useState(false);
  const [pendingRemoval, setPendingRemoval] = useState<TeamMember | null>(null);

  const columns: Column<TeamMember>[] = [
    { id: "name", header: "Member", cell: (member) => <span className="font-medium">{member.name}</span>, sortValue: (member) => member.name },
    { id: "email", header: "Email", hideBelow: "md", cell: (member) => <span className="text-muted-foreground">{member.email}</span>, sortValue: (member) => member.email },
    { id: "role", header: "Role", cell: (member) => member.role, sortValue: (member) => member.role },
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
      cell: (member) =>
        member.role === "Owner" ? (
          <span className="text-xs text-muted-foreground">Owner cannot be removed</span>
        ) : (
          <Button
            variant="ghost"
            size="sm"
            aria-label={`Remove ${member.name}`}
            onClick={() => setPendingRemoval(member)}
          >
            Remove
          </Button>
        ),
    },
  ];

  function handleInvited(email: string, role: TeamRole) {
    // Date.now is read in an event handler, never during render.
    const id = `local-${Date.now()}`;
    setMembers((current) => [
      ...current,
      { id, name: email, email, role, title: "", status: "invited" },
    ]);
    setInviteOpen(false);
    toast(`${email} was added to this preview only. No invitation was sent and nothing is saved.`);
  }

  function confirmRemoval() {
    if (!pendingRemoval || pendingRemoval.role === "Owner") return;
    const removed = pendingRemoval;
    setMembers((current) => current.filter((member) => member.id !== removed.id));
    setPendingRemoval(null);
    toast(`${removed.name} was removed from this preview only.`);
  }

  return (
    <section aria-labelledby="team-heading" className="flex flex-col gap-3">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 id="team-heading" className="text-sm font-semibold">Team and access</h2>
          <p className="text-sm text-muted-foreground">
            Who can open this dashboard. Changes here stay on this page until accounts are connected.
          </p>
        </div>
        <Button onClick={() => setInviteOpen(true)}>Invite member</Button>
      </div>

      <DataTable
        caption="Team members and their roles"
        columns={columns}
        rows={members}
        getRowId={(member) => member.id}
        defaultSort={{ columnId: "name", direction: "asc" }}
      />

      <InviteDialog open={inviteOpen} onOpenChange={setInviteOpen} onInvite={handleInvited} />

      <ConfirmDialog
        open={pendingRemoval !== null}
        onOpenChange={(open) => {
          if (!open) setPendingRemoval(null);
        }}
        title={`Remove ${pendingRemoval?.name ?? "this member"}?`}
        description="This only removes them from the list on this page. Nothing changes for the real team."
        confirmLabel="Remove"
        onConfirm={confirmRemoval}
      />
    </section>
  );
}

function InviteDialog({
  open,
  onOpenChange,
  onInvite,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onInvite: (email: string, role: TeamRole) => void;
}) {
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<TeamRole>("Member");
  const [error, setError] = useState<string | null>(null);

  function handleOpenChange(next: boolean) {
    if (!next) {
      setEmail("");
      setRole("Member");
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
    onInvite(trimmed, role);
    handleOpenChange(false);
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent>
        <form onSubmit={handleSubmit} noValidate className="flex flex-col gap-4">
          <DialogHeader>
            <DialogTitle>Invite member</DialogTitle>
            <DialogDescription>
              Adds the person to this preview only. No email is sent.
            </DialogDescription>
          </DialogHeader>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="invite-email">Email</Label>
            <Input
              id="invite-email"
              type="email"
              autoComplete="off"
              value={email}
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
              onValueChange={(value) => {
                if (isInvitableRole(value)) setRole(value);
              }}
            >
              <SelectTrigger id="invite-role" className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {INVITABLE_ROLES.map((option) => (
                  <SelectItem key={option} value={option}>
                    {option}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => handleOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit">Add to preview</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
