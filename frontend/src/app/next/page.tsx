import type { Metadata } from "next";
import NextLandingClient from "@/components/y2k/NextLandingClient";

const siteUrl = process.env.NEXT_PUBLIC_FRONTEND_URL?.trim() || "http://localhost:3000";

export const metadata: Metadata = {
  title: "IshTop · v2 — AI Career, New Era",
  description:
    "Karyerangiz uchun yangi era. AI sizning ko'nikmalaringizni o'qiydi, eng mos ishni tushuntirib taklif etadi va arizalarni soniyalar ichida yuboradi.",
  alternates: {
    canonical: new URL("/next", siteUrl).toString(),
  },
  openGraph: {
    type: "website",
    url: new URL("/next", siteUrl).toString(),
    siteName: "IshTop",
    title: "IshTop · v2 — AI Career, New Era",
    description: "Chromatic AI campaign landing — 60 sekundda profil, soniyada match.",
    images: [{ url: "/og-image.png", width: 1200, height: 630, alt: "IshTop v2" }],
  },
  twitter: {
    card: "summary_large_image",
    title: "IshTop · v2",
    description: "AI karyera, yangi era.",
    images: ["/og-image.png"],
  },
  robots: { index: true, follow: true },
};

export default function NextPage() {
  return <NextLandingClient />;
}
