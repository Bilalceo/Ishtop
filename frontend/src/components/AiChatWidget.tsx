"use client";

/**
 * Floating AI assistant — a bottom-right chat bubble that opens a compact
 * conversation panel. Replaces the old sidebar helper card. Multi-turn UI over
 * the existing /ai/help-assistant endpoint; silver design, UZ/RU.
 */

import { useEffect, useRef, useState } from "react";
import { usePathname } from "next/navigation";
import { AnimatePresence, motion } from "framer-motion";
import { Sparkles, Send, X, Loader2, MessageCircle } from "lucide-react";
import { aiApi, getErrorMessage } from "@/lib/api";
import { useTranslation } from "@/hooks/useTranslation";

type Msg = { role: "user" | "ai"; text: string };

export function AiChatWidget() {
  const { locale } = useTranslation();
  const pathname = usePathname();
  const ru = locale === "ru";
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState("");
  const [loading, setLoading] = useState(false);
  const [msgs, setMsgs] = useState<Msg[]>([]);
  const scrollRef = useRef<HTMLDivElement>(null);

  const t = {
    title: ru ? "AI-помощник" : "AI yordamchi",
    hint: ru
      ? "Спросите что угодно об ishtopuz.uz"
      : "ishtopuz.uz haqida istalgan savol bering",
    placeholder: ru ? "Задайте вопрос..." : "Savol yozing...",
    greeting: ru
      ? "Привет! Я помогу с резюме, поиском работы, откликами и не только. Спросите!"
      : "Salom! Rezyume, ish topish, ariza va boshqalarda yordam beraman. Savolingizni yozing!",
    open: ru ? "Открыть AI-помощник" : "AI yordamchini ochish",
    close: ru ? "Закрыть" : "Yopish",
  };

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [msgs, loading]);

  const ask = async () => {
    const question = q.trim();
    if (!question || loading) return;
    setMsgs((m) => [...m, { role: "user", text: question }]);
    setQ("");
    setLoading(true);
    try {
      const res = await aiApi.projectHelp({
        question,
        locale: ru ? "ru" : "uz",
        context_page: pathname || undefined,
      });
      const answer =
        (res.data as { data?: { answer?: string } })?.data?.answer ||
        (ru
          ? "Помощник пока не ответил. Попробуйте снова."
          : "Yordamchi hozircha javob bermadi. Qayta urinib ko'ring.");
      setMsgs((m) => [...m, { role: "ai", text: answer }]);
    } catch (error) {
      setMsgs((m) => [...m, { role: "ai", text: getErrorMessage(error) }]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      {/* Panel */}
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.96 }}
            transition={{ type: "spring", stiffness: 380, damping: 30 }}
            className="fixed bottom-24 right-4 z-[60] flex h-[min(560px,72vh)] w-[min(384px,calc(100vw-2rem))] flex-col overflow-hidden rounded-3xl border border-surface-200/70 bg-white shadow-[0_20px_60px_-20px_rgba(24,24,27,0.35)] dark:border-white/[0.08] dark:bg-surface-900 sm:right-6"
            role="dialog"
            aria-label={t.title}
          >
            {/* Header */}
            <div className="flex items-center justify-between gap-3 border-b border-surface-200/70 bg-gradient-to-r from-[#d7e7ff] via-[#e3ddff] to-[#eef1ff] px-4 py-3.5 dark:border-white/[0.06] dark:from-brand-500/15 dark:via-violet-500/10 dark:to-surface-900">
              <div className="flex items-center gap-2.5">
                <span className="grid h-9 w-9 place-items-center rounded-2xl bg-white text-[#3856a5] shadow-sm">
                  <Sparkles className="h-4.5 w-4.5" />
                </span>
                <div>
                  <p className="text-sm font-semibold text-[#2e4278] dark:text-white">{t.title}</p>
                  <p className="text-[11px] text-[#4a5a85] dark:text-white/60">{t.hint}</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setOpen(false)}
                aria-label={t.close}
                className="grid h-8 w-8 place-items-center rounded-lg text-[#5470b8] transition hover:bg-white/60 dark:text-white/60 dark:hover:bg-white/10"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* Messages */}
            <div ref={scrollRef} className="flex-1 space-y-3 overflow-y-auto px-4 py-4">
              <div className="flex gap-2">
                <span className="mt-0.5 grid h-7 w-7 shrink-0 place-items-center rounded-full bg-[#e3ddff] text-[#5b4a9e]">
                  <Sparkles className="h-3.5 w-3.5" />
                </span>
                <div className="rounded-2xl rounded-tl-sm bg-surface-100 px-3.5 py-2.5 text-sm text-surface-700 dark:bg-surface-800 dark:text-surface-200">
                  {t.greeting}
                </div>
              </div>

              {msgs.map((m, i) =>
                m.role === "user" ? (
                  <div key={i} className="flex justify-end">
                    <div className="max-w-[85%] rounded-2xl rounded-tr-sm bg-brand-500 px-3.5 py-2.5 text-sm text-white">
                      {m.text}
                    </div>
                  </div>
                ) : (
                  <div key={i} className="flex gap-2">
                    <span className="mt-0.5 grid h-7 w-7 shrink-0 place-items-center rounded-full bg-[#e3ddff] text-[#5b4a9e]">
                      <Sparkles className="h-3.5 w-3.5" />
                    </span>
                    <div className="max-w-[85%] whitespace-pre-wrap rounded-2xl rounded-tl-sm bg-surface-100 px-3.5 py-2.5 text-sm leading-relaxed text-surface-700 dark:bg-surface-800 dark:text-surface-200">
                      {m.text}
                    </div>
                  </div>
                ),
              )}

              {loading && (
                <div className="flex gap-2">
                  <span className="mt-0.5 grid h-7 w-7 shrink-0 place-items-center rounded-full bg-[#e3ddff] text-[#5b4a9e]">
                    <Sparkles className="h-3.5 w-3.5" />
                  </span>
                  <div className="flex items-center gap-1.5 rounded-2xl rounded-tl-sm bg-surface-100 px-3.5 py-3 dark:bg-surface-800">
                    <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-surface-400 [animation-delay:-0.3s]" />
                    <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-surface-400 [animation-delay:-0.15s]" />
                    <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-surface-400" />
                  </div>
                </div>
              )}
            </div>

            {/* Input */}
            <div className="border-t border-surface-200/70 p-3 dark:border-white/[0.06]">
              <div className="relative">
                <input
                  value={q}
                  onChange={(e) => setQ(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && !e.shiftKey) {
                      e.preventDefault();
                      void ask();
                    }
                  }}
                  placeholder={t.placeholder}
                  className="h-11 w-full rounded-xl border border-surface-200 bg-surface-50 pl-4 pr-11 text-sm outline-none transition focus:border-brand-400 focus:bg-white focus:ring-1 focus:ring-brand-400 dark:border-surface-700 dark:bg-surface-800 dark:focus:bg-surface-900"
                />
                <button
                  type="button"
                  onClick={() => void ask()}
                  disabled={loading || !q.trim()}
                  aria-label={ru ? "Отправить" : "Yuborish"}
                  className="absolute right-1.5 top-1/2 grid h-8 w-8 -translate-y-1/2 place-items-center rounded-lg bg-brand-500 text-white transition hover:bg-brand-600 disabled:opacity-35"
                >
                  {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Floating button */}
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-label={t.open}
        aria-expanded={open}
        className="fixed bottom-5 right-4 z-[60] grid h-14 w-14 place-items-center rounded-full bg-gradient-to-br from-brand-500 to-violet-600 text-white shadow-[0_12px_32px_-8px_rgba(111,155,240,0.6)] transition hover:scale-105 active:scale-95 sm:right-6"
      >
        <span className="absolute -right-0.5 -top-0.5 grid h-5 w-5 place-items-center rounded-full bg-[#7cc7a2] text-[9px] font-bold text-white ring-2 ring-white dark:ring-surface-900">
          AI
        </span>
        <AnimatePresence mode="wait" initial={false}>
          {open ? (
            <motion.span key="x" initial={{ rotate: -90, opacity: 0 }} animate={{ rotate: 0, opacity: 1 }} exit={{ rotate: 90, opacity: 0 }}>
              <X className="h-6 w-6" />
            </motion.span>
          ) : (
            <motion.span key="c" initial={{ rotate: 90, opacity: 0 }} animate={{ rotate: 0, opacity: 1 }} exit={{ rotate: -90, opacity: 0 }}>
              <MessageCircle className="h-6 w-6" />
            </motion.span>
          )}
        </AnimatePresence>
      </button>
    </>
  );
}

export default AiChatWidget;
