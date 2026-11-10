/**
 * Leads are real, but edits are not stored until two-way sync with Courtney's
 * sheet exists: a saved edit would be overwritten by the next sheet import.
 */
export function PreviewChangesNote() {
  return (
    <p className="text-xs text-muted-foreground">
      Leads come from Courtney&apos;s Google Sheet. Changes made here are not saved yet: they last until the page is
      reloaded, and the sheet stays the record until two-way sync is switched on.
    </p>
  );
}
