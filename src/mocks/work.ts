import type { MonthKey, RoadmapItem, Task, TaskCategory, TaskStatus } from "@/lib/types";
import { TASK_CATEGORIES } from "@/lib/types";
import { ACTIVE_MONTHS, REFERENCE_DATE, STRATEGY_MONTHS } from "./calendar";
import { createRandom, pad } from "./seed";

const TOPICS = [
  "Local SEO",
  "Paid Media",
  "Web Design",
  "Branding",
  "Email Marketing",
  "Analytics",
  "Conversion Optimization",
  "Content Strategy",
  "Social Media",
  "Reputation Management",
  "E-commerce SEO",
  "Video Marketing",
] as const;

const TECHNICAL_THEMES = [
  "crawl budget review",
  "Core Web Vitals audit",
  "structured data rollout",
  "XML sitemap cleanup",
  "redirect chain cleanup",
  "mobile usability review",
  "internal linking audit",
  "image compression pass",
  "canonical tag audit",
  "log file analysis",
  "JavaScript rendering check",
  "hreflang and indexation review",
] as const;

const ROADMAP_TITLES: Record<TaskCategory, (topic: string, technical: string) => string> = {
  "Blog Writing": (topic) => `Publish ${topic} pillar content`,
  "Landing Pages": (topic) => `Launch ${topic} service page`,
  "Technical SEO": (_, technical) => `Complete ${technical}`,
  "Keyword Research": (topic) => `Map ${topic} keyword cluster`,
  "On-Page": (topic) => `Optimize ${topic} pages`,
  "Content Updates": (topic) => `Refresh ${topic} content`,
};

const TASK_TEMPLATES: Record<TaskCategory, readonly ((topic: string, technical: string) => string)[]> = {
  "Blog Writing": [
    (topic) => `Draft ${topic} blog post`,
    (topic) => `Edit and publish ${topic} article`,
    (topic) => `Write ${topic} case study`,
  ],
  "Landing Pages": [
    (topic) => `Write ${topic} landing page copy`,
    (topic) => `Build ${topic} landing page`,
  ],
  "Technical SEO": [
    (_, technical) => `Run ${technical}`,
    (_, technical) => `Fix issues from ${technical}`,
  ],
  "Keyword Research": [
    (topic) => `Research ${topic} keywords`,
    (topic) => `Analyze competitor ${topic} rankings`,
  ],
  "On-Page": [
    (topic) => `Update ${topic} title tags and meta descriptions`,
    (topic) => `Add internal links to ${topic} pages`,
  ],
  "Content Updates": [
    (topic) => `Refresh ${topic} statistics and examples`,
    (topic) => `Consolidate overlapping ${topic} posts`,
  ],
};

const OWNERS: Record<TaskCategory, readonly string[]> = {
  "Blog Writing": ["daniel"],
  "Landing Pages": ["daniel", "tom"],
  "Technical SEO": ["priya"],
  "Keyword Research": ["maya", "tom"],
  "On-Page": ["tom"],
  "Content Updates": ["daniel", "maya"],
};

const PROJECTS: Record<TaskCategory, string> = {
  "Blog Writing": "RLA Blog",
  "Landing Pages": "RLA Website",
  "Technical SEO": "RLA Website",
  "Keyword Research": "SEO Strategy",
  "On-Page": "RLA Website",
  "Content Updates": "RLA Blog",
};

/** Share of a month's work finished, by month. Earlier months are near done. */
function completionRate(month: MonthKey): number {
  if (month >= "2026-11") return 0.15;
  if (month === "2026-10") return 0.84;
  return 0.97;
}

function buildMonth(monthIndex: number, random: ReturnType<typeof createRandom>) {
  const month = STRATEGY_MONTHS[monthIndex] as MonthKey;
  const topic = TOPICS[monthIndex % TOPICS.length] as string;
  const technical = TECHNICAL_THEMES[monthIndex % TECHNICAL_THEMES.length] as string;
  const tasks: Task[] = [];
  const items: RoadmapItem[] = [];
  const isActive = ACTIVE_MONTHS.includes(month);

  TASK_CATEGORIES.forEach((category) => {
    const itemId = `roadmap-${month}-${category.toLowerCase().replace(/[^a-z]+/g, "-")}`;
    const taskIds: string[] = [];

    if (isActive) {
      TASK_TEMPLATES[category].forEach((template, templateIndex) => {
        // Workload varies by month, but every category keeps at least one task.
        if (templateIndex > 0 && random.chance(0.2)) return;
        const id = `task-${month}-${tasks.length + 1}`;
        const dueDay = random.int(5, 28);
        const completed = random.chance(completionRate(month));
        const dueDate = `${month}-${pad(dueDay)}`;
        const status: TaskStatus = completed
          ? "completed"
          : random.chance(0.5)
            ? "in-progress"
            : "todo";
        const finished = `${month}-${pad(Math.max(1, dueDay - random.int(0, 4)))}`;
        tasks.push({
          id,
          name: template(topic, technical),
          category,
          project: PROJECTS[category],
          assigneeId: random.pick(OWNERS[category]),
          status,
          month,
          dueDate,
          // Work can never be finished after the sample data's "today".
          completedDate: completed ? (finished > REFERENCE_DATE ? REFERENCE_DATE : finished) : null,
        });
        taskIds.push(id);
      });
    }

    items.push({
      id: itemId,
      title: ROADMAP_TITLES[category](topic, technical),
      category,
      month,
      taskIds,
    });
  });

  return { tasks, items };
}

const random = createRandom(20260101);
const months = STRATEGY_MONTHS.map((_, index) => buildMonth(index, random));

export const tasks: Task[] = months.flatMap((month) => month.tasks);
export const roadmapItems: RoadmapItem[] = months.flatMap((month) => month.items);
