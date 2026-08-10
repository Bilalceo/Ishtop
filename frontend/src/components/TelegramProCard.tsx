"use client";

/**
 * "Subscribe to our Telegram channel → get PRO free" flow.
 * 3 steps: connect Telegram → subscribe to the channel → claim PRO.
 * The backend verifies channel membership before granting premium.
 */

import { useEffect, useState } from "react";
import { Send, CheckCircle2, Loader2, Crown, ArrowRight, X } from "lucide-react";
import { telegramApi } from "@/lib/api";
import { useTranslation } from "@/hooks/useTranslation";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";

const CHANNEL_URL = "https://t.me/ishtopuz_official";

export function TelegramProCard() {
  const { locale } = useTranslation();
  const { user } = useAuth();
  const ru = locale === "ru";
  const alreadyPro =
    user?.subscription_tier === "premium" || user?.subscription_tier === "enterprise";
  const [connected, setConnected] = useState<boolean | null>(null);
  const [loading, setLoading] = useState(false);
  const [granted, setGranted] = useState(false);
  // Persisted "don't show me this again" — so the offer never nags a user who
  // already subscribed (or simply isn't interested) on every dashboard visit.
  const dismissKey = user?.id ? `tg_pro_dismissed:${user.id}` : "tg_pro_dismissed";
  const [dismissed, setDismissed] = useState(true); // hidden until we read storage (no flash)
  useEffect(() => {
    if (typeof window === "undefined") return;
    setDismissed(localStorage.getItem(dismissKey) === "1");
  }, [dismissKey]);
  const dismiss = () => {
    setDismissed(true);
    try {
      localStorage.setItem(dismissKey, "1");
    } catch {
      /* ignore storage errors */
    }
  };

  const t = ru
    ? {
        title: "Получите PRO бесплатно",
        subtitle:
          "Подпишитесь на наш Telegram-канал и активируйте PRO на 30 дней — бесплатно.",
        step1: "1. Подключить Telegram",
        step1done: "Telegram подключён",
        step2: "2. Подписаться на канал",
        step3: "3. Получить PRO",
        checking: "Проверяем…",
        grantedMsg: "🎉 PRO активирован на 30 дней!",
        notLinked: "Сначала подключите Telegram.",
        notSub: "Вы не подписаны на канал. Подпишитесь и попробуйте снова.",
        alreadyPro: "У вас уже активен PRO.",
        err: "Ошибка. Попробуйте снова.",
      }
    : {
        title: "PRO'ni bepul oling",
        subtitle:
          "Telegram kanalimizga obuna bo'ling va PRO'ni 30 kunga bepul faollashtiring.",
        step1: "1. Telegram'ni ulash",
        step1done: "Telegram ulangan",
        step2: "2. Kanalga obuna bo'lish",
        step3: "3. PRO'ni olish",
        checking: "Tekshirilmoqda…",
        grantedMsg: "🎉 PRO 30 kunga faollashtirildi!",
        notLinked: "Avval Telegram'ni ulang.",
        notSub: "Kanalga obuna bo'lmagansiz. Obuna bo'lib, qayta urining.",
        alreadyPro: "Sizda allaqachon PRO faol.",
        err: "Xatolik. Qayta urinib ko'ring.",
      };

  const isGuest = !user;

  useEffect(() => {
    if (alreadyPro || isGuest) return; // guests: no authed calls from a public page
    telegramApi
      .link()
      .then(async (r) => {
        const isConnected = !!r.data?.data?.connected;
        setConnected(isConnected);
        // If they've already connected Telegram, try to activate PRO silently.
        // Subscribed users then get PRO without clicking and the card disappears
        // — so it stops re-appearing on every visit. Not subscribed -> no-op.
        if (isConnected) {
          try {
            const c = await telegramApi.claimPro();
            const d = c.data?.data || {};
            if (d.granted || d.reason === "already_pro") {
              setGranted(true);
              dismiss();
            }
          } catch {
            /* ignore — user can still claim manually */
          }
        }
      })
      .catch(() => setConnected(false));
  }, [alreadyPro, isGuest]);

  // Existing PRO users, or anyone who dismissed the offer, don't see it.
  if (alreadyPro || dismissed) return null;

  const connect = async () => {
    if (isGuest) {
      window.location.href = "/register";
      return;
    }
    setLoading(true);
    try {
      const r = await telegramApi.link();
      const link = r.data?.data?.deep_link as string;
      if (link) {
        const w = window.open(link, "_blank", "noopener,noreferrer");
        if (!w) window.location.href = link;
      }
      setTimeout(
        () =>
          telegramApi
            .link()
            .then((res) => setConnected(!!res.data?.data?.connected))
            .catch(() => {}),
        6000,
      );
    } catch {
      toast.error(t.err);
    } finally {
      setLoading(false);
    }
  };

  const claim = async () => {
    if (isGuest) {
      window.location.href = "/register";
      return;
    }
    setLoading(true);
    try {
      const r = await telegramApi.claimPro();
      const d = r.data?.data || {};
      if (d.granted) {
        setGranted(true);
        toast.success(t.grantedMsg);
      } else if (d.reason === "already_pro") {
        setGranted(true);
        toast.success(t.alreadyPro);
      } else if (d.reason === "not_linked") {
        setConnected(false);
        toast.error(t.notLinked);
      } else {
        toast.error(t.notSub);
      }
    } catch {
      toast.error(t.err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="relative overflow-hidden rounded-3xl border border-[#f0d9c2] bg-gradient-to-br from-[#fff3e8] via-white to-[#f3eeff] p-6 dark:border-white/[0.06] dark:from-brand-500/10 dark:via-surface-900 dark:to-surface-900 sm:p-7">
      <button
        type="button"
        onClick={dismiss}
        aria-label={ru ? "Закрыть" : "Yopish"}
        className="absolute right-3 top-3 z-10 grid h-8 w-8 place-items-center rounded-full text-surface-400 transition hover:bg-black/5 hover:text-surface-700 dark:hover:bg-white/10 dark:hover:text-white"
      >
        <X className="h-4 w-4" />
      </button>
      <div className="flex items-center gap-3 pr-8">
        <span className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-[#2e4278] text-white">
          <Crown className="h-6 w-6" />
        </span>
        <div>
          <h3 className="font-display text-lg font-bold text-surface-900 dark:text-white">
            {t.title}
          </h3>
          <p className="text-sm text-surface-500 dark:text-surface-400">{t.subtitle}</p>
        </div>
      </div>

      {granted ? (
        <div className="mt-5 flex items-center gap-2 rounded-2xl bg-[#d9f1e4] px-4 py-3 text-sm font-semibold text-[#2f7a56]">
          <CheckCircle2 className="h-5 w-5" />
          {t.grantedMsg}
        </div>
      ) : (
        <div className="mt-5 flex flex-col gap-2.5">
          {/* Step 1 — connect */}
          {connected ? (
            <div className="flex items-center gap-2 rounded-xl bg-white/70 px-4 py-2.5 text-sm font-medium text-[#2f7a56] dark:bg-surface-800/60">
              <CheckCircle2 className="h-4 w-4" />
              {t.step1done}
            </div>
          ) : (
            <button
              type="button"
              onClick={connect}
              disabled={loading || connected === null}
              className="btn-silver-primary group justify-between disabled:opacity-60"
            >
              <span className="inline-flex items-center gap-2">
                <Send className="h-4 w-4" />
                {t.step1}
              </span>
              <ArrowRight className="h-4 w-4 transition group-hover:translate-x-0.5" />
            </button>
          )}

          {/* Step 2 — subscribe */}
          <a
            href={CHANNEL_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="btn-silver-ghost group justify-between !bg-white/70 dark:!bg-surface-800/60"
          >
            <span className="inline-flex items-center gap-2">
              <Send className="h-4 w-4" />
              {t.step2}
            </span>
            <ArrowRight className="h-4 w-4 transition group-hover:translate-x-0.5" />
          </a>

          {/* Step 3 — claim */}
          <button
            type="button"
            onClick={claim}
            disabled={loading}
            className="inline-flex items-center justify-center gap-2 rounded-full bg-[#2e4278] px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-[#3856a5] disabled:opacity-60"
          >
            {loading ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                {t.checking}
              </>
            ) : (
              <>
                <Crown className="h-4 w-4" />
                {t.step3}
              </>
            )}
          </button>
        </div>
      )}
    </div>
  );
}

export default TelegramProCard;
