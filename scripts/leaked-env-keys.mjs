/** Variable names that are safe to ship in a Worker. */
const isPublic = (key) => key.startsWith("NEXT_PUBLIC_");

/** Non-public keys in the adapter's per-mode env maps, such as `production`. */
export function findLeakedKeys(envByMode) {
  const keys = Object.values(envByMode).flatMap((vars) => Object.keys(vars ?? {}));
  return [...new Set(keys)].filter((key) => !isPublic(key)).sort();
}
