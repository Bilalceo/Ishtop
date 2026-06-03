import Link from "next/link";
import { notFound } from "next/navigation";

import { fetchDiscoveryJobs } from "@/lib/discovery-api";
import { stripHtmlTags } from "@/lib/utils";

export async function generateMetadata({ params }: { params: { slug: string } }) {
  const title = `${params.slug.replace(/-/g, " ")} jobs | IshTop`;
  return {
    title,
    description: `Explore ${params.slug.replace(/-/g, " ")} roles with explainable matching on IshTop.`,
    alternates: { canonical: `/jobs/profession/${params.slug}` },
  };
}

export default async function ProfessionDiscoveryPage({ params }: { params: { slug: string } }) {
  let payload;
  try {
    payload = await fetchDiscoveryJobs("professions", params.slug);
  } catch {
    notFound();
  }

  const jobs = payload.jobs || [];

  return (
    <main className="mx-auto max-w-5xl px-4 py-10">
      <header className="mb-8">
        <p className="text-sm text-surface-500">Profession Discovery</p>
        <h1 className="mt-2 text-3xl font-bold text-surface-900 dark:text-white">
          {params.slug.replace(/-/g, " ")} jobs
        </h1>
        <p className="mt-2 text-surface-600 dark:text-surface-300">
          {payload.total || jobs.length} active listings in this profession.
        </p>
      </header>

      <section className="space-y-4">
        {jobs.map((job: any) => (
          <article key={job.id} className="rounded-xl border border-surface-200 bg-white p-5 dark:border-surface-700 dark:bg-surface-900">
            <h2 className="text-xl font-semibold text-surface-900 dark:text-white">{job.title}</h2>
            <p className="mt-1 text-sm text-surface-500">{job.company?.name || "Company"} • {job.location || "Uzbekistan"}</p>
            <p className="mt-3 line-clamp-3 text-sm text-surface-700 dark:text-surface-300">{stripHtmlTags(job.description)}</p>
            <div className="mt-4 flex flex-wrap items-center gap-3 text-xs text-surface-600 dark:text-surface-300">
              <span>Trust: {Math.round(job.trust_score || 0)}</span>
              <span>Badges: {(job.trust_badges || []).join(", ") || "none"}</span>
            </div>
            <div className="mt-4">
              <Link href="/student/jobs" className="text-sm font-medium text-blue-700 hover:underline">
                Open in student dashboard
              </Link>
            </div>
          </article>
        ))}
      </section>
    </main>
  );
}
