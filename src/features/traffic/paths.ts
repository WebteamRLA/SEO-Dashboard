/** Longest page path shown in full; longer ones are cut so tables never scroll sideways. */
export const MAX_PATH_CHARS = 48;

/**
 * Cuts the middle out of a long path: "/blog/12-best-saas-mar…-of-your-startup/".
 * The end stays visible because that is usually what tells two pages apart.
 */
export function shortenMiddle(text: string, max = MAX_PATH_CHARS): string {
  if (text.length <= max) return text;
  const keep = max - 1;
  const head = Math.ceil(keep / 2);
  return `${text.slice(0, head)}…${text.slice(text.length - (keep - head))}`;
}
