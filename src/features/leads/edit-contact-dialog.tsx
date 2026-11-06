"use client";

import { useId, useState, type FormEvent } from "react";
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
import type { Lead } from "@/lib/types";
import { validateContact, type ContactErrors, type ContactInput } from "./lead-logic";

export function EditContactDialog({
  open,
  onOpenChange,
  lead,
  onSave,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  lead: Lead;
  onSave: (values: ContactInput) => void;
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <EditContactForm
          lead={lead}
          onCancel={() => onOpenChange(false)}
          onSave={(values) => {
            onSave(values);
            onOpenChange(false);
          }}
        />
      </DialogContent>
    </Dialog>
  );
}

const FIELDS = [
  { key: "name", label: "Name", type: "text", autoComplete: "name" },
  { key: "email", label: "Email", type: "email", autoComplete: "email" },
  { key: "phone", label: "Phone", type: "tel", autoComplete: "tel" },
  { key: "company", label: "Company", type: "text", autoComplete: "organization" },
] as const;

function EditContactForm({
  lead,
  onCancel,
  onSave,
}: {
  lead: Lead;
  onCancel: () => void;
  onSave: (values: ContactInput) => void;
}) {
  const baseId = useId();
  const [values, setValues] = useState<ContactInput>({
    name: lead.name,
    email: lead.email,
    phone: lead.phone,
    company: lead.company,
  });
  const [errors, setErrors] = useState<ContactErrors>({});

  function submit(event: FormEvent) {
    event.preventDefault();
    const found = validateContact(values);
    setErrors(found);
    if (Object.keys(found).length > 0) return;
    onSave({
      name: values.name.trim(),
      email: values.email.trim(),
      phone: values.phone.trim(),
      company: values.company.trim(),
    });
  }

  return (
    <form onSubmit={submit} noValidate className="flex flex-col gap-4">
      <DialogHeader>
        <DialogTitle>Edit contact information</DialogTitle>
        <DialogDescription>Changes are added to this lead&apos;s activity history.</DialogDescription>
      </DialogHeader>
      {FIELDS.map((field) => {
        const id = `${baseId}-${field.key}`;
        const error = errors[field.key];
        return (
          <div key={field.key} className="flex flex-col gap-1.5">
            <Label htmlFor={id}>{field.label}</Label>
            <Input
              id={id}
              type={field.type}
              autoComplete={field.autoComplete}
              value={values[field.key]}
              onChange={(event) => {
                setValues((current) => ({ ...current, [field.key]: event.target.value }));
                setErrors((current) => ({ ...current, [field.key]: undefined }));
              }}
              aria-invalid={error ? true : undefined}
              aria-describedby={error ? `${id}-error` : undefined}
            />
            {error ? (
              <p id={`${id}-error`} className="text-xs text-destructive">
                {error}
              </p>
            ) : null}
          </div>
        );
      })}
      <DialogFooter>
        <Button type="button" variant="outline" onClick={onCancel}>
          Cancel
        </Button>
        <Button type="submit">Save changes</Button>
      </DialogFooter>
    </form>
  );
}
