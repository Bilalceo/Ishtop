import Link from "next/link";
import { notFound } from "next/navigation";

import { fetchDiscoveryCompany } from "@/lib/discovery-api";
import { stripHtmlTags } from "@/lib/utils";

export async function generateMetadata({ params }: { params: { slug: string } }) {
  return {
    title: `${params.slug.replace(/-/g, " ")} jobs | IshTop`,
    description: `Browse open roles from ${params.slug.replace(/-/g, " ")} on IshTop.`,
    alternates: { canonical: `/jobs/company/${params.slug}` },
  };
}

export default async function CompanyDiscoveryPage({ params }: { params: { slug: string } }) {
  let payload;
  try {
    payload = await fetchDiscoveryCompany(params.slug);
  } catch {
    notFound();
  }

  const jobs = payload.jobs || [];
  const company = payload.company || {};
  const gallery: string[] = Array.isArray(company.gallery_images) ? company.gallery_images : [];

  return (
    <main className="mx-auto max-w-5xl px-4 py-10">
      <header className="mb-8 overflow-hidden rounded-2xl border border-surface-200 bg-white dark:border-surface-700 dark:bg-surface-900">
        {company.cover_photo_url && (
          <img
            src={company.cover_photo_url}
            alt={company.name || "Kompaniya rasmi"}
            className="h-44 w-full object-cover"
          />
        )}
        <div className="p-6">
        <p className="text-sm text-surface-500">Kompaniya profili</p>
        <h1 className="mt-2 text-3xl font-bold text-surface-900 dark:text-white">
          {company.name || params.slug.replace(/-/g, " ")}
        </h1>
        {company.is_verified && (
          <span className="mt-3 inline-flex rounded-full bg-emerald-100 px-3 py-1 text-xs font-semibold text-emerald-700">
            Tasdiqlangan kompaniya
          </span>
        )}
        <p className="mt-2 text-surface-600 dark:text-surface-300">
          Verifikatsiya: <strong>{company.verification_state || "unverified"}</strong>
        </p>
        <p className="mt-1 text-surface-600 dark:text-surface-300">
          Faol vakansiyalar: {payload.total || jobs.length}
        </p>
        {(company.founded_year || company.location || company.website) && (
          <div className="mt-3 space-y-1 text-sm text-surface-600 dark:text-surface-300">
            {company.founded_year && <p>Tashkil topgan yil: {company.founded_year}</p>}
            {company.location && <p>Joylashuv: {company.location}</p>}
            {company.website && (
              <p>
                Veb-sayt:{" "}
                <a href={company.website} target="_blank" rel="noreferrer" className="text-blue-700 hover:underline">
                  {company.website}
                </a>
              </p>
            )}
          </div>
        )}
        {(company.linkedin_url || company.telegram_url || company.instagram_url || company.facebook_url) && (
          <div className="mt-3 flex flex-wrap gap-3 text-sm">
            {company.linkedin_url && <a href={company.linkedin_url} target="_blank" rel="noreferrer" className="text-blue-700 hover:underline">LinkedIn</a>}
            {company.telegram_url && <a href={company.telegram_url} target="_blank" rel="noreferrer" className="text-blue-700 hover:underline">Telegram</a>}
            {company.instagram_url && <a href={company.instagram_url} target="_blank" rel="noreferrer" className="text-blue-700 hover:underline">Instagram</a>}
            {company.facebook_url && <a href={company.facebook_url} target="_blank" rel="noreferrer" className="text-blue-700 hover:underline">Facebook</a>}
          </div>
        )}
        </div>
      </header>

      {company.culture && (
        <section className="mb-6 rounded-2xl border border-surface-200 bg-white p-5 dark:border-surface-700 dark:bg-surface-900">
          <h2 className="text-lg font-semibold text-surface-900 dark:text-white">Bizning madaniyatimiz</h2>
          <p className="mt-2 whitespace-pre-wrap text-sm text-surface-700 dark:text-surface-300">{company.culture}</p>
        </section>
      )}

      {company.video_url && (
        <section className="mb-6 rounded-2xl border border-surface-200 bg-white p-5 dark:border-surface-700 dark:bg-surface-900">
          <h2 className="text-lg font-semibold text-surface-900 dark:text-white">Kompaniya videosi</h2>
          <a href={company.video_url} target="_blank" rel="noreferrer" className="mt-2 inline-block text-blue-700 hover:underline">
            {company.video_url}
          </a>
        </section>
      )}

      {gallery.length > 0 && (
        <section className="mb-6 rounded-2xl border border-surface-200 bg-white p-5 dark:border-surface-700 dark:bg-surface-900">
          <h2 className="text-lg font-semibold text-surface-900 dark:text-white">Kompaniya galereyasi</h2>
          <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {gallery.slice(0, 6).map((src) => (
              <img key={src} src={src} alt="Company gallery" className="h-32 w-full rounded-xl object-cover" />
            ))}
          </div>
        </section>
      )}

      <section className="space-y-4">
        {jobs.map((job: any) => (
          <article key={job.id} className="rounded-xl border border-surface-200 bg-white p-5 dark:border-surface-700 dark:bg-surface-900">
            <h2 className="text-xl font-semibold text-surface-900 dark:text-white">{job.title}</h2>
            <p className="mt-1 text-sm text-surface-500">{job.location || "Uzbekistan"}</p>
            <p className="mt-3 line-clamp-3 text-sm text-surface-700 dark:text-surface-300">{stripHtmlTags(job.description)}</p>
            <div className="mt-4 flex flex-wrap items-center gap-3 text-xs text-surface-600 dark:text-surface-300">
              <span>Ishonch: {Math.round(job.trust_score || 0)}</span>
              <span>{(job.trust_badges || []).join(", ") || "Badge mavjud emas"}</span>
            </div>
            <div className="mt-4">
              <Link href="/student/jobs" className="text-sm font-medium text-blue-700 hover:underline">
                Talabalar panelida ochish
              </Link>
            </div>
          </article>
        ))}
      </section>
    </main>
  );
}
