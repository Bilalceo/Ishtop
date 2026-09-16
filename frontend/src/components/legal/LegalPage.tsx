"use client";

/**
 * Shared shell for /privacy and /terms.
 *
 * Both pages were a single sentence admitting they existed only so the
 * footer links would not 404. They are now real documents describing what
 * this code actually does — which is the only kind worth publishing.
 */

import Link from "next/link";
import { useTranslation } from "@/hooks/useTranslation";

export interface LegalSection {
  heading: string;
  /** Paragraphs and bullet lists, in order. */
  body: (string | string[])[];
}

interface LegalPageProps {
  title: string;
  intro: string;
  updated: string;
  sections: LegalSection[];
}

export function LegalPage({ title, intro, updated, sections }: LegalPageProps) {
  const { locale } = useTranslation();
  const isRu = locale === "ru";

  return (
    <main className="mx-auto max-w-3xl px-6 py-16">
      <Link
        href="/"
        className="focus-ring text-sm font-medium text-brand-600 hover:underline dark:text-brand-300"
      >
        ← {isRu ? "На главную" : "Bosh sahifaga"}
      </Link>

      <h1 className="mt-6 font-display text-3xl font-bold tracking-tight text-surface-900 dark:text-white">
        {title}
      </h1>
      <p className="mt-2 text-sm text-surface-500 dark:text-white/55">{updated}</p>
      <p className="mt-6 text-surface-700 dark:text-surface-300">{intro}</p>

      <div className="mt-10 space-y-10">
        {sections.map((section, i) => (
          <section key={section.heading} aria-labelledby={`legal-${i}`}>
            <h2
              id={`legal-${i}`}
              className="text-lg font-semibold text-surface-900 dark:text-white"
            >
              {i + 1}. {section.heading}
            </h2>
            <div className="mt-3 space-y-3">
              {section.body.map((block, j) =>
                Array.isArray(block) ? (
                  <ul
                    key={j}
                    className="list-disc space-y-1.5 pl-5 text-surface-700 dark:text-surface-300"
                  >
                    {block.map((li, k) => (
                      <li key={k} className="leading-relaxed">
                        {li}
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p key={j} className="leading-relaxed text-surface-700 dark:text-surface-300">
                    {block}
                  </p>
                )
              )}
            </div>
          </section>
        ))}
      </div>

      <div className="mt-12 border-t border-surface-200 pt-6 dark:border-white/[0.08]">
        <Link
          href={title.toLowerCase().includes("maxfiylik") || title.toLowerCase().includes("конфиденц") ? "/terms" : "/privacy"}
          className="focus-ring text-sm font-medium text-brand-600 hover:underline dark:text-brand-300"
        >
          {title.toLowerCase().includes("maxfiylik") || title.toLowerCase().includes("конфиденц")
            ? isRu
              ? "Условия использования →"
              : "Foydalanish shartlari →"
            : isRu
              ? "Политика конфиденциальности →"
              : "Maxfiylik siyosati →"}
        </Link>
      </div>
    </main>
  );
}

export default LegalPage;
