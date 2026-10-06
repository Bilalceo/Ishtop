"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Download, X } from "lucide-react";
import { AnimatePresence, motion } from "framer-motion";

import api from "@/lib/api";

const DISMISS_KEY = "ishtop_pwa_install_dismissed_v1";
const DISMISS_DAYS = 14;
// Chrome fires beforeinstallprompt a second or two after load; waiting a beat
// keeps the banner from competing with the page painting.
const SHOW_AFTER_MS = 2500;
const FALLBACK_TOP = 76;

type BIPEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
};

type Platform = "ios" | "android" | "desktop" | "other";
type Browser = "safari" | "chrome" | "firefox" | "edge" | "samsung" | "other";

function detect(): { platform: Platform; browser: Browser } {
  if (typeof navigator === "undefined") return { platform: "other", browser: "other" };
  const ua = navigator.userAgent;
  const ios =
    /iphone|ipad|ipod/i.test(ua) ||
    // iPadOS reports itself as a Mac, but a Mac has no touch points
    (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);

  const platform: Platform = ios
    ? "ios"
    : /android/i.test(ua)
      ? "android"
      : /windows|macintosh|linux/i.test(ua)
        ? "desktop"
        : "other";

  // On iOS every browser is WebKit, so the real question is whether this is
  // Safari itself — the others put Add to Home Screen somewhere else, or not
  // at all, and sending someone to a menu that isn't there is worse than
  // saying nothing.
  const browser: Browser = /crios/i.test(ua)
    ? "chrome"
    : /fxios|firefox/i.test(ua)
      ? "firefox"
      : /edgios|edg\//i.test(ua)
        ? "edge"
        : /samsungbrowser/i.test(ua)
          ? "samsung"
          : /chrome/i.test(ua)
            ? "chrome"
            : /safari/i.test(ua)
              ? "safari"
              : "other";

  return { platform, browser };
}

/** The iOS share glyph — a box with an arrow leaving the top. */
function ShareGlyph({ className = "" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className} aria-hidden>
      <path d="M12 3v11M12 3l-3.2 3.2M12 3l3.2 3.2" stroke="currentColor"
            strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M6 11H4.8A1.8 1.8 0 0 0 3 12.8v6.4A1.8 1.8 0 0 0 4.8 21h14.4a1.8 1.8 0 0 0 1.8-1.8v-6.4A1.8 1.8 0 0 0 19.2 11H18"
            stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" />
    </svg>
  );
}

/** A miniature of the row people are looking for inside the share sheet. */
function ShareSheetRow() {
  return (
    <div className="mt-2 flex items-center justify-between rounded-lg border border-surface-200 bg-surface-50 px-3 py-2 dark:border-surface-700 dark:bg-surface-900/60">
      <span className="text-xs font-medium text-surface-800 dark:text-surface-100">
        Bosh ekranga qo&apos;shish
      </span>
      <span className="grid h-5 w-5 place-items-center rounded border border-surface-300 text-surface-500 dark:border-surface-600">
        <svg viewBox="0 0 24 24" className="h-3 w-3" fill="none" aria-hidden>
          <path d="M12 5v14M5 12h14" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" />
        </svg>
      </span>
    </div>
  );
}

export default function InstallPrompt() {
  const [deferred, setDeferred] = useState<BIPEvent | null>(null);
  const [mode, setMode] = useState<"none" | "native" | "ios" | "ios-other">("none");
  // The banner sits under the page header, and the header is a different
  // height on the dashboard and the landing page, so it is measured.
  const [top, setTop] = useState(FALLBACK_TOP);
  const env = useRef(detect());
  const timer = useRef<ReturnType<typeof setTimeout>>(undefined);

  const report = useCallback((event: string) => {
    const { platform, browser } = env.current;
    // telemetry must never break the page or block the tap
    api.post("/pwa/event", { event, platform, browser }).catch(() => {});
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return;

    const standalone =
      window.matchMedia?.("(display-mode: standalone)").matches ||
      (window.navigator as unknown as { standalone?: boolean }).standalone === true;
    if (standalone) return; // already installed

    try {
      const at = Number(localStorage.getItem(DISMISS_KEY) || 0);
      if (at && Date.now() - at < DISMISS_DAYS * 86_400_000) return;
    } catch {
      // storage blocked — still worth offering
    }

    const measure = () => {
      const h = document.querySelector("header")?.getBoundingClientRect().height;
      setTop(h && h > 24 ? Math.round(h) + 12 : FALLBACK_TOP);
    };
    measure();
    window.addEventListener("resize", measure);

    const show = (m: "native" | "ios" | "ios-other") => {
      measure();
      setMode((cur) => {
        if (cur !== "none") return cur;
        report("pwa_prompt_shown");
        return m;
      });
    };

    const onPrompt = (e: Event) => {
      e.preventDefault();
      setDeferred(e as BIPEvent);
      show("native");
    };
    const onInstalled = () => {
      report("pwa_installed");
      setMode("none");
    };
    window.addEventListener("beforeinstallprompt", onPrompt);
    window.addEventListener("appinstalled", onInstalled);

    // iOS never fires beforeinstallprompt — Apple exposes no install API at
    // all — so the banner is shown on a timer and explains the manual steps.
    if (env.current.platform === "ios") {
      timer.current = setTimeout(
        () => show(env.current.browser === "safari" ? "ios" : "ios-other"),
        SHOW_AFTER_MS,
      );
    }

    return () => {
      window.removeEventListener("beforeinstallprompt", onPrompt);
      window.removeEventListener("appinstalled", onInstalled);
      window.removeEventListener("resize", measure);
      if (timer.current) clearTimeout(timer.current);
    };
  }, [report]);

  const dismiss = () => {
    report("pwa_dismissed");
    try {
      localStorage.setItem(DISMISS_KEY, String(Date.now()));
    } catch {
      // ignore
    }
    setMode("none");
  };

  const install = async () => {
    if (!deferred) return;
    report("pwa_install_clicked");
    try {
      await deferred.prompt();
      await deferred.userChoice;
    } catch {
      // the browser withdrew the prompt; nothing to recover
    } finally {
      setDeferred(null);
      setMode("none");
    }
  };

  const isIOS = mode === "ios" || mode === "ios-other";

  return (
    <AnimatePresence>
      {mode !== "none" && (
        <motion.aside
          role="dialog"
          aria-label="IshTop ilovasini o'rnatish"
          initial={{ y: -24, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: -24, opacity: 0 }}
          transition={{ type: "spring", stiffness: 300, damping: 30 }}
          /* Centred with inset-x + mx-auto, not left-1/2 + -translate-x-1/2:
             framer-motion writes `transform` inline for the slide, which wipes
             out a Tailwind translate and left the card hanging off the right
             edge of a phone with its text cut off. */
          className="fixed inset-x-2.5 z-[80] mx-auto max-w-[460px] rounded-2xl border border-surface-200 bg-white p-4 shadow-[0_16px_50px_-12px_rgba(23,27,39,0.28)] dark:border-surface-700 dark:bg-surface-800"
          style={{ top: `calc(env(safe-area-inset-top, 0px) + ${top}px)` }}
        >
          <div className="flex items-start gap-3">
            <div className="grid h-11 w-11 flex-shrink-0 place-items-center overflow-hidden rounded-xl bg-[#EEF3FD]">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src="/icon-192.png" alt="" className="h-11 w-11" />
            </div>

            <div className="min-w-0 flex-1">
              <p className="text-[15px] font-semibold leading-tight text-surface-900 dark:text-white">
                IshTop ilovasini o&apos;rnatish
              </p>

              {mode === "native" && (
                <>
                  <p className="mt-1 text-xs leading-snug text-surface-500">
                    Bosh ekraningizga qo&apos;shing — tezroq ochiladi va oflayn ham ishlaydi.
                  </p>
                  <div className="mt-3 flex items-center gap-2">
                    <button
                      type="button"
                      onClick={install}
                      className="inline-flex items-center gap-1.5 rounded-lg bg-[#5782E0] px-3.5 py-2 text-xs font-semibold text-white hover:bg-[#4a72cc]"
                    >
                      <Download className="h-3.5 w-3.5" />
                      O&apos;rnatish
                    </button>
                    <button
                      type="button"
                      onClick={dismiss}
                      className="rounded-lg px-3 py-2 text-xs text-surface-600 hover:bg-surface-100 dark:text-surface-300 dark:hover:bg-surface-700"
                    >
                      Keyinroq
                    </button>
                  </div>
                </>
              )}

              {mode === "ios" && (
                <>
                  <p className="mt-1 text-xs leading-snug text-surface-500">
                    iPhone&apos;da buni Safari&apos;ning o&apos;zi qiladi — ikki qadam:
                  </p>
                  <ol className="mt-2 space-y-2">
                    <li className="flex items-start gap-2 text-xs text-surface-700 dark:text-surface-200">
                      <span className="mt-px grid h-5 w-5 flex-none place-items-center rounded-full bg-[#EEF3FD] text-[10px] font-bold text-[#5782E0]">1</span>
                      <span className="flex items-center gap-1.5">
                        Pastdagi <ShareGlyph className="inline h-4 w-4 text-[#5782E0]" />
                        <strong>Ulashish</strong> tugmasi
                      </span>
                    </li>
                    <li className="text-xs text-surface-700 dark:text-surface-200">
                      <span className="flex items-start gap-2">
                        <span className="mt-px grid h-5 w-5 flex-none place-items-center rounded-full bg-[#EEF3FD] text-[10px] font-bold text-[#5782E0]">2</span>
                        <span>Ro&apos;yxatdan shuni tanlang:</span>
                      </span>
                      <ShareSheetRow />
                    </li>
                  </ol>
                  <button
                    type="button"
                    onClick={dismiss}
                    className="mt-3 rounded-lg px-3 py-2 text-xs text-surface-600 hover:bg-surface-100 dark:text-surface-300 dark:hover:bg-surface-700"
                  >
                    Tushunarli
                  </button>
                </>
              )}

              {mode === "ios-other" && (
                <>
                  <p className="mt-1 text-xs leading-snug text-surface-500">
                    Bosh ekranga qo&apos;shish iPhone&apos;da faqat Safari orqali ishlaydi.
                    Shu sahifani <strong>Safari</strong>&apos;da oching, so&apos;ng Ulashish →
                    &quot;Bosh ekranga qo&apos;shish&quot;.
                  </p>
                  <button
                    type="button"
                    onClick={dismiss}
                    className="mt-3 rounded-lg px-3 py-2 text-xs text-surface-600 hover:bg-surface-100 dark:text-surface-300 dark:hover:bg-surface-700"
                  >
                    Tushunarli
                  </button>
                </>
              )}
            </div>

            <button
              type="button"
              onClick={dismiss}
              aria-label="Yopish"
              className="rounded-lg p-1 text-surface-400 hover:bg-surface-100 dark:hover:bg-surface-700"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          {/* On iOS the share button lives in the bottom bar, so a pointer
              downward is the fastest way to say where to look. */}
          {isIOS && mode === "ios" && (
            <motion.div
              aria-hidden
              className="pointer-events-none absolute -bottom-7 left-1/2 -ml-3 text-[#5782E0]"
              animate={{ y: [0, 7, 0] }}
              transition={{ duration: 1.4, repeat: Infinity, ease: "easeInOut" }}
            >
              <svg viewBox="0 0 24 24" className="h-6 w-6" fill="none">
                <path d="M12 4v14M12 18l-5-5M12 18l5-5" stroke="currentColor"
                      strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </motion.div>
          )}
        </motion.aside>
      )}
    </AnimatePresence>
  );
}
