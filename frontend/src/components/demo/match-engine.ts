/**
 * Local match engine — runs entirely in the browser, no backend needed.
 * Produces realistic, explainable scores so the demo feels honest.
 */

export type Skill = {
  id: string;
  label: string;
  category: "frontend" | "backend" | "design" | "data" | "devops" | "mobile";
};

export type Job = {
  id: string;
  title: string;
  company: string;
  location: string;
  required: string[]; // skill IDs
  nice: string[];
  level: "intern" | "junior" | "mid";
  salary: string;
  trustScore: number;
};

export type MatchResult = {
  job: Job;
  score: number; // 0-100
  matched: string[]; // skill labels that hit
  partial: string[]; // nice-to-have hits
  gaps: string[]; // missing required
  reasons: { type: "match" | "gap" | "trust"; text: string }[];
};

export const SKILLS: Skill[] = [
  { id: "react",      label: "React",       category: "frontend" },
  { id: "typescript", label: "TypeScript",  category: "frontend" },
  { id: "nextjs",     label: "Next.js",     category: "frontend" },
  { id: "vue",        label: "Vue",         category: "frontend" },
  { id: "tailwind",   label: "Tailwind",    category: "frontend" },
  { id: "css",        label: "CSS",         category: "frontend" },

  { id: "python",     label: "Python",      category: "backend"  },
  { id: "django",     label: "Django",      category: "backend"  },
  { id: "fastapi",    label: "FastAPI",     category: "backend"  },
  { id: "node",       label: "Node.js",     category: "backend"  },
  { id: "java",       label: "Java",        category: "backend"  },

  { id: "sql",        label: "SQL",         category: "data"     },
  { id: "postgres",   label: "PostgreSQL",  category: "data"     },
  { id: "pandas",     label: "Pandas",      category: "data"     },

  { id: "figma",      label: "Figma",       category: "design"   },
  { id: "sketch",     label: "Sketch",      category: "design"   },
  { id: "ui-ux",      label: "UI/UX",       category: "design"   },

  { id: "docker",     label: "Docker",      category: "devops"   },
  { id: "aws",        label: "AWS",         category: "devops"   },
  { id: "git",        label: "Git",         category: "devops"   },

  { id: "react-native", label: "React Native", category: "mobile" },
  { id: "swift",        label: "Swift",        category: "mobile" },
];

export const JOBS: Job[] = [
  {
    id: "uzum-frontend",
    title: "Junior Frontend Developer",
    company: "Uzum Market",
    location: "Toshkent · Hybrid",
    required: ["react", "typescript", "css"],
    nice: ["nextjs", "tailwind"],
    level: "junior",
    salary: "$700-1200",
    trustScore: 88,
  },
  {
    id: "epam-fe",
    title: "Frontend Trainee",
    company: "EPAM",
    location: "Toshkent · Onsite",
    required: ["react", "typescript"],
    nice: ["tailwind", "css", "git"],
    level: "junior",
    salary: "$500-900",
    trustScore: 92,
  },
  {
    id: "tbc-product",
    title: "Product Designer",
    company: "TBC Bank",
    location: "Toshkent · Onsite",
    required: ["figma", "ui-ux"],
    nice: ["sketch", "css"],
    level: "junior",
    salary: "$800-1400",
    trustScore: 86,
  },
  {
    id: "click-backend",
    title: "Python Backend Junior",
    company: "Click",
    location: "Toshkent · Remote",
    required: ["python", "django", "sql"],
    nice: ["postgres", "docker"],
    level: "junior",
    salary: "$700-1100",
    trustScore: 84,
  },
  {
    id: "payme-fullstack",
    title: "Fullstack Engineer",
    company: "Payme",
    location: "Toshkent · Hybrid",
    required: ["react", "node", "sql"],
    nice: ["typescript", "postgres", "docker"],
    level: "junior",
    salary: "$900-1500",
    trustScore: 89,
  },
  {
    id: "humans-data",
    title: "Junior Data Analyst",
    company: "Humans",
    location: "Toshkent · Onsite",
    required: ["sql", "python"],
    nice: ["pandas", "postgres"],
    level: "junior",
    salary: "$600-900",
    trustScore: 81,
  },
  {
    id: "korzinka-mobile",
    title: "Mobile Engineer (RN)",
    company: "Korzinka",
    location: "Toshkent · Onsite",
    required: ["react-native", "typescript"],
    nice: ["react", "git"],
    level: "junior",
    salary: "$800-1300",
    trustScore: 85,
  },
];

/**
 * Score a job against selected skill IDs.
 * Formula:
 *   - 60 base if any required skill matches
 *   - +12 per required-skill match (capped at full required count)
 *   - +6 per nice-to-have match
 *   - +(trustScore - 80) * 0.5 trust modifier
 *   - clamped to 5-99 to feel realistic
 */
export function scoreJob(job: Job, selected: string[], locale: "uz" | "ru" = "uz"): MatchResult {
  const selSet = new Set(selected);
  const matched = job.required.filter((r) => selSet.has(r));
  const partial = job.nice.filter((n) => selSet.has(n));
  const gaps = job.required.filter((r) => !selSet.has(r));

  let score = 5;
  if (matched.length > 0) {
    score = 60;
    score += matched.length * (40 / Math.max(job.required.length, 1));
    score += partial.length * 5;
    score += (job.trustScore - 80) * 0.4;
  } else {
    // No required match — still give partial credit for related skills
    score = Math.min(35, partial.length * 8);
  }
  score = Math.max(5, Math.min(99, Math.round(score)));

  const skillLabel = (id: string) =>
    SKILLS.find((s) => s.id === id)?.label ?? id;

  const ru = locale === "ru";
  const reasons: MatchResult["reasons"] = [];
  if (matched.length > 0) {
    reasons.push({
      type: "match",
      text: ru
        ? `Совпало ${matched.length} требуемых навыков: ${matched.map(skillLabel).join(", ")}`
        : `${matched.length} ta talab qilingan ko'nikma mos: ${matched.map(skillLabel).join(", ")}`,
    });
  }
  if (partial.length > 0) {
    reasons.push({
      type: "match",
      text: ru
        ? `Бонусные навыки: ${partial.map(skillLabel).join(", ")}`
        : `Bonus ko'nikma${partial.length > 1 ? "lar" : ""}: ${partial.map(skillLabel).join(", ")}`,
    });
  }
  if (gaps.length > 0 && matched.length > 0) {
    reasons.push({
      type: "gap",
      text: ru
        ? `Стоит подтянуть: ${gaps.map(skillLabel).join(", ")}`
        : `O'rganish kerak: ${gaps.map(skillLabel).join(", ")}`,
    });
  }
  if (job.trustScore >= 85) {
    reasons.push({
      type: "trust",
      text: ru
        ? `Trust Score ${job.trustScore} — проверенная компания`
        : `Trust Score ${job.trustScore} — tasdiqlangan kompaniya`,
    });
  }

  return {
    job,
    score,
    matched: matched.map(skillLabel),
    partial: partial.map(skillLabel),
    gaps: gaps.map(skillLabel),
    reasons,
  };
}

/** Top-N matches sorted by score. */
export function topMatches(selected: string[], n = 3, locale: "uz" | "ru" = "uz"): MatchResult[] {
  if (selected.length === 0) return [];
  return JOBS.map((j) => scoreJob(j, selected, locale))
    .sort((a, b) => b.score - a.score)
    .slice(0, n);
}

/**
 * Generate the AI "thinking" trace given selected skills.
 * Returns an array of strings — one per line — to be typewritten.
 */
export function generateThoughts(selected: string[], locale: "uz" | "ru" = "uz"): string[] {
  if (selected.length === 0) return [];

  const skillLabel = (id: string) => SKILLS.find((s) => s.id === id)?.label ?? id;
  const categories = new Set(
    selected
      .map((id) => SKILLS.find((s) => s.id === id)?.category)
      .filter((c): c is Skill["category"] => Boolean(c))
  );
  const stack =
    categories.has("frontend") && categories.has("backend")
      ? "Fullstack"
      : categories.has("frontend")
      ? "Frontend"
      : categories.has("backend")
      ? "Backend"
      : categories.has("design")
      ? "Design"
      : categories.has("data")
      ? "Data"
      : categories.has("mobile")
      ? "Mobile"
      : "General tech";

  const seniority =
    selected.length >= 5 ? "Mid-junior" : selected.length >= 3 ? "Junior" : "Intern";

  if (locale === "ru") {
    return [
      `> Навыки: ${selected.map(skillLabel).join(", ")}`,
      `> Профиль стека: ${stack}`,
      `> Оценка уровня: ${seniority}`,
      `> Ищу подходящие роли среди 500+ проверенных компаний…`,
      `> Фильтрую по Trust Score ≥ 80…`,
      `> Считаю объяснимые match-скоры…`,
      `✓ Топ-3 совпадения готовы.`,
    ];
  }
  return [
    `> Aniqlangan ko'nikmalar: ${selected.map(skillLabel).join(", ")}`,
    `> Stack profili: ${stack}`,
    `> Taxminiy daraja: ${seniority}`,
    `> 500+ tasdiqlangan kompaniya bo'ylab mos rollarni qidiryapman…`,
    `> Trust Score ≥ 80 bo'yicha filtrlanyapti…`,
    `> Tushuntiriladigan match ballari hisoblanyapti…`,
    `✓ Eng mos 3 ta vakansiya topildi.`,
  ];
}
