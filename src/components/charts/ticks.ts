/**
 * Clean axis ticks from zero, stepping by 1, 2, 2.5, or 5 times a power of ten.
 * Recharts' default step produces values such as 850, 1,700, and 2,550.
 */
export function niceTicks(max: number, maxIntervals = 5): number[] {
  if (!(max > 0)) return [0, 1];

  const rough = max / maxIntervals;
  const magnitude = 10 ** Math.floor(Math.log10(rough));
  const normalized = rough / magnitude;
  const multiplier = normalized <= 1 ? 1 : normalized <= 2 ? 2 : normalized <= 2.5 ? 2.5 : normalized <= 5 ? 5 : 10;
  let step = multiplier * magnitude;

  // Whole-number data, such as lead counts, should not get fractional ticks.
  if (Number.isInteger(max) && step < 1) step = 1;

  const intervals = Math.ceil(max / step - 1e-9);
  // Rounding guards against values such as 0.30000000000000004.
  return Array.from({ length: intervals + 1 }, (_, index) => Math.round(index * step * 1e6) / 1e6);
}
