"use client";

import { Bell, BellOff, Loader2 } from "lucide-react";
import { usePushNotifications } from "@/hooks/usePushNotifications";
import { useTranslation } from "@/contexts/TranslationContext";

export default function PushNotificationCard() {
  const { status, subscribed, busy, subscribe, unsubscribe } = usePushNotifications();
  const { locale } = useTranslation();
  const isRu = locale === "ru";
  const c = isRu
    ? {
        unsupported: "Ваш браузер не поддерживает push-уведомления.",
        title: "Push-уведомления",
        subscribedBody: "Вы будете получать уведомления о новых вакансиях и откликах.",
        unsubscribedBody: "Быстро узнавайте о подходящих вакансиях и ответах на отклики.",
        blocked: "Заблокировано",
        turnOff: "Отключить",
        turnOn: "Включить",
      }
    : {
        unsupported: "Brauzeringiz push-bildirishnomalarni qo'llab-quvvatlamaydi.",
        title: "Push bildirishnomalar",
        subscribedBody: "Yangi ish e'lonlari va ariza yangilanishlari haqida xabar olasiz.",
        unsubscribedBody: "Yangi mos ishlar va ariza javoblari haqida tezda bilib turish.",
        blocked: "Bloklangan",
        turnOff: "O'chirish",
        turnOn: "Yoqish",
      };

  if (status === "unsupported") {
    return (
      <div className="rounded-xl border border-surface-200 bg-surface-50 p-4 text-sm text-surface-500 dark:border-surface-700 dark:bg-surface-800/40">
        {c.unsupported}
      </div>
    );
  }

  return (
    <div className="flex items-start justify-between gap-3 rounded-xl border border-surface-200 bg-white p-4 dark:border-surface-700 dark:bg-surface-800/40">
      <div className="flex items-start gap-3">
        <div className="grid h-9 w-9 flex-shrink-0 place-items-center rounded-lg bg-brand-50 text-brand-600 dark:bg-brand-900/20 dark:text-brand-400">
          {subscribed ? <Bell className="h-4 w-4" /> : <BellOff className="h-4 w-4" />}
        </div>
        <div>
          <p className="text-sm font-semibold text-surface-900 dark:text-white">
            {c.title}
          </p>
          <p className="mt-0.5 text-xs text-surface-500">
            {subscribed ? c.subscribedBody : c.unsubscribedBody}
          </p>
        </div>
      </div>
      <button
        type="button"
        disabled={busy || status === "denied"}
        onClick={subscribed ? unsubscribe : subscribe}
        className="inline-flex items-center gap-1.5 rounded-lg bg-gradient-to-r from-brand-500 to-violet-600 px-3 py-1.5 text-xs font-medium text-white disabled:opacity-50"
      >
        {busy && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
        {status === "denied" ? c.blocked : subscribed ? c.turnOff : c.turnOn}
      </button>
    </div>
  );
}
