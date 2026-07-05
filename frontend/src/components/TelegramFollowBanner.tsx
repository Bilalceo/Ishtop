"use client";

/**
 * Dismissible "follow us on Telegram" banner — converts existing site
 * traffic into channel subscribers. Silver design, once-dismissable per
 * placement via localStorage. Drop it on high-traffic authed pages.
 */

import { useEffect, useState } from "react";
import { Send, X, ArrowRight } from "lucide-react";
import { useTranslation } from "@/hooks/useTranslation";

const CHANNEL_URL = "https://t.me/ishtopuz_official";

export function TelegramFollowBanner({ storageKey = "tg_follow" }: { storageKey?: string }) {
  const { locale } = useTranslation();
  const ru = locale === "ru";
  const [show, setShow] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;
    setShow(window.localStorage.getItem(storageKey) !== "1");
  }, [storageKey]);

  const dismiss = () => {
    try {
      window.localStorage.setItem(storageKey, "1");
    } catch {
      /* ignore */
    }
    setShow(false);
  };

  if (!show) return null;

  return (
    <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-[#d7e7ff] via-[#e3ddff] to-[#eef1ff] p-4 dark:from-brand-500/15 dark:via-violet-500/10 dark:to-surface-900 sm:p-5">
      <button
        type="button"
        onClick={dismiss}
        aria-label={ru ? "Закрыть" : "Yopish"}
        className="absolute right-3 top-3 rounded-lg p-1 text-[#5470b8] transition hover:bg-white/50 dark:text-white/50"
      >
        <X className="h-4 w-4" />
      </button>

      <div className="flex flex-col items-start gap-3 pr-6 sm:flex-row sm:items-center sm:justify-between sm:gap-4">
        <div className="flex items-center gap-3">
          <span className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-white text-[#3856a5] shadow-[0_4px_12px_-4px_rgba(56,86,165,0.4)]">
            <Send className="h-5 w-5" />
          </span>
          <div className="min-w-0">
            <p className="text-sm font-semibold text-[#2e4278] dark:text-white">
              {ru ? "Мы в Telegram!" : "Telegram'dagi rasmiy kanalimiz"}
            </p>
            <p className="text-xs text-[#4a5a85] dark:text-white/70">
              {ru
                ? "Каждый день новые вакансии и карьерные советы."
                : "Har kuni yangi ish o'rinlari va karyera maslahatlari."}
            </p>
          </div>
        </div>

        <a
          href={CHANNEL_URL}
          target="_blank"
          rel="noopener noreferrer"
          onClick={dismiss}
          className="group inline-flex shrink-0 items-center gap-1.5 rounded-full bg-[#2e4278] px-4 py-2 text-sm font-semibold text-white transition hover:bg-[#3856a5] dark:bg-white dark:text-[#2e4278]"
        >
          {ru ? "Подписаться" : "Obuna bo'lish"}
          <ArrowRight className="h-3.5 w-3.5 transition group-hover:translate-x-0.5" aria-hidden />
        </a>
      </div>
    </div>
  );
}

export default TelegramFollowBanner;
