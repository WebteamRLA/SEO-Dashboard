export interface PlannedFeature {
  title: string;
  description: string;
}

/** Lists planned measures as cards. Presentational only, so it renders on the server. */
export function PlannedFeatureGrid({ items }: { items: PlannedFeature[] }) {
  return (
    <ul className="grid gap-3 sm:grid-cols-2">
      {items.map((item) => (
        <li key={item.title} className="rounded-lg border border-border bg-card p-4">
          <h3 className="text-sm font-medium">{item.title}</h3>
          <p className="mt-1 text-sm text-muted-foreground">{item.description}</p>
        </li>
      ))}
    </ul>
  );
}
