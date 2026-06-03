import type { Metadata } from "next";
import PlansClient from "@/components/plans/PlansClient";

const siteUrl = process.env.NEXT_PUBLIC_FRONTEND_URL?.trim() || "http://localhost:3000";

export const metadata: Metadata = {
  title: "Plans · IshTop",
  description:
    "3 ta plan, bitta maqsad — birinchi ishingiz. Free haqiqatan bepul. Pro AI Coach qo'shadi. Team bootcamplar uchun.",
  alternates: { canonical: new URL("/plans", siteUrl).toString() },
  openGraph: {
    type: "website",
    url: new URL("/plans", siteUrl).toString(),
    siteName: "IshTop",
    title: "IshTop · Plans",
    description: "Free / Pro / Team — Brutalist tier comparison.",
    images: [{ url: "/og-image.png", width: 1200, height: 630, alt: "IshTop plans" }],
  },
  robots: { index: true, follow: true },
};

export default function PlansPage() {
  return <PlansClient />;
}
