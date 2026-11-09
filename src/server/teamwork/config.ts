import "server-only";

export interface TeamworkConfig {
  baseUrl: string;
  apiKey: string;
  /** The RLA SEO project in Teamwork. */
  projectId: string;
  /** Tasks carrying this tag are the SEO work shown in the Work Tracker. */
  seoTagName: string;
}

export class TeamworkConfigError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "TeamworkConfigError";
  }
}

/** Reads Teamwork settings from the environment. Throws a clear, secret-free error if unset. */
export function getTeamworkConfig(): TeamworkConfig {
  const baseUrl = process.env.TEAMWORK_BASE_URL?.trim().replace(/\/$/, "");
  const apiKey = process.env.TEAMWORK_API_KEY?.trim();
  if (!baseUrl || !apiKey) {
    throw new TeamworkConfigError(
      "Teamwork is not configured. Set TEAMWORK_BASE_URL and TEAMWORK_API_KEY in .dev.vars.",
    );
  }
  return {
    baseUrl,
    apiKey,
    projectId: process.env.TEAMWORK_SEO_PROJECT_ID?.trim() || "719913",
    seoTagName: process.env.TEAMWORK_SEO_TAG?.trim() || "SEOTeam",
  };
}
