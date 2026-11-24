import { Bot, FileText, Filter, PenLine, TrendingUp, Link2Off, ClipboardCheck, type LucideIcon } from "lucide-react";
import type { AiAgent } from "@/lib/types";

/** Icon square colours and the page where each agent's results will appear. */
type AgentVisual = { icon: LucideIcon; bg: string; fg: string; resultsLabel: string; resultsHref: string };

const FALLBACK: AgentVisual = { icon: Bot, bg: "#EEF2FF", fg: "#4F46E5", resultsLabel: "AI agents", resultsHref: "/ai-agents" };

const VISUALS: Record<string, AgentVisual> = {
  "lead-filter": { icon: Filter, bg: "#E6F2FD", fg: "#0070C9", resultsLabel: "Leads", resultsHref: "/leads" },
  "broken-link": { icon: Link2Off, bg: "#E3F7EC", fg: "#0F8A4F", resultsLabel: "Broken links", resultsHref: "/site-health/broken-links" },
  "search-console": { icon: TrendingUp, bg: "#FEF3DC", fg: "#B45309", resultsLabel: "Search performance", resultsHref: "/traffic-seo/search-performance" },
  content: { icon: PenLine, bg: "#FDE8EC", fg: "#C0263F", resultsLabel: "Tasks", resultsHref: "/work" },
  "form-test": { icon: ClipboardCheck, bg: "#EFE6FB", fg: "#7C3AED", resultsLabel: "Form health", resultsHref: "/site-health/forms" },
  report: { icon: FileText, bg: "#E8EBFB", fg: "#4457C9", resultsLabel: "Reports", resultsHref: "/reports" },
};

export function agentVisual(slug: AiAgent["slug"]): AgentVisual {
  return VISUALS[slug] ?? FALLBACK;
}


