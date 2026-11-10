import {
  Activity,
  BarChart3,
  Bot,
  CircleDollarSign,
  ClipboardList,
  FileText,
  LayoutDashboard,
  Map,
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
  /** The topbar date range filter applies to this page. */
  periodScoped?: boolean;
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
    items: [{ label: "Overview", href: "/overview", periodScoped: true }],
  },
  {
    id: "work",
    label: "Work",
    icon: ClipboardList,
    items: [{ label: "Monthly Work Tracker", href: "/work", periodScoped: true }],
  },
  {
    id: "roadmap",
    label: "SEO Roadmap",
    icon: Map,
    items: [{ label: "Strategy Roadmap", href: "/roadmap", periodScoped: true }],
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
      { label: "SEO Overview", href: "/traffic-seo", phase: "P2", periodScoped: true },
      { label: "Search Performance", href: "/traffic-seo/search-performance", phase: "P2", periodScoped: true },
      { label: "Visitors & Traffic", href: "/traffic-seo/visitors", phase: "P2", periodScoped: true },
      { label: "Behavior Analytics", href: "/traffic-seo/behavior", phase: "P3" },
      { label: "Social Analytics", href: "/traffic-seo/social", phase: "P3" },
    ],
  },
  {
    id: "revenue",
    label: "Revenue",
    icon: CircleDollarSign,
    items: [{ label: "Revenue Overview", href: "/revenue", phase: "P2", periodScoped: true }],
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
      { label: "Lead Filter Agent", href: "/ai-agents/lead-filter", phase: "P2" },
      { label: "Report Agent", href: "/ai-agents/report", phase: "P3" },
    ],
  },
  {
    id: "settings",
    label: "Settings",
    icon: Settings,
    items: [
      { label: "Team & Access", href: "/settings/team" },
      { label: "Notifications", href: "/settings/notifications" },
      { label: "Delivery Roadmap", href: "/settings/delivery-roadmap" },
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
