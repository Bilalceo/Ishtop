import type { Metadata } from "next";
import DemoClient from "@/components/demo/DemoClient";
import { SKILLS, topMatches } from "@/components/demo/match-engine";
import { readSkillsFromUrl } from "@/components/demo/url-state";

const siteUrl = process.env.NEXT_PUBLIC_FRONTEND_URL?.trim() || "http://localhost:3000";

type SearchParams = {
  s?: string | string[];
};

function pickShareSkills(s?: string | string[]): string[] {
  if (!s) return [];
  const raw = Array.isArray(s) ? s.join(",") : s;
  return readSkillsFromUrl(`s=${raw}`);
}

export async function generateMetadata({
  searchParams,
}: {
  searchParams: SearchParams;
}): Promise<Metadata> {
  const selected = pickShareSkills(searchParams.s);
  const top = topMatches(selected, 1)[0];

  const personalized = selected.length > 0 && top;

  // Build canonical URL with the same query so socials cache per-share
  const canonicalPath = personalized ? `/demo?s=${selected.join(",")}` : "/demo";
  const canonical = new URL(canonicalPath, siteUrl).toString();

  // OG image points at our edge route so it renders the personalized match card
  const ogImageUrl = personalized
    ? new URL(`/demo/og?s=${selected.join(",")}`, siteUrl).toString()
    : new URL("/demo/og", siteUrl).toString();

  const skillNames = selected
    .map((id) => SKILLS.find((s) => s.id === id)?.label)
    .filter(Boolean)
    .join(", ");

  const title = personalized
    ? `${top.score}% match · ${top.job.title} — IshTop AI`
    : "Jonli AI demo · IshTop";

  const description = personalized
    ? `${skillNames} bilan ${top.score}% mos: ${top.job.title} (${top.job.company}). Sinab ko'r — 5 soniyada.`
    : "Ko'nikmalaringizni tanlang — IshTop AI o'ylab, tushuntirib, eng mos vakansiyalarni topadi. Ro'yxatdan o'tmasdan, 5 soniyada.";

  return {
    title,
    description,
    alternates: { canonical },
    openGraph: {
      type: "website",
      url: canonical,
      siteName: "IshTop",
      title,
      description,
      images: [
        {
          url: ogImageUrl,
          width: 1200,
          height: 630,
          alt: personalized
            ? `${top.score}% match: ${top.job.title} at ${top.job.company}`
            : "IshTop · Jonli AI demo",
        },
      ],
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: [ogImageUrl],
    },
    robots: { index: true, follow: true },
  };
}

export default function DemoPage() {
  return <DemoClient />;
}
