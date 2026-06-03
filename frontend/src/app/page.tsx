import type { Metadata } from "next";
import LandingPageClient from "@/components/landing/LandingPageClient";

const siteUrl = process.env.NEXT_PUBLIC_FRONTEND_URL?.trim() || "http://localhost:3000";
const apiBase = process.env.NEXT_PUBLIC_API_URL?.trim();

type LandingResponse = {
  success: boolean;
  data?: {
    locale: "uz" | "ru";
    payload: Record<string, unknown>;
    is_published: boolean;
    updated_at?: string;
  };
};

async function fetchLanding(locale: "uz" | "ru") {
  if (!apiBase) return null;
  try {
    const res = await fetch(`${apiBase}/landing/content?locale=${locale}`, {
      cache: "no-store",
    });
    if (!res.ok) return null;
    const json = (await res.json()) as LandingResponse;
    return json.data?.payload ?? null;
  } catch {
    return null;
  }
}

export async function generateMetadata(): Promise<Metadata> {
  const canonical = new URL("/", siteUrl).toString();

  return {
    title: "IshTop - AI Career Platform",
    description:
      "AI yordamida professional rezyume yarating, ish toping va karyerangizni IshTop bilan tezlashtiring.",
    alternates: {
      canonical,
      languages: {
        uz: `${canonical}?lang=uz`,
        ru: `${canonical}?lang=ru`,
      },
    },
    openGraph: {
      type: "website",
      url: canonical,
      siteName: "IshTop",
      title: "IshTop - AI Career Platform",
      description:
        "O'zbekiston uchun AI-quvvatli karyera platformasi: rezyume yarating va ideal ishni toping.",
      images: [{ url: "/og-image.png", width: 1200, height: 630, alt: "IshTop landing" }],
    },
    twitter: {
      card: "summary_large_image",
      title: "IshTop - AI Career Platform",
      description: "AI resume builder va aqlli ish mosligi platformasi.",
      images: ["/og-image.png"],
    },
  };
}

export default async function LandingPage() {
  const cmsPayloadUz = await fetchLanding("uz");
  const cmsPayloadRu = await fetchLanding("ru");

  // Pass both locale payloads so Hero/LandingPageClient can render the
  // matching one once the user's locale is known on the client. Previously
  // only the UZ payload was passed, so a RU visitor saw UZ CMS text.
  return (
    <LandingPageClient
      cmsPayload={cmsPayloadUz || cmsPayloadRu}
      cmsPayloads={{ uz: cmsPayloadUz, ru: cmsPayloadRu }}
    />
  );
}
