"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import { ConfirmDialog } from "@/components/data/confirm-dialog";
import { Panel } from "@/components/data/panel";
import { DataTable, type Column } from "@/components/data/data-table";
import { StatusBadge } from "@/components/data/status-badge";
import { Button } from "@/components/ui/button";
import { ROLE_LABELS, type AccessMember } from "@/lib/types/auth";
import { removeMember, resendInvite, type TeamActionResult } from "@/server/team/actions";
import { InviteForm, showResult } from "./invite-form";
import { MEMBER_STATUS_META } from "./settings-meta";

const AVATAR_TONES = [
  "bg-[#e6f2fd] text-[#0060ad]",
  "bg-[#e3f7ec] text-[#0f6b3f]",
  "bg-[#efe6fb] text-[#6d28d9]",
  "bg-[#fef3dc] text-[#92400e]",
];

function initials(member: AccessMember) {
  const source = member.name?.trim() || member.email;
  const parts = source.split(/[\s@.]+/).filter(Boolean);
  const letters = member.name?.trim() ? parts.slice(0, 2).map((part) => part[0]).join("") : parts[0]?.[0] ?? "?";
  return letters.toUpperCase();
}

function Avatar({ member }: { member: AccessMember }) {
  const tone = AVATAR_TONES[[...member.email].reduce((sum, char) => sum + char.charCodeAt(0), 0) % AVATAR_TONES.length];
  return (
    <span aria-hidden className={`flex size-9 shrink-0 items-center justify-center rounded-full text-xs font-bold ${tone}`}>
      {initials(member)}
    </span>
  );
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
      header: "Person",
      cell: (member) => (
        <span className="flex items-center gap-3">
          <Avatar member={member} />
          <span className="flex min-w-0 flex-col leading-snug">
            <span className="truncate text-sm font-semibold text-ink">
              {member.name ?? member.email}
              {member.email === currentEmail ? <span className="ml-1.5 text-xs font-normal text-ink-quiet">(you)</span> : null}
            </span>
            {member.name ? <span className="truncate text-xs text-ink-quiet">{member.email}</span> : null}
          </span>
        </span>
      ),
      sortValue: (member) => (member.name ?? member.email).toLowerCase(),
    },
    { id: "role", header: "Role", cell: (member) => <span className="text-sm text-ink-body">{ROLE_LABELS[member.role]}</span>, sortValue: (member) => member.role },
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
        if (member.bootstrap) return <span className="text-xs text-ink-quiet">Admin set in server settings</span>;
        if (member.email === currentEmail) return <span className="text-xs text-ink-quiet">You</span>;
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
    <div className="flex flex-col gap-6">
      {canManage ? (
        <Panel
          id="invite"
          title="Invite people"
          description="People invited here sign in with their Google account."
        >
          <InviteForm />
        </Panel>
      ) : null}

      <Panel
        id="team"
        title="People with access"
        description={`${members.length} ${members.length === 1 ? "person" : "people"} can sign in to this dashboard.${canManage ? "" : " Only admins can invite or remove people."}`}
        flush
      >
        <DataTable
          bare
          footerSummary
          caption="Team members and their roles"
          columns={columns}
          rows={members}
          getRowId={(member) => member.email}
          defaultSort={{ columnId: "name", direction: "asc" }}
        />
      </Panel>

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
    </div>
  );
}
