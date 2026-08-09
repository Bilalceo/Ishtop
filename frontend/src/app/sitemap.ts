import type { MetadataRoute } from "next";

const siteUrl = process.env.NEXT_PUBLIC_FRONTEND_URL?.trim().replace(/\/+$/, "") || "http://localhost:3000";
const apiBase = process.env.NEXT_PUBLIC_API_URL?.trim().replace(/\/+$/, "");

// Public marketing / info pages that should always be indexed.
const STATIC_PATHS: { path: string; priority: number; freq: MetadataRoute.Sitemap[number]["changeFrequency"] }[] = [
  { path: "/", priority: 1, freq: "daily" },
  { path: "/about", priority: 0.7, freq: "monthly" },
  { path: "/business", priority: 0.8, freq: "monthly" },
  { path: "/plans", priority: 0.6, freq: "monthly" },
  { path: "/pricing", priority: 0.6, freq: "monthly" },
  { path: "/ai", priority: 0.6, freq: "monthly" },
  { path: "/demo", priority: 0.5, freq: "monthly" },
  { path: "/login", priority: 0.4, freq: "yearly" },
  { path: "/register", priority: 0.6, freq: "yearly" },
  { path: "/privacy", priority: 0.3, freq: "yearly" },
  { path: "/terms", priority: 0.3, freq: "yearly" },
  { path: "/contact", priority: 0.4, freq: "yearly" },
];

/**
 * Pull real, active slugs from the public jobs API so the sitemap only lists
 * discovery pages that actually resolve (no dead URLs submitted to Google).
 */
async function fetchDiscoverySlugs(): Promise<{ cities: string[]; professions: string[]; companies: string[] }> {
  const empty = { cities: [], professions: [], companies: [] };
  if (!apiBase) return empty;
  try {
    const res = await fetch(`${apiBase}/jobs?page=1&limit=200`, { next: { revalidate: 3600 } });
    if (!res.ok) return empty;
    const data = await res.json();
    const jobs: any[] = Array.isArray(data?.jobs) ? data.jobs : [];
    const cities = new Set<string>();
    const professions = new Set<string>();
    const companies = new Set<string>();
    for (const job of jobs) {
      if (job?.city_slug) cities.add(String(job.city_slug));
      if (job?.profession_slug) professions.add(String(job.profession_slug));
      if (job?.company_slug) companies.add(String(job.company_slug));
    }
    return {
      cities: [...cities],
      professions: [...professions],
      companies: [...companies],
    };
  } catch {
    return empty;
  }
}

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const now = new Date();

  const staticEntries: MetadataRoute.Sitemap = STATIC_PATHS.map(({ path, priority, freq }) => ({
    url: `${siteUrl}${path}`,
    lastModified: now,
    changeFrequency: freq,
    priority,
  }));

  const { cities, professions, companies } = await fetchDiscoverySlugs();

  const discoveryEntries: MetadataRoute.Sitemap = [
    ...cities.map((slug) => ({
      url: `${siteUrl}/jobs/city/${slug}`,
      lastModified: now,
      changeFrequency: "daily" as const,
      priority: 0.8,
    })),
    ...professions.map((slug) => ({
      url: `${siteUrl}/jobs/profession/${slug}`,
      lastModified: now,
      changeFrequency: "daily" as const,
      priority: 0.8,
    })),
    ...companies.map((slug) => ({
      url: `${siteUrl}/jobs/company/${slug}`,
      lastModified: now,
      changeFrequency: "weekly" as const,
      priority: 0.6,
    })),
  ];

  return [...staticEntries, ...discoveryEntries];
}
