"use client";

import { useEffect, useState } from "react";
import { Download, X } from "lucide-react";
import { AnimatePresence, motion } from "framer-motion";

const DISMISS_KEY = "ishtop_pwa_install_dismissed_v1";
const DISMISS_DAYS = 14;

// Disabled for now per product decision. Flip to true to re-enable the install prompt.
const PWA_INSTALL_ENABLED = false;

type BIPEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
};

export default function InstallPrompt() {
  const [deferred, setDeferred] = useState<BIPEvent | null>(null);
  const [visible, setVisible] = useState(false);
  const [installed, setInstalled] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;

    // Already running as PWA
    const isStandalone =
      window.matchMedia?.("(display-mode: standalone)").matches ||
      // @ts-expect-error iOS
      window.navigator.standalone === true;
    if (isStandalone) {
      setInstalled(true);
      return;
    }

    // Honor dismiss cooldown
    try {
      const dismissedAt = Number(localStorage.getItem(DISMISS_KEY) || 0);
      if (dismissedAt && Date.now() - dismissedAt < DISMISS_DAYS * 86400000) {
        return;
      }
    } catch {
      // ignore storage errors
    }

    const onPrompt = (e: Event) => {
      e.preventDefault();
      setDeferred(e as BIPEvent);
      setVisible(true);
    };
    const onInstalled = () => {
      setInstalled(true);
      setVisible(false);
    };

    window.addEventListener("beforeinstallprompt", onPrompt);
    window.addEventListener("appinstalled", onInstalled);
    return () => {
      window.removeEventListener("beforeinstallprompt", onPrompt);
      window.removeEventListener("appinstalled", onInstalled);
    };
  }, []);

  if (installed) return null;
  if (!PWA_INSTALL_ENABLED) return null;

  const install = async () => {
    if (!deferred) return;
    try {
      await deferred.prompt();
      await deferred.userChoice;
    } catch {
      // ignore
    } finally {
      setDeferred(null);
      setVisible(false);
    }
  };

  const dismiss = () => {
    try {
      localStorage.setItem(DISMISS_KEY, String(Date.now()));
    } catch {
      // ignore
    }
    setVisible(false);
  };

  return (
    <AnimatePresence>
      {visible && (
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
            <div className="grid h-10 w-10 flex-shrink-0 place-items-center rounded-xl bg-gradient-to-br from-purple-500 to-indigo-600 text-white">
              <Download className="h-5 w-5" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-semibold text-surface-900 dark:text-white">
                IshTop ilovasini o&apos;rnatish
              </p>
              <p className="mt-0.5 text-xs text-surface-500">
                Telefoningizga qo&apos;shing — tezroq ishlaydi va oflayn ham mavjud.
              </p>
              <div className="mt-3 flex items-center gap-2">
                <button
                  type="button"
                  onClick={install}
                  className="rounded-lg bg-gradient-to-r from-purple-500 to-indigo-600 px-3 py-1.5 text-xs font-medium text-white"
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
