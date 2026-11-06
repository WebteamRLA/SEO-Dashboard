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
import { parseDealValue } from "./lead-logic";

/**
 * Asks for the deal value before a lead can be marked Won. Closing it any way
 * other than confirming leaves the lead where it was.
 */
export function DealValueDialog({
  open,
  onOpenChange,
  leadName,
  initialValue,
  onConfirm,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  leadName: string;
  initialValue: number | null;
  onConfirm: (dealValue: number) => void;
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-sm">
        <DealValueForm
          leadName={leadName}
          initialValue={initialValue}
          onCancel={() => onOpenChange(false)}
          onConfirm={(value) => {
            onConfirm(value);
            onOpenChange(false);
          }}
        />
      </DialogContent>
    </Dialog>
  );
}

// Mounted only while the dialog is open, so the field starts fresh each time.
function DealValueForm({
  leadName,
  initialValue,
  onCancel,
  onConfirm,
}: {
  leadName: string;
  initialValue: number | null;
  onCancel: () => void;
  onConfirm: (value: number) => void;
}) {
  const inputId = useId();
  const errorId = `${inputId}-error`;
  const [text, setText] = useState(initialValue ? String(initialValue) : "");
  const [error, setError] = useState<string | null>(null);

  function submit(event: FormEvent) {
    event.preventDefault();
    const value = parseDealValue(text);
    if (value === null) {
      setError("Enter a deal value greater than zero, for example 12500.");
      return;
    }
    onConfirm(value);
  }

  return (
    <form onSubmit={submit} noValidate className="flex flex-col gap-4">
      <DialogHeader>
        <DialogTitle>Mark as Won</DialogTitle>
        <DialogDescription>
          Enter the value of the deal with {leadName}. A Won lead needs a value.
        </DialogDescription>
      </DialogHeader>
      <div className="flex flex-col gap-1.5">
        <Label htmlFor={inputId}>Deal value (USD)</Label>
        <Input
          id={inputId}
          inputMode="decimal"
          autoComplete="off"
          value={text}
          onChange={(event) => {
            setText(event.target.value);
            setError(null);
          }}
          aria-invalid={error ? true : undefined}
          aria-describedby={error ? errorId : undefined}
        />
        {error ? (
          <p id={errorId} className="text-xs text-destructive">
            {error}
          </p>
        ) : null}
      </div>
      <DialogFooter>
        <Button type="button" variant="outline" onClick={onCancel}>
          Cancel
        </Button>
        <Button type="submit">Mark as Won</Button>
      </DialogFooter>
    </form>
  );
}
