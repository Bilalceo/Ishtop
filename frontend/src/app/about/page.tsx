import type { Metadata } from "next";
import AboutClient from "@/components/about/AboutClient";

const siteUrl = process.env.NEXT_PUBLIC_FRONTEND_URL?.trim() || "http://localhost:3000";

export const metadata: Metadata = {
  title: "Biz haqimizda · IshTop",
  description:
    "IshTop — O'zbekistondagi talabalar va junior mutaxassislar uchun karyera platformasi. Biz AI bilan sehr qilmaymiz — aniq, tushunarli va ishonchli yo'l qo'yamiz.",
  alternates: {
    canonical: new URL("/about", siteUrl).toString(),
  },
  openGraph: {
    type: "article",
    url: new URL("/about", siteUrl).toString(),
    siteName: "IshTop",
    title: "IshTop — Birinchi ish. Soddaroq yo'l.",
    description:
      "Trust-first karyera platformasi. 1,180 ta birinchi oferta. 4 hafta o'rtacha.",
    images: [{ url: "/og-image.png", width: 1200, height: 630, alt: "IshTop manifesto" }],
  },
  twitter: {
    card: "summary_large_image",
    title: "IshTop · Biz haqimizda",
    description: "Birinchi ish. Soddaroq yo'l.",
    images: ["/og-image.png"],
  },
  robots: { index: true, follow: true },
};

export default function AboutPage() {
  return <AboutClient />;
}
