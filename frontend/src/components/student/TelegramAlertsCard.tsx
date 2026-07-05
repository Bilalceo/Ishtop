"use client";

/**
 * Connect Telegram for daily personalised job alerts.
 * Opens a deep link (t.me/<bot>?start=<token>); the bot links the chat to the
 * account. Shows connected state and lets the user disconnect.
 */

import { useEffect, useState } from "react";
import { Send, CheckCircle2, Loader2, Bell } from "lucide-react";
import { api } from "@/lib/api";
import { useTranslation } from "@/hooks/useTranslation";
import { toast } from "sonner";

export function TelegramAlertsCard() {
  const { locale } = useTranslation();
  const ru = locale === "ru";
  const [connected, setConnected] = useState<boolean | null>(null);
  const [loading, setLoading] = useState(false);

  const load = () =>
    api
      .get("/telegram/link")
      .then((r) => setConnected(!!r.data?.data?.connected))
      .catch(() => setConnected(false));

  useEffect(() => {
    load();
  }, []);

  const connect = async () => {
    setLoading(true);
    try {
      const r = await api.get("/telegram/link");
      const link = r.data?.data?.deep_link as string;
      if (link) window.open(link, "_blank", "noopener,noreferrer");
      // Give the user a beat to press Start in Telegram, then refresh state.
      setTimeout(load, 6000);
    } catch {
      toast.error(ru ? "Ошибка. Попробуйте снова." : "Xatolik. Qayta urinib ko'ring.");
    } finally {
      setLoading(false);
    }
  };

  const disconnect = async () => {
    setLoading(true);
    try {
      await api.post("/telegram/unlink");
      setConnected(false);
      toast.success(ru ? "Отключено" : "Uzildi");
    } catch {
      toast.error(ru ? "Ошибка" : "Xatolik");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="relative overflow-hidden rounded-2xl border border-surface-200/70 bg-white p-5 dark:border-white/[0.06] dark:bg-surface-900 sm:p-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-start gap-3">
          <span className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-[#d7e7ff] text-[#3856a5]">
            <Send className="h-5 w-5" />
          </span>
          <div>
            <p className="flex items-center gap-2 text-sm font-semibold text-surface-900 dark:text-white">
              {ru ? "Вакансии в Telegram" : "Telegram'da ish bildirishnomalari"}
              {connected && (
                <span className="inline-flex items-center gap-1 rounded-full bg-[#d9f1e4] px-2 py-0.5 text-[11px] font-semibold text-[#2f7a56]">
                  <CheckCircle2 className="h-3 w-3" />
                  {ru ? "Подключено" : "Ulangan"}
                </span>
              )}
            </p>
            <p className="mt-1 max-w-md text-xs text-surface-500 dark:text-surface-400">
              {ru
                ? "Каждый день присылаем подходящие вам вакансии с процентом совпадения — прямо в Telegram."
                : "Har kuni sizga mos ishlarni moslik foizi bilan to'g'ridan-to'g'ri Telegram'ga yuboramiz."}
            </p>
          </div>
        </div>

        <div className="shrink-0">
          {connected ? (
            <button
              type="button"
              onClick={disconnect}
              disabled={loading}
              className="btn-silver-ghost !bg-[#f6f6f4] disabled:opacity-60"
            >
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
              {ru ? "Отключить" : "Uzish"}
            </button>
          ) : (
            <button
              type="button"
              onClick={connect}
              disabled={loading || connected === null}
              className="btn-silver-primary group disabled:opacity-60"
            >
              {loading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Bell className="h-4 w-4" />
              )}
              {ru ? "Подключить" : "Ulash"}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

export default TelegramAlertsCard;
