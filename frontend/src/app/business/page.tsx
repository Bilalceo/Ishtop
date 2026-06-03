import type { Metadata } from "next";
import CompanyClient from "@/components/company-public/CompanyClient";

const siteUrl = process.env.NEXT_PUBLIC_FRONTEND_URL?.trim() || "http://localhost:3000";

export const metadata: Metadata = {
  title: "For Business · IshTop",
  description:
    "Hire faster. Hire smarter. O'zbekiston'dagi 10,000+ junior talant. AI screening, verified Trust Score, automated pipeline.",
  alternates: { canonical: new URL("/business", siteUrl).toString() },
  openGraph: {
    type: "website",
    url: new URL("/business", siteUrl).toString(),
    siteName: "IshTop",
    title: "IshTop · For Business",
    description: "Hire faster, hire smarter — 10,000+ verified juniors.",
    images: [{ url: "/og-image.png", width: 1200, height: 630, alt: "IshTop for business" }],
  },
  robots: { index: true, follow: true },
};

export default function CompanyPage() {
  return <CompanyClient />;
}
