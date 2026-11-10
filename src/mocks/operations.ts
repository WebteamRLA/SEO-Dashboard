import type {
  AiAgent,
  BrokenLink,
  DeliveryModule,
  MonitoredForm,
  NotificationPreference,
  SiteIssue,
} from "@/lib/types";

export const monitoredForms: MonitoredForm[] = [
  { id: "form-contact", name: "Contact Form", url: "/contact", status: "healthy", lastChecked: "2026-11-06T06:00:00Z", failedSubmissions: 0, monitoring: true },
  { id: "form-audit", name: "Free SEO Audit", url: "/free-seo-audit", status: "healthy", lastChecked: "2026-11-06T06:00:00Z", failedSubmissions: 0, monitoring: true },
  { id: "form-quote", name: "Request a Quote", url: "/get-a-quote", status: "degraded", lastChecked: "2026-11-06T06:00:00Z", failedSubmissions: 2, monitoring: true },
  { id: "form-seo", name: "Service Inquiry (SEO)", url: "/services/seo", status: "healthy", lastChecked: "2026-11-06T06:00:00Z", failedSubmissions: 0, monitoring: true },
  { id: "form-web", name: "Service Inquiry (Web Design)", url: "/services/web-design", status: "failing", lastChecked: "2026-11-05T06:00:00Z", failedSubmissions: 5, monitoring: true },
  { id: "form-news", name: "Newsletter Signup", url: "/blog", status: "paused", lastChecked: "2026-10-28T06:00:00Z", failedSubmissions: 0, monitoring: false },
];

export const brokenLinks: BrokenLink[] = [
  { id: "link-1", url: "/blog/2024-seo-trends", foundOn: "/blog", statusCode: 404, firstDetected: "2026-10-29", lastChecked: "2026-11-05", status: "open" },
  { id: "link-2", url: "/services/ppc-management", foundOn: "/services", statusCode: 404, firstDetected: "2026-10-22", lastChecked: "2026-11-05", status: "in-progress" },
  { id: "link-3", url: "/case-studies/retail-growth", foundOn: "/blog/local-seo-checklist", statusCode: 410, firstDetected: "2026-10-15", lastChecked: "2026-11-05", status: "open" },
  { id: "link-4", url: "/downloads/seo-guide.pdf", foundOn: "/free-seo-audit", statusCode: 500, firstDetected: "2026-11-02", lastChecked: "2026-11-05", status: "open" },
  { id: "link-5", url: "/about/team-old", foundOn: "/about", statusCode: 404, firstDetected: "2026-09-30", lastChecked: "2026-10-20", status: "resolved" },
  { id: "link-6", url: "/blog/email-open-rates", foundOn: "/blog/how-much-does-seo-cost", statusCode: 301, firstDetected: "2026-10-08", lastChecked: "2026-10-18", status: "resolved" },
];

export const siteIssues: SiteIssue[] = [
  { id: "issue-1", name: "Form submission endpoint timing out", url: "/services/web-design", severity: "critical", detected: "2026-11-04", status: "open" },
  { id: "issue-2", name: "Largest Contentful Paint above 4 seconds", url: "/blog/how-much-does-seo-cost", severity: "high", detected: "2026-10-30", status: "in-progress" },
  { id: "issue-3", name: "Missing meta description", url: "/services/paid-media", severity: "medium", detected: "2026-10-27", status: "open" },
  { id: "issue-4", name: "Duplicate title tag", url: "/blog/local-seo-checklist", severity: "medium", detected: "2026-10-21", status: "in-progress" },
  { id: "issue-5", name: "Images missing alt text", url: "/case-studies", severity: "low", detected: "2026-10-12", status: "open" },
  { id: "issue-6", name: "Sitemap referencing redirected URLs", url: "/sitemap.xml", severity: "medium", detected: "2026-09-26", status: "resolved" },
];

export const aiAgents: AiAgent[] = [
  {
    slug: "lead-filter",
    name: "Lead Filter Agent",
    purpose: "Reviews incoming leads and separates genuine enquiries from spam, backlink offers, and junk.",
    expectedOutcome: "Courtney only spends time on genuine customer enquiries.",
    capabilities: ["Analyze new submissions", "Detect spam and backlink offers", "Move spam to the Spam stage", "Apply the Filtered by AI tag"],
    phase: "P2",
    status: "planned",
  },
  {
    slug: "broken-link",
    name: "Broken Link Agent",
    purpose: "Scans the website for broken internal and external links.",
    expectedOutcome: "Broken links are found and logged before they affect visitors or rankings.",
    capabilities: ["Scheduled site crawls", "Status code detection", "Issue Log entries", "Suggested redirect targets"],
    phase: "P3",
    status: "planned",
  },
  {
    slug: "search-console",
    name: "Search Console Agent",
    purpose: "Monitors Search Console data and highlights meaningful ranking and traffic changes.",
    expectedOutcome: "The team sees what changed in search without reading raw reports.",
    capabilities: ["Ranking change detection", "Query opportunity alerts", "Indexing issue summaries", "Monthly trend notes"],
    phase: "P3",
    status: "planned",
  },
  {
    slug: "content",
    name: "Content Agent",
    purpose: "Helps plan and refresh content using search demand and existing performance.",
    expectedOutcome: "Content work is focused on the pages most likely to bring in leads.",
    capabilities: ["Content gap analysis", "Refresh recommendations", "Outline drafting", "Internal link suggestions"],
    phase: "P3",
    status: "planned",
  },
  {
    slug: "form-test",
    name: "Form Test Agent",
    purpose: "Submits test entries to website forms to confirm they still work.",
    expectedOutcome: "A broken form is caught quickly instead of silently losing leads.",
    capabilities: ["Scheduled test submissions", "Delivery confirmation", "Failure alerts", "Form Health updates"],
    phase: "P3",
    status: "planned",
  },
  {
    slug: "report",
    name: "Report Agent",
    purpose: "Prepares monthly performance reports from SEO, lead, and revenue data.",
    expectedOutcome: "Monthly reports are ready for review without manual assembly.",
    capabilities: ["Monthly data collection", "Performance summaries", "Draft report generation", "Change highlights"],
    phase: "P3",
    status: "planned",
  },
];

const plannedSteps = (phase: "P2" | "P3", preview: boolean) => [
  { label: `${phase} page preview`, done: preview },
  { label: "Scope confirmed", done: false },
  { label: "Build and integration", done: false },
  { label: "Tested with real RLA data", done: false },
];

/** Dates stay null: the approved roadmap has no confirmed delivery dates yet. */
export const deliveryModules: DeliveryModule[] = [
  { id: "p1-setup", name: "Application setup and login", phase: "P1", plannedDate: null, status: "complete", steps: [{ label: "Frontend preview", done: true }, { label: "Database and authentication", done: true }, { label: "Subdomain and deployment", done: true }, { label: "Tested with real RLA data", done: true }] },
  { id: "p1-shell", name: "Dashboard layout and navigation", phase: "P1", plannedDate: null, status: "complete", steps: [{ label: "Frontend preview", done: true }, { label: "Permissions by role", done: true }] },
  { id: "p1-teamwork", name: "Teamwork connection", phase: "P1", plannedDate: null, status: "complete", steps: [{ label: "API access confirmed", done: true }, { label: "Projects, tasks, and statuses synced", done: true }, { label: "Tested with real RLA data", done: true }] },
  { id: "p1-work", name: "Monthly Work Tracker", phase: "P1", plannedDate: null, status: "complete", steps: [{ label: "Frontend preview", done: true }, { label: "Teamwork data connected", done: true }, { label: "Tested with real RLA data", done: true }] },
  { id: "p1-roadmap", name: "Strategy Roadmap", phase: "P1", plannedDate: null, status: "complete", steps: [{ label: "Frontend preview", done: true }] },
  { id: "p1-forms", name: "Website form connections", phase: "P1", plannedDate: null, status: "complete", steps: [{ label: "Common submission endpoint", done: true }] },
  { id: "p1-inbox", name: "Lead Inbox and Lead Details", phase: "P1", plannedDate: null, status: "complete", steps: [{ label: "Frontend preview", done: true }, { label: "Lead storage", done: true }, { label: "Tested with real RLA data", done: true }] },
  { id: "p1-pipeline", name: "Lead Pipeline", phase: "P1", plannedDate: null, status: "complete", steps: [{ label: "Frontend preview", done: true }, { label: "Stage changes saved", done: true }, { label: "Tested with real RLA data", done: true }] },
  { id: "p1-overview", name: "Overview Dashboard", phase: "P1", plannedDate: null, status: "complete", steps: [{ label: "Frontend preview", done: true }] },
  { id: "p1-delivery", name: "Delivery Roadmap and Settings", phase: "P1", plannedDate: null, status: "complete", steps: [{ label: "Frontend preview", done: true }] },
  { id: "p1-launch", name: "Testing and deployment to the RLA subdomain", phase: "P1", plannedDate: null, status: "complete", steps: [{ label: "Security and permissions review", done: true }, { label: "Production deployment", done: true }] },
  { id: "p2-google", name: "Google Search Console and GA4 connection", phase: "P2", plannedDate: null, status: "not-started", steps: [{ label: "Access confirmed", done: false }, { label: "Metrics fetched", done: false }, { label: "Displayed in Overview", done: false }] },
  { id: "p2-seo", name: "Traffic & SEO analytics", phase: "P2", plannedDate: null, status: "frontend-preview", steps: plannedSteps("P2", true) },
  { id: "p2-revenue", name: "Revenue Overview", phase: "P2", plannedDate: null, status: "frontend-preview", steps: plannedSteps("P2", true) },
  { id: "p2-health", name: "Site Health monitoring", phase: "P2", plannedDate: null, status: "frontend-preview", steps: plannedSteps("P2", true) },
  { id: "p2-reports", name: "Monthly Reports", phase: "P2", plannedDate: null, status: "frontend-preview", steps: plannedSteps("P2", true) },
  { id: "p2-spam", name: "AI spam filter", phase: "P2", plannedDate: null, status: "not-started", steps: [{ label: "Classification", done: false }, { label: "Spam stage automation", done: false }, { label: "Filtered by tags", done: false }] },
  { id: "p2-crm", name: "Two-way pipeline sync and lead gap check", phase: "P2", plannedDate: null, status: "not-started", steps: [{ label: "Pipedrive or Teamwork confirmed", done: false }, { label: "Two-way sync", done: false }, { label: "Lead gap alert", done: false }] },
  { id: "p3-behavior", name: "Behavior Analytics", phase: "P3", plannedDate: null, status: "frontend-preview", steps: plannedSteps("P3", true) },
  { id: "p3-social", name: "Social Analytics", phase: "P3", plannedDate: null, status: "frontend-preview", steps: plannedSteps("P3", true) },
  { id: "p3-agents", name: "AI Agents", phase: "P3", plannedDate: null, status: "frontend-preview", steps: plannedSteps("P3", true) },
];

export const notificationPreferences: NotificationPreference[] = [
  { id: "new-lead", label: "New lead received", description: "When a website form submission arrives.", email: true, inApp: true, available: true, phase: "P1" },
  { id: "lead-gap", label: "Lead missing from pipeline", description: "When a lead is in the inbox but not in the external pipeline.", email: false, inApp: false, available: false, phase: "P2" },
  { id: "form-failure", label: "Form failure", description: "When a monitored form stops working.", email: false, inApp: false, available: false, phase: "P2" },
  { id: "broken-link", label: "New broken link", description: "When monitoring finds a broken link.", email: false, inApp: false, available: false, phase: "P2" },
  { id: "report-ready", label: "Monthly report ready", description: "When a monthly report is ready to review.", email: false, inApp: false, available: false, phase: "P2" },
  { id: "agent-activity", label: "AI agent activity", description: "When an agent completes a task or needs review.", email: false, inApp: false, available: false, phase: "P3" },
];

