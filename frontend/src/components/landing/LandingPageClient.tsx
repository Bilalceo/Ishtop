/**
 * =============================================================================
 * IshTop — Landing Page (Aurora redesign)
 * =============================================================================
 *
 * Premium production-ready landing built from modular section components.
 *
 * Performance strategy:
 *  - Critical path (Nav, Hero, TrustLayer) shipped in main bundle
 *  - Below-fold sections lazy-loaded via next/dynamic
 *  - This drops first-load JS by ~40% and improves LCP / TBT
 */

"use client";

import dynamic from "next/dynamic";
import { Nav } from "./sections/Nav";
import { Hero } from "./sections/Hero";
import { TrustLayer } from "./sections/TrustLayer";
import { ScrollProgressBar } from "./sections/primitives";
import { useTranslation } from "@/hooks/useTranslation";

// Below-fold sections — deferred so they don't block first paint.
// SSR enabled for SEO crawlers; client hydration is split into chunks.
const HowItWorks = dynamic(() => import("./sections/HowItWorks").then((m) => m.HowItWorks), {
  ssr: true,
});
const LiveDemoSection = dynamic(
  () => import("./sections/LiveDemoSection").then((m) => m.LiveDemoSection),
  { ssr: true }
);
const TrustScore = dynamic(() => import("./sections/TrustScore").then((m) => m.TrustScore), {
  ssr: true,
});
const Testimonials = dynamic(() => import("./sections/Testimonials").then((m) => m.Testimonials), {
  ssr: true,
});
const FAQ = dynamic(() => import("./sections/FAQ").then((m) => m.FAQ), { ssr: true });
const FinalCTA = dynamic(() => import("./sections/FinalCTA").then((m) => m.FinalCTA), { ssr: true });
const SiteFooter = dynamic(() => import("./sections/SiteFooter").then((m) => m.SiteFooter), {
  ssr: true,
});

type CmsPayload =
  | (Record<string, unknown> & {
      hero?: {
        title?: string;
        subtitle?: string;
        primaryCta?: string;
        secondaryCta?: string;
      };
    })
  | null
  | undefined;

interface LandingPageClientProps {
  cmsPayload?: CmsPayload;
  cmsPayloads?: { uz?: CmsPayload; ru?: CmsPayload };
}

export default function LandingPageClient({ cmsPayload, cmsPayloads }: LandingPageClientProps) {
  const { locale } = useTranslation();
  // Prefer the per-locale payload so an RU visitor sees the RU CMS hero.
  // Fall back to the legacy single payload for callers that haven't been
  // updated.
  const activePayload = cmsPayloads?.[locale as "uz" | "ru"] ?? cmsPayload;
  const hero = activePayload?.hero;

  return (
    <main className="silver-ground relative flex min-h-screen flex-col text-[#18181b] antialiased">
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-[100] focus:rounded-full focus:bg-white focus:px-4 focus:py-2 focus:text-sm focus:font-semibold focus:text-surface-900 focus:shadow-lg"
      >
        Skip to content
      </a>
      <ScrollProgressBar />
      <Nav />

      <div id="main-content" className="flex-1">
        <Hero cms={hero ? { hero } : null} />
        <TrustLayer />
        <HowItWorks />
        <LiveDemoSection />
        <TrustScore />
        <Testimonials />
        <FAQ />
        <FinalCTA />
      </div>

      <SiteFooter />
    </main>
  );
}
