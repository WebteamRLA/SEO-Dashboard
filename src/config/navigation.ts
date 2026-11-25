import {
  Activity,
  Bot,
  ChartNoAxesColumn,
  CircleDollarSign,
  FileText,
  House,
  Inbox,
  Map,
  Settings,
  SquareCheck,
  TrendingUp,
  type LucideIcon,
} from "lucide-react";
import type { Phase } from "@/lib/types";

export interface NavItem {
  label: string;
  href: string;
  /** Shorter name for the section tab bar, when the page shows one. */
  tabLabel?: string;
  /** Shown as a chip for pages not yet delivered. P1 pages carry none. */
  phase?: Phase;
  /** The topbar date range filter applies to this page. */
  periodScoped?: boolean;
}

/** The sidebar sections. The footer section is pinned to the bottom of the sidebar. */
export type NavSection = "main" | "results" | "work" | "reports" | "footer";

export const NAV_SECTION_LABEL: Partial<Record<NavSection, string>> = {
  results: "Results",
  work: "SEO work",
};

export interface NavGroup {
  id: string;
  label: string;
  icon: LucideIcon;
  section: NavSection;
  /**
   * The routes this sidebar link owns. The first is where the link goes. With
   * `tabs`, the pages render a tab bar so every route stays one click away.
   */
  items: NavItem[];
  tabs?: boolean;
  /** Chip on the sidebar link itself, for a section that is not delivered yet. */
  phase?: Phase;
}

export const NAVIGATION: NavGroup[] = [
  {
    id: "overview",
    label: "Overview",
    icon: House,
    section: "main",
    items: [{ label: "Overview", href: "/overview", periodScoped: true }],
  },
  {
    id: "search",
    label: "Search performance",
    icon: TrendingUp,
    section: "results",
    items: [{ label: "Search Performance", href: "/traffic-seo/search-performance", periodScoped: true }],
  },
  {
    id: "traffic",
    label: "Traffic",
    icon: ChartNoAxesColumn,
    section: "results",
    // One page, as in the design: no Visitors / Behavior / Social tabs.
    items: [{ label: "Traffic", href: "/traffic-seo", periodScoped: true }],
  },
  {
    id: "leads",
    label: "Leads",
    icon: Inbox,
    section: "results",
    // List and Pipeline switch with a toggle inside the page, as in the design.
    items: [
      { label: "Lead Inbox", tabLabel: "List", href: "/leads", periodScoped: true },
      { label: "Lead Pipeline", tabLabel: "Pipeline", href: "/leads/pipeline", periodScoped: true },
    ],
  },
  {
    id: "revenue",
    label: "Revenue",
    icon: CircleDollarSign,
    section: "results",
    phase: "P2",
    items: [{ label: "Revenue Overview", href: "/revenue", phase: "P2", periodScoped: true }],
  },
  {
    id: "site-health",
    label: "Site health",
    icon: Activity,
    section: "results",
    // One page, as in the design: speed, indexing and the weekly site check.
    items: [{ label: "Site health", href: "/site-health" }],
  },
  {
    id: "work",
    label: "Tasks",
    icon: SquareCheck,
    section: "work",
    items: [{ label: "Monthly Work Tracker", href: "/work", periodScoped: true }],
  },
  {
    id: "roadmap",
    label: "Roadmap",
    icon: Map,
    section: "work",
    items: [{ label: "Strategy Roadmap", href: "/roadmap" }],
  },
  {
    id: "ai-agents",
    label: "AI agents",
    icon: Bot,
    section: "work",
    phase: "P3",
    // Each agent opens from its card on the overview page.
    items: [
      { label: "AI Agents Overview", href: "/ai-agents", phase: "P3" },
      { label: "Broken Link Agent", href: "/ai-agents/broken-link", phase: "P3" },
      { label: "Search Console Agent", href: "/ai-agents/search-console", phase: "P3" },
      { label: "Content Agent", href: "/ai-agents/content", phase: "P3" },
      { label: "Form Test Agent", href: "/ai-agents/form-test", phase: "P3" },
      { label: "Lead Filter Agent", href: "/ai-agents/lead-filter", phase: "P2" },
      { label: "Report Agent", href: "/ai-agents/report", phase: "P3" },
    ],
  },
  {
    id: "reports",
    label: "Reports",
    icon: FileText,
    section: "reports",
    items: [{ label: "Monthly Reports", href: "/reports" }],
  },
  {
    id: "settings",
    label: "Settings",
    icon: Settings,
    section: "footer",
    tabs: true,
    items: [
      { label: "Team & Access", tabLabel: "Team", href: "/settings/team" },
      { label: "Notifications", href: "/settings/notifications" },
      { label: "Delivery Roadmap", tabLabel: "Delivery roadmap", href: "/settings/delivery-roadmap" },
    ],
  },
];

export interface ActiveNav {
  group: NavGroup;
  item: NavItem;
}

/**
 * Finds the nav entry for a path. The longest matching href wins, so
 * `/leads/pipeline` resolves to the pipeline and `/leads/abc` to the inbox.
 */
export function findActiveNav(pathname: string): ActiveNav | null {
  let best: ActiveNav | null = null;
  for (const group of NAVIGATION) {
    for (const item of group.items) {
      const matches = pathname === item.href || pathname.startsWith(`${item.href}/`);
      if (matches && (!best || item.href.length > best.item.href.length)) {
        best = { group, item };
      }
    }
  }
  return best;
}

/** The tab bar for a sectioned page, or null when the page has none. */
export function findSectionTabs(pathname: string): { group: NavGroup; activeHref: string } | null {
  const active = findActiveNav(pathname);
  if (!active?.group.tabs) return null;
  return { group: active.group, activeHref: active.item.href };
}
