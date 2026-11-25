/**
 * Runs `task` over `items` with at most `limit` running at once, keeping input
 * order in the results. Keeps the site check and URL inspections polite to the
 * website and inside Google's per-minute quota.
 */
export async function mapLimit<T, R>(items: readonly T[], limit: number, task: (item: T, index: number) => Promise<R>): Promise<R[]> {
  const results = new Array<R>(items.length);
  let next = 0;
  async function worker() {
    while (next < items.length) {
      const index = next++;
      results[index] = await task(items[index]!, index);
    }
  }
  await Promise.all(Array.from({ length: Math.min(limit, items.length) }, worker));
  return results;
}
