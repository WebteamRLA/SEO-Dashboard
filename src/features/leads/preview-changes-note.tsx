/** Lead edits apply across the dashboard but are not stored yet. Say so. */
export function PreviewChangesNote() {
  return (
    <p className="text-xs text-muted-foreground">
      Changes apply across this preview and last until the page is reloaded. Nothing is saved yet.
    </p>
  );
}
