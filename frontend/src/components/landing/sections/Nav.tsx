"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { Menu, X } from "lucide-react";
import { LanguageSwitcher } from "@/components/ui/language-switcher";
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
    <header className="fixed inset-x-0 top-0 z-50 px-3 pt-3 sm:px-5 sm:pt-4" aria-label="Primary">
      {/* Floating island nav — white glass pill on the silver ground */}
      <nav
        className={`mx-auto flex h-14 max-w-5xl items-center justify-between rounded-full bg-white/75 px-4 backdrop-blur-xl transition-shadow duration-300 sm:h-16 sm:px-6 ${
          scrolled
            ? "shadow-[0_18px_40px_-18px_rgba(24,24,27,0.28)]"
            : "shadow-[0_6px_20px_-10px_rgba(24,24,27,0.16)]"
        }`}
      >
        <Link href="/" className="focus-ring flex items-center rounded-xl" aria-label="IshTop home">
          <Image
            src="/logo-ishtop.png?v=3"
            alt="IshTop"
            width={1025}
            height={292}
            priority
            className="h-6 w-auto sm:h-7"
          />
        </Link>

        <ul className="hidden items-center gap-1 md:flex">
          {NAV_ITEMS.map((item) => (
            <li key={item.href}>
              <a
                href={item.href}
                className="focus-ring whitespace-nowrap rounded-full px-3.5 py-2 text-sm font-medium text-[#52525b] transition hover:bg-[#f1f1ef] hover:text-[#18181b]"
              >
                {label(item)}
              </a>
            </li>
          ))}
        </ul>

        <div className="hidden items-center gap-1.5 md:flex">
          <div className="opacity-80 transition hover:opacity-100">
            <LanguageSwitcher />
          </div>
          <Link
            href="/login"
            className="focus-ring rounded-full px-4 py-2 text-sm font-semibold text-[#3f3f46] hover:text-[#18181b]"
          >
            {locale === "ru" ? "Войти" : locale === "en" ? "Sign in" : "Kirish"}
          </Link>
          <Link href="/register" className="btn-silver-primary !px-5 !py-2.5">
            {locale === "ru" ? "Начать бесплатно" : locale === "en" ? "Get started" : "Bepul boshlash"}
          </Link>
        </div>

        <button
          type="button"
          aria-label={open ? "Close menu" : "Open menu"}
          aria-expanded={open}
          onClick={() => setOpen((v) => !v)}
          className="focus-ring grid h-10 w-10 place-items-center rounded-full bg-[#f1f1ef] text-[#18181b] md:hidden"
        >
          {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </button>
      </nav>

      {open && (
        <div
          id="mobile-menu"
          className="mx-auto mt-2 max-w-5xl rounded-3xl bg-white/90 shadow-[0_24px_50px_-20px_rgba(24,24,27,0.3)] backdrop-blur-xl md:hidden"
        >
          <ul className="flex flex-col gap-1 p-4">
            {NAV_ITEMS.map((item) => (
              <li key={item.href}>
                <a
                  href={item.href}
                  onClick={() => setOpen(false)}
                  className="block rounded-2xl px-3 py-3 text-base font-medium text-[#3f3f46] hover:bg-[#f1f1ef] hover:text-[#18181b]"
                >
                  {label(item)}
                </a>
              </li>
            ))}
            <li className="mt-2 flex items-center gap-2">
              <LanguageSwitcher align="left" />
            </li>
            <li className="mt-3 grid grid-cols-2 gap-2">
              <Link
                href="/login"
                className="rounded-full bg-[#f1f1ef] px-4 py-3 text-center text-sm font-semibold text-[#18181b]"
              >
                {locale === "ru" ? "Войти" : locale === "en" ? "Sign in" : "Kirish"}
              </Link>
              <Link href="/register" className="btn-silver-primary !py-3">
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
