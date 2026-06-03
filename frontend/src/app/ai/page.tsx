import type { Metadata } from "next";
import AIClient from "@/components/claude-ai/AIClient";

const siteUrl = process.env.NEXT_PUBLIC_FRONTEND_URL?.trim() || "http://localhost:3000";

export const metadata: Metadata = {
  title: "AI · IshTop",
  description:
    "AI kim uchun ishlaydi? Biz uchun — birinchi ishini izlayotgan talabaga tushunarli, halol va xavfsiz yo'l ko'rsatish uchun.",
  alternates: { canonical: new URL("/ai", siteUrl).toString() },
  openGraph: {
    type: "article",
    url: new URL("/ai", siteUrl).toString(),
    siteName: "IshTop",
    title: "IshTop · AI",
    description: "Sehrli quti emas. Hamkor. IshTop AI falsafamiz.",
    images: [{ url: "/og-image.png", width: 1200, height: 630, alt: "IshTop AI" }],
  },
  robots: { index: true, follow: true },
};

export default function AIPage() {
  return <AIClient />;
}
