export interface PlannedFeature {
  title: string;
  description: string;
}

/** Lists planned measures as quiet tiles. Presentational only, so it renders on the server. */
export function PlannedFeatureGrid({ items }: { items: PlannedFeature[] }) {
  return (
    <ul className="grid gap-3 sm:grid-cols-2">
      {items.map((item) => (
        <li key={item.title} className="rounded-lg border border-line bg-surface-subtle px-4 py-3">
          <h3 className="text-sm font-semibold text-ink">{item.title}</h3>
          <p className="mt-1 text-[13px] text-ink-quiet">{item.description}</p>
        </li>
      ))}
    </ul>
  );
}
