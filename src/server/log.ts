/**
 * A loggable summary of an error: its name and code only. Database error
 * messages can quote the values of the failed call, which may be a lead's
 * name or email, so they never go to the logs.
 */
export function describeError(error: unknown): string {
  if (!(error instanceof Error)) return "unknown error";
  const code = (error as { code?: unknown }).code;
  return typeof code === "string" || typeof code === "number" ? `${error.name} (${code})` : error.name;
}
