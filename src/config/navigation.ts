import {
  Activity,
  BarChart3,
  Bot,
  CircleDollarSign,
  ClipboardList,
  FileText,
  LayoutDashboard,
  Map,
  Rocket,
  Settings,
  Users,
  type LucideIcon,
} from "lucide-react";
import type { Phase } from "@/lib/types";

export interface NavItem {
  label: string;
  href: string;
  /** Shown as a chip for pages not yet delivered. P1 pages carry none. */
  phase?: Phase;
  /** The topbar month selector applies to this page. */
  monthScoped?: boolean;
}

export interface NavGroup {
  id: string;
  label: string;
  icon: LucideIcon;
  /** A group with one item renders as a plain link. */
  items: NavItem[];
}

export const NAVIGATION: NavGroup[] = [
  {
    id: "overview",
    label: "Overview",
    icon: LayoutDashboard,
    items: [{ label: "Overview", href: "/overview", monthScoped: true }],
  },
  {
    id: "work",
    label: "Work",
    icon: ClipboardList,
    items: [{ label: "Monthly Work Tracker", href: "/work", monthScoped: true }],
  },
  {
    id: "roadmap",
    label: "Roadmap",
    icon: Map,
    items: [{ label: "Strategy Roadmap", href: "/roadmap", monthScoped: true }],
  },
  {
    id: "leads",
    label: "Leads",
    icon: Users,
    items: [
      { label: "Lead Inbox", href: "/leads" },
      { label: "Lead Pipeline", href: "/leads/pipeline" },
    ],
  },
  {
    id: "traffic",
    label: "Traffic & SEO",
    icon: BarChart3,
    items: [
      { label: "SEO Overview", href: "/traffic-seo", phase: "P2", monthScoped: true },
      { label: "Search Performance", href: "/traffic-seo/search-performance", phase: "P2", monthScoped: true },
      { label: "Visitors & Traffic", href: "/traffic-seo/visitors", phase: "P2", monthScoped: true },
      { label: "Behavior Analytics", href: "/traffic-seo/behavior", phase: "P3" },
      { label: "Social Analytics", href: "/traffic-seo/social", phase: "P3" },
    ],
  },
  {
    id: "revenue",
    label: "Revenue",
    icon: CircleDollarSign,
    items: [{ label: "Revenue Overview", href: "/revenue", phase: "P2", monthScoped: true }],
  },
  {
    id: "site-health",
    label: "Site Health",
    icon: Activity,
    items: [
      { label: "Form Health", href: "/site-health/forms", phase: "P2" },
      { label: "Broken Links", href: "/site-health/broken-links", phase: "P2" },
      { label: "Issue Log", href: "/site-health/issues", phase: "P2" },
    ],
  },
  {
    id: "reports",
    label: "Reports",
    icon: FileText,
    items: [{ label: "Monthly Reports", href: "/reports", phase: "P2" }],
  },
  {
    id: "ai-agents",
    label: "AI Agents",
    icon: Bot,
    items: [
      { label: "AI Agents Overview", href: "/ai-agents", phase: "P3" },
      { label: "Broken Link Agent", href: "/ai-agents/broken-link", phase: "P3" },
      { label: "Search Console Agent", href: "/ai-agents/search-console", phase: "P3" },
      { label: "Content Agent", href: "/ai-agents/content", phase: "P3" },
      { label: "Form Test Agent", href: "/ai-agents/form-test", phase: "P3" },
      { label: "Lead Filter Agent", href: "/ai-agents/lead-filter", phase: "P1" },
      { label: "Report Agent", href: "/ai-agents/report", phase: "P3" },
    ],
  },
  {
    id: "delivery",
    label: "Delivery Roadmap",
    icon: Rocket,
    items: [{ label: "Delivery Roadmap", href: "/delivery-roadmap" }],
  },
  {
    id: "settings",
    label: "Settings",
    icon: Settings,
    items: [
      { label: "Integrations", href: "/settings/integrations" },
      { label: "Forms Setup", href: "/settings/forms" },
      { label: "Team & Access", href: "/settings/team" },
      { label: "Notifications", href: "/settings/notifications" },
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
