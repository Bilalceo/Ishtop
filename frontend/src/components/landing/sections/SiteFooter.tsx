"use client";

import Link from "next/link";
import { Sparkles, Github, Linkedin, Twitter, Mail, Send } from "lucide-react";
import { useTranslation } from "@/hooks/useTranslation";

type Locale = "uz" | "ru" | "en";

const COL: Record<
  Locale,
  { product: { label: string; href: string }[]; company: { label: string; href: string }[]; legal: { label: string; href: string }[] }
> = {
  uz: {
    product: [
      { label: "AI rezyume yaratish", href: "/register" },
      { label: "Jonli demo", href: "/demo" },
      { label: "Qanday ishlaydi", href: "/#how" },
      { label: "Narxlar", href: "/plans" },
    ],
    company: [
      { label: "Biz haqimizda", href: "/about" },
      { label: "Kompaniyalar uchun", href: "/business" },
      { label: "Narxlar", href: "/plans" },
      { label: "Bog'lanish", href: "/contact" },
    ],
    legal: [
      { label: "Maxfiylik", href: "/privacy" },
      { label: "Foydalanish shartlari", href: "/terms" },
    ],
  },
  ru: {
    product: [
      { label: "Создать AI-резюме", href: "/register" },
      { label: "Живое демо", href: "/demo" },
      { label: "Как это работает", href: "/#how" },
      { label: "Тарифы", href: "/plans" },
    ],
    company: [
      { label: "О нас", href: "/about" },
      { label: "Для компаний", href: "/business" },
      { label: "Тарифы", href: "/plans" },
      { label: "Контакты", href: "/contact" },
    ],
    legal: [
      { label: "Политика конфиденциальности", href: "/privacy" },
      { label: "Условия использования", href: "/terms" },
    ],
  },
  en: {
    product: [
      { label: "Create AI resume", href: "/register" },
      { label: "Live demo", href: "/demo" },
      { label: "How it works", href: "/#how" },
      { label: "Pricing", href: "/plans" },
    ],
    company: [
      { label: "About", href: "/about" },
      { label: "For companies", href: "/business" },
      { label: "Pricing", href: "/plans" },
      { label: "Contact", href: "/contact" },
    ],
    legal: [
      { label: "Privacy", href: "/privacy" },
      { label: "Terms", href: "/terms" },
    ],
  },
};

export function SiteFooter() {
  const { locale } = useTranslation();
  const L = (["uz", "ru", "en"] as const).includes(locale as Locale)
    ? (locale as Locale)
    : "uz";
  const cols = COL[L];
  const year = new Date().getFullYear();

  return (
    <footer className="border-t border-[#d8d8d5] bg-[#ececea] text-[#63636b]" aria-label="Footer">
      <div className="section-shell py-16">
        <div className="grid gap-10 lg:grid-cols-[1.4fr_1fr_1fr_1fr]">
          <div>
            <Link href="/" className="focus-ring inline-flex items-center gap-2">
              <span className="grid h-9 w-9 place-items-center rounded-2xl bg-gradient-to-br from-[#d7e7ff] via-[#e3ddff] to-[#ffe9d6]">
                <Sparkles className="h-4 w-4 text-[#5b4a9e]" />
              </span>
              <span className="font-display text-lg font-semibold tracking-tight text-[#18181b]">
                IshTop
              </span>
            </Link>
            <p className="mt-4 max-w-xs text-sm">
              {L === "ru"
                ? "AI-карьера для студентов и junior-специалистов в Узбекистане."
                : L === "en"
                ? "AI careers for students and junior talent in Uzbekistan."
                : "O'zbekistondagi talabalar va junior mutaxassislar uchun AI-karyera."}
            </p>

            <div className="mt-6 flex items-center gap-2">
              {(() => {
                const envHas = (k: string) =>
                  typeof process !== "undefined" && !!process.env[k]?.trim();
                const links = [
                  {
                    Icon: Send,
                    href: "https://t.me/ishtopuz_official",
                    enabled: true,
                    label:
                      L === "ru"
                        ? "Официальный Telegram-канал IshTop (новая вкладка)"
                        : L === "en"
                        ? "IshTop official Telegram channel (opens in new tab)"
                        : "IshTop rasmiy Telegram kanali (yangi oynada)",
                  },
                  {
                    Icon: Twitter,
                    href: process.env.NEXT_PUBLIC_TWITTER_URL,
                    enabled: envHas("NEXT_PUBLIC_TWITTER_URL"),
                    label:
                      L === "ru"
                        ? "IshTop в Twitter (новая вкладка)"
                        : L === "en"
                        ? "IshTop on Twitter (opens in new tab)"
                        : "IshTop Twitter sahifasi (yangi oynada)",
                  },
                  {
                    Icon: Linkedin,
                    href: process.env.NEXT_PUBLIC_LINKEDIN_URL,
                    enabled: envHas("NEXT_PUBLIC_LINKEDIN_URL"),
                    label:
                      L === "ru"
                        ? "IshTop в LinkedIn (новая вкладка)"
                        : L === "en"
                        ? "IshTop on LinkedIn (opens in new tab)"
                        : "IshTop LinkedIn sahifasi (yangi oynada)",
                  },
                  {
                    Icon: Github,
                    href: process.env.NEXT_PUBLIC_GITHUB_URL,
                    enabled: envHas("NEXT_PUBLIC_GITHUB_URL"),
                    label: "IshTop GitHub (opens in new tab)",
                  },
                  {
                    Icon: Mail,
                    href: "mailto:hello@ishtop.uz",
                    enabled: true,
                    label:
                      L === "ru"
                        ? "Написать IshTop на почту"
                        : L === "en"
                        ? "Email IshTop"
                        : "IshTop'ga email yozish",
                  },
                ];
                return links
                  .filter((l) => l.enabled && l.href)
                  .map(({ Icon, href, label }) => (
                    <a
                      key={label}
                      href={href}
                      aria-label={label}
                      className="focus-ring grid h-10 w-10 place-items-center rounded-full bg-white text-[#63636b] shadow-[0_2px_8px_-2px_rgba(24,24,27,0.1)] transition hover:-translate-y-0.5 hover:text-[#18181b]"
                      target={href?.startsWith("http") ? "_blank" : undefined}
                      rel={href?.startsWith("http") ? "noopener noreferrer" : undefined}
                    >
                      <Icon className="h-4 w-4" aria-hidden />
                      <span className="sr-only">{label}</span>
                    </a>
                  ));
              })()}
            </div>
          </div>

          <FooterCol title={L === "ru" ? "Продукт" : L === "en" ? "Product" : "Mahsulot"} items={cols.product} />
          <FooterCol title={L === "ru" ? "Компания" : L === "en" ? "Company" : "Kompaniya"} items={cols.company} />
          <FooterCol title={L === "ru" ? "Право" : L === "en" ? "Legal" : "Huquqiy"} items={cols.legal} />
        </div>

        <hr className="mt-12 border-[#d8d8d5]" />

        <div className="mt-6 flex flex-col items-center justify-between gap-3 text-xs text-[#8e8e96] sm:flex-row">
          <p>© {year} IshTop. {L === "ru" ? "Все права защищены." : L === "en" ? "All rights reserved." : "Barcha huquqlar himoyalangan."}</p>
          <p>Made in Tashkent</p>
        </div>
      </div>
    </footer>
  );
}

function FooterCol({ title, items }: { title: string; items: { label: string; href: string }[] }) {
  return (
    <div>
      <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#8e8e96]">{title}</p>
      <ul className="mt-4 space-y-2.5 text-sm">
        {items.map((it) => (
          <li key={it.label}>
            <Link href={it.href} className="focus-ring link-underline rounded">
              {it.label}
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}

export default SiteFooter;
