/**
 * Structured data (schema.org JSON-LD) helpers.
 *
 * Rendering these lets Google understand the brand (Organization / WebSite) and,
 * crucially for a job board, surface vacancies in Google Jobs (JobPosting).
 * Each helper returns a plain object; render it with <JsonLd data={...} />.
 */

const SITE_URL = (process.env.NEXT_PUBLIC_FRONTEND_URL?.trim() || "https://ishtopuz.uz").replace(/\/+$/, "");

/** Inline <script type="application/ld+json"> — safe for server components. */
export function JsonLd({ data }: { data: Record<string, unknown> | Record<string, unknown>[] }) {
  return (
    <script
      type="application/ld+json"
      // JSON.stringify output is safe here (no user-controlled </script> once escaped).
      dangerouslySetInnerHTML={{ __html: JSON.stringify(data).replace(/</g, "\\u003c") }}
    />
  );
}

export function organizationJsonLd(): Record<string, unknown> {
  return {
    "@context": "https://schema.org",
    "@type": "Organization",
    name: "IshTop",
    url: SITE_URL,
    logo: `${SITE_URL}/logo-ishtop.png`,
    description:
      "IshTop — O'zbekistonda sun'iy intellekt asosidagi ish topish va rezyume yaratish platformasi.",
    sameAs: [
      "https://t.me/ishtopuz_official",
      "https://www.instagram.com/ishtopuz.uz",
    ],
  };
}

export function websiteJsonLd(): Record<string, unknown> {
  return {
    "@context": "https://schema.org",
    "@type": "WebSite",
    name: "IshTop",
    url: SITE_URL,
    inLanguage: "uz",
    potentialAction: {
      "@type": "SearchAction",
      target: {
        "@type": "EntryPoint",
        urlTemplate: `${SITE_URL}/student/jobs?search={search_term_string}`,
      },
      "query-input": "required name=search_term_string",
    },
  };
}

const EMPLOYMENT_TYPE: Record<string, string> = {
  full_time: "FULL_TIME",
  part_time: "PART_TIME",
  contract: "CONTRACTOR",
  internship: "INTERN",
  temporary: "TEMPORARY",
};

/** Strip HTML tags to a plain-text description (schema allows HTML, but plain is safer). */
function toPlainText(html: unknown): string {
  if (typeof html !== "string") return "";
  return html.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
}

/**
 * Build a JobPosting object for one vacancy from the discovery API shape.
 * Returns null when required fields are missing so we never emit invalid schema.
 */
export function jobPostingJsonLd(job: any): Record<string, unknown> | null {
  if (!job || !job.title || !job.company?.name) return null;

  const posting: Record<string, unknown> = {
    "@context": "https://schema.org",
    "@type": "JobPosting",
    title: String(job.title),
    description: toPlainText(job.description) || String(job.title),
    datePosted: job.created_at ?? undefined,
    hiringOrganization: {
      "@type": "Organization",
      name: String(job.company.name),
      ...(job.company.website ? { sameAs: job.company.website } : {}),
      ...(job.company.logo ? { logo: job.company.logo } : {}),
    },
    jobLocation: {
      "@type": "Place",
      address: {
        "@type": "PostalAddress",
        addressLocality: job.location || "O'zbekiston",
        addressCountry: "UZ",
      },
    },
    directApply: true,
  };

  if (job.expires_at) posting.validThrough = job.expires_at;
  if (job.is_remote_allowed) posting.jobLocationType = "TELECOMMUTE";
  if (job.job_type && EMPLOYMENT_TYPE[job.job_type]) {
    posting.employmentType = EMPLOYMENT_TYPE[job.job_type];
  }
  if (job.is_salary_visible && (job.salary_min || job.salary_max)) {
    posting.baseSalary = {
      "@type": "MonetaryAmount",
      currency: job.salary_currency || "UZS",
      value: {
        "@type": "QuantitativeValue",
        ...(job.salary_min ? { minValue: job.salary_min } : {}),
        ...(job.salary_max ? { maxValue: job.salary_max } : {}),
        unitText: "MONTH",
      },
    };
  }

  return posting;
}

/** Wrap several JobPostings as an ItemList for a discovery/listing page. */
export function jobListJsonLd(jobs: any[]): Record<string, unknown> | null {
  const items = (jobs || [])
    .map((j) => jobPostingJsonLd(j))
    .filter((p): p is Record<string, unknown> => p !== null);
  if (items.length === 0) return null;
  return {
    "@context": "https://schema.org",
    "@type": "ItemList",
    itemListElement: items.map((posting, i) => ({
      "@type": "ListItem",
      position: i + 1,
      item: posting,
    })),
  };
}
