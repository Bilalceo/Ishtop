"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { Menu, X } from "lucide-react";
import { LanguageSwitcher } from "@/components/ui/language-switcher";
import { ThemeToggle } from "@/components/ui/theme-toggle";
import { useTranslation } from "@/hooks/useTranslation";

const NAV_ITEMS = [
  { href: "#how", labelUz: "Qanday ishlaydi", labelRu: "Как это работает", labelEn: "How it works" },
  { href: "#live-demo", labelUz: "Jonli demo", labelRu: "Живое демо", labelEn: "Live demo" },
  { href: "#trust", labelUz: "Ishonch reytingi", labelRu: "Рейтинг доверия", labelEn: "Trust Score" },
  { href: "#faq", labelUz: "Savol-javob", labelRu: "Частые вопросы", labelEn: "FAQ" },
];

export function Nav() {
  const { locale: rawLocale } = useTranslation();
  const locale = rawLocale as string;
  const [scrolled, setScrolled] = useState(false);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 12);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const label = (item: (typeof NAV_ITEMS)[number]) =>
    locale === "ru" ? item.labelRu : locale === "en" ? item.labelEn : item.labelUz;

  return (
    <header
      className={`fixed inset-x-0 top-0 z-50 bg-gradient-to-r from-blue-600 via-indigo-600 to-violet-700 transition-all duration-300 ${
        scrolled
          ? "border-b border-white/10 shadow-lg backdrop-blur-md"
          : ""
      }`}
      aria-label="Primary"
    >
      <nav className="section-shell flex h-16 items-center justify-between sm:h-20">
        <Link
          href="/"
          className="focus-ring flex shrink-0 items-center rounded-xl"
          aria-label="IshTop home"
        >
          <Image
            src="/logo-ishtop-ondark.png"
            alt="IshTop"
            width={1025}
            height={292}
            priority
            sizes="(max-width: 640px) 112px, 128px"
            className="block h-7 w-auto shrink-0 object-contain sm:h-8"
          />
        </Link>

        <ul className="hidden items-center gap-1 lg:flex">
          {NAV_ITEMS.map((item) => (
            <li key={item.href}>
              <a
                href={item.href}
                className="focus-ring whitespace-nowrap rounded-full px-3 py-2 text-sm font-medium text-white/85 transition hover:text-white"
              >
                {label(item)}
              </a>
            </li>
          ))}
        </ul>

        <div className="hidden items-center gap-1.5 lg:flex">
          {/* Language + theme toggles are utility controls — tone them down so
              the primary "Bepul boshlash" CTA is the dominant visual target.
              No bordered chip, no background pill — same compact size, less weight. */}
          <div className="opacity-75 transition hover:opacity-100">
            <LanguageSwitcher />
          </div>
          <div className="opacity-75 transition hover:opacity-100">
            <ThemeToggle />
          </div>
          <Link
            href="/login"
            className="focus-ring rounded-full px-4 py-2 text-sm font-semibold text-white/90 hover:text-white"
          >
            {locale === "ru" ? "Войти" : locale === "en" ? "Sign in" : "Kirish"}
          </Link>
          <Link href="/register" className="btn-aurora focus-ring">
            {locale === "ru" ? "Начать бесплатно" : locale === "en" ? "Get started" : "Bepul boshlash"}
          </Link>
        </div>

        <button
          type="button"
          aria-label={open ? "Close menu" : "Open menu"}
          aria-expanded={open}
          onClick={() => setOpen((v) => !v)}
          className="focus-ring grid h-10 w-10 shrink-0 place-items-center rounded-full border border-white/10 bg-white/[0.04] text-white lg:hidden"
        >
          {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </button>
      </nav>

      {open && (
        <div
          id="mobile-menu"
          className="border-t border-white/10 bg-[#0B1020]/95 backdrop-blur-xl lg:hidden"
        >
          <ul className="section-shell flex flex-col gap-1 py-4">
            {NAV_ITEMS.map((item) => (
              <li key={item.href}>
                <a
                  href={item.href}
                  onClick={() => setOpen(false)}
                  className="block rounded-2xl px-3 py-3 text-base font-medium text-white/80 hover:bg-white/[0.04] hover:text-white"
                >
                  {label(item)}
                </a>
              </li>
            ))}
            <li className="mt-2 flex items-center gap-2">
              <LanguageSwitcher />
              <ThemeToggle />
            </li>
            <li className="mt-3 grid grid-cols-2 gap-2">
              <Link
                href="/login"
                className="rounded-full border border-white/10 px-4 py-3 text-center text-sm font-semibold text-white/80"
              >
                {locale === "ru" ? "Войти" : locale === "en" ? "Sign in" : "Kirish"}
              </Link>
              <Link href="/register" className="btn-aurora">
                {locale === "ru" ? "Начать" : locale === "en" ? "Start" : "Boshlash"}
              </Link>
            </li>
          </ul>
        </div>
      )}
    </header>
  );
}

export default Nav;
