"use client";

import { useEffect, useRef, useState } from "react";
import { Download, Share, SquarePlus, X } from "lucide-react";
import { AnimatePresence, motion } from "framer-motion";

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

/** iOS has no beforeinstallprompt — Safari only offers Share › Add to Home
 *  Screen, and a user who is not told that never finds it. */
function isIOS(): boolean {
  if (typeof navigator === "undefined") return false;
  const ua = navigator.userAgent;
  return (
    /iphone|ipad|ipod/i.test(ua) ||
    // iPadOS reports itself as a Mac, but a Mac has no touch points
    (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1)
  );
}

export default function InstallPrompt() {
  const [deferred, setDeferred] = useState<BIPEvent | null>(null);
  const [mode, setMode] = useState<"none" | "native" | "ios">("none");
  // The banner sits under the page header, and the header is a different
  // height on the dashboard and the landing page, so it is measured rather
  // than guessed.
  const [top, setTop] = useState(FALLBACK_TOP);
  const timer = useRef<ReturnType<typeof setTimeout>>(undefined);

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

    const onPrompt = (e: Event) => {
      e.preventDefault();
      setDeferred(e as BIPEvent);
      measure();
      setMode("native");
    };
    const onInstalled = () => setMode("none");
    window.addEventListener("beforeinstallprompt", onPrompt);
    window.addEventListener("appinstalled", onInstalled);

    if (isIOS()) {
      timer.current = setTimeout(() => {
        measure();
        setMode((m) => (m === "none" ? "ios" : m));
      }, SHOW_AFTER_MS);
    }

    return () => {
      window.removeEventListener("beforeinstallprompt", onPrompt);
      window.removeEventListener("appinstalled", onInstalled);
      window.removeEventListener("resize", measure);
      if (timer.current) clearTimeout(timer.current);
    };
  }, []);

  const dismiss = () => {
    try {
      localStorage.setItem(DISMISS_KEY, String(Date.now()));
    } catch {
      // ignore
    }
    setMode("none");
  };

  const install = async () => {
    if (!deferred) return;
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
          /* Above the chat button (z-60), below full-screen overlays (z-100).
             It used to sit at the bottom at the same height as that button,
             which covered its right edge. */
          /* Centred with left/right + mx-auto, not left-1/2 + -translate-x-1/2:
             framer-motion writes `transform` inline for the slide, which wipes
             out the Tailwind translate and left the card hanging off the right
             edge of a phone screen with its text cut off. */
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

              {mode === "native" ? (
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
              ) : (
                <>
                  <p className="mt-1 text-xs leading-snug text-surface-500">
                    Ikki qadamda bosh ekraningizga qo&apos;shiladi:
                  </p>
                  <ol className="mt-2 space-y-1.5 text-xs text-surface-700 dark:text-surface-200">
                    <li className="flex items-center gap-2">
                      <Share className="h-4 w-4 flex-none text-[#5782E0]" aria-hidden />
                      <span>
                        Pastdagi <strong>Ulashish</strong> tugmasini bosing
                      </span>
                    </li>
                    <li className="flex items-center gap-2">
                      <SquarePlus className="h-4 w-4 flex-none text-[#5782E0]" aria-hidden />
                      <span>
                        <strong>&quot;Bosh ekranga qo&apos;shish&quot;</strong> ni tanlang
                      </span>
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
        </motion.aside>
      )}
    </AnimatePresence>
  );
}
