import type { Metadata } from "next";
import CompanyClient from "@/components/company-public/CompanyClient";

const siteUrl = process.env.NEXT_PUBLIC_FRONTEND_URL?.trim() || "http://localhost:3000";

export const metadata: Metadata = {
  title: "Biznes uchun · IshTop",
  description:
    "Tezroq va aqlliroq yollang. O'zbekistondagi junior talantlar, AI saralash, tasdiqlangan Trust Score va avtomatlashtirilgan jarayon.",
  alternates: { canonical: new URL("/business", siteUrl).toString() },
  openGraph: {
    type: "website",
    url: new URL("/business", siteUrl).toString(),
    siteName: "IshTop",
    title: "IshTop · Biznes uchun",
    description: "Tezroq va aqlliroq yollang — tasdiqlangan junior talantlar.",
    images: [{ url: "/og-image.png", width: 1200, height: 630, alt: "IshTop for business" }],
  },
  robots: { index: true, follow: true },
};

export default function CompanyPage() {
  return <CompanyClient />;
}
