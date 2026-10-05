"use client";

import { useEffect, useState } from "react";
import { Download, Share, SquarePlus, X } from "lucide-react";
import { AnimatePresence, motion } from "framer-motion";

const DISMISS_KEY = "ishtop_pwa_install_dismissed_v1";
const DISMISS_DAYS = 14;
// Chrome fires beforeinstallprompt within a second or two of load; waiting a
// beat keeps the card from competing with the page painting.
const SHOW_AFTER_MS = 2500;

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

    const onPrompt = (e: Event) => {
      e.preventDefault();
      setDeferred(e as BIPEvent);
      setMode("native");
    };
    const onInstalled = () => setMode("none");
    window.addEventListener("beforeinstallprompt", onPrompt);
    window.addEventListener("appinstalled", onInstalled);

    // iOS never fires the event, so the instructions are shown on a timer
    let timer: ReturnType<typeof setTimeout> | undefined;
    if (isIOS()) {
      timer = setTimeout(() => setMode((m) => (m === "none" ? "ios" : m)), SHOW_AFTER_MS);
    }

    return () => {
      window.removeEventListener("beforeinstallprompt", onPrompt);
      window.removeEventListener("appinstalled", onInstalled);
      if (timer) clearTimeout(timer);
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
          initial={{ y: 80, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: 80, opacity: 0 }}
          transition={{ type: "spring", stiffness: 280, damping: 28 }}
          className="fixed left-1/2 z-[60] w-[min(420px,calc(100vw-24px))] -translate-x-1/2 rounded-2xl border border-surface-200 bg-white p-4 shadow-2xl dark:border-surface-700 dark:bg-surface-800"
          style={{ bottom: "calc(env(safe-area-inset-bottom, 0px) + 80px)" }}
        >
          <div className="flex items-start gap-3">
            <div className="grid h-10 w-10 flex-shrink-0 place-items-center rounded-xl bg-[#5782E0] text-white">
              <Download className="h-5 w-5" />
            </div>

            <div className="min-w-0 flex-1">
              <p className="text-sm font-semibold text-surface-900 dark:text-white">
                IshTop ilovasini o&apos;rnatish
              </p>

              {mode === "native" ? (
                <>
                  <p className="mt-0.5 text-xs text-surface-500">
                    Telefoningizga qo&apos;shing — tezroq ochiladi va oflayn ham ishlaydi.
                  </p>
                  <div className="mt-3 flex items-center gap-2">
                    <button
                      type="button"
                      onClick={install}
                      className="rounded-lg bg-[#5782E0] px-3 py-1.5 text-xs font-medium text-white hover:bg-[#4a72cc]"
                    >
                      O&apos;rnatish
                    </button>
                    <button
                      type="button"
                      onClick={dismiss}
                      className="rounded-lg px-3 py-1.5 text-xs text-surface-600 hover:bg-surface-100 dark:text-surface-300 dark:hover:bg-surface-700"
                    >
                      Keyinroq
                    </button>
                  </div>
                </>
              ) : (
                <>
                  <p className="mt-0.5 text-xs text-surface-500">
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
                    className="mt-3 rounded-lg px-3 py-1.5 text-xs text-surface-600 hover:bg-surface-100 dark:text-surface-300 dark:hover:bg-surface-700"
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
