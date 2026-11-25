import type {
  AiAgent,
  DeliveryModule,
  NotificationPreference,
} from "@/lib/types";

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
  { id: "p2-google", name: "Google Search Console and GA4 connection", phase: "P2", plannedDate: null, status: "in-progress", steps: [{ label: "Access confirmed", done: true }, { label: "Metrics fetched", done: true }, { label: "Displayed in Overview", done: false }] },
  { id: "p2-seo", name: "Traffic & SEO analytics", phase: "P2", plannedDate: null, status: "in-progress", steps: [{ label: "P2 page preview", done: true }, { label: "Scope confirmed", done: false }, { label: "Build and integration", done: true }, { label: "Tested with real RLA data", done: true }] },
  { id: "p2-revenue", name: "Revenue Overview", phase: "P2", plannedDate: null, status: "frontend-preview", steps: plannedSteps("P2", true) },
  { id: "p2-health", name: "Site Health monitoring", phase: "P2", plannedDate: null, status: "frontend-preview", steps: plannedSteps("P2", true) },
  { id: "p2-reports", name: "Monthly Reports", phase: "P2", plannedDate: null, status: "in-progress", steps: [{ label: "P2 page preview", done: true }, { label: "Report from live data (search, traffic, enquiries, leads, work, strategy)", done: true }, { label: "Notes, finalise and print", done: true }, { label: "Revenue and site health sections", done: false }, { label: "Email delivery and report-ready alert", done: false }] },
  { id: "p2-spam", name: "AI spam filter", phase: "P2", plannedDate: null, status: "not-started", steps: [{ label: "Classification", done: false }, { label: "Spam stage automation", done: false }, { label: "Filtered by tags", done: false }] },
  { id: "p2-crm", name: "Two-way pipeline sync and lead gap check", phase: "P2", plannedDate: null, status: "not-started", steps: [{ label: "Pipedrive or Teamwork confirmed", done: false }, { label: "Two-way sync", done: false }, { label: "Lead gap alert", done: false }] },
  { id: "p3-behavior", name: "Behavior Analytics", phase: "P3", plannedDate: null, status: "in-progress", steps: [{ label: "P3 page preview", done: true }, { label: "Scope confirmed", done: false }, { label: "Build and integration", done: true }, { label: "Tested with real RLA data", done: true }] },
  { id: "p3-social", name: "Social Analytics", phase: "P3", plannedDate: null, status: "in-progress", steps: [{ label: "P3 page preview", done: true }, { label: "Website visits from social (GA4)", done: true }, { label: "Facebook Page connected", done: false }, { label: "LinkedIn page connected", done: false }] },
  { id: "p3-agents", name: "AI Agents", phase: "P3", plannedDate: null, status: "frontend-preview", steps: plannedSteps("P3", true) },
];

export const notificationPreferences: NotificationPreference[] = [
  { id: "new-lead", label: "New lead received", description: "When a new card is added to the Teamwork Pipeline board. Shown in the bell; no email is sent.", email: false, emailAvailable: false, inApp: true, available: true, phase: "P1" },
  { id: "lead-gap", label: "Lead missing from pipeline", description: "When a lead is in the inbox but not in the external pipeline.", email: false, inApp: false, available: false, phase: "P2" },
  { id: "form-failure", label: "Form failure", description: "When a monitored form stops working.", email: false, inApp: false, available: false, phase: "P2" },
  { id: "broken-link", label: "New broken link", description: "When monitoring finds a broken link.", email: false, inApp: false, available: false, phase: "P2" },
  { id: "report-ready", label: "Monthly report ready", description: "When a monthly report is ready to review.", email: false, inApp: false, available: false, phase: "P2" },
  { id: "agent-activity", label: "AI agent activity", description: "When an agent completes a task or needs review.", email: false, inApp: false, available: false, phase: "P3" },
];

