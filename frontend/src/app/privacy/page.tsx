"use client";

import Link from "next/link";
import { useTranslation } from "@/hooks/useTranslation";

export default function PrivacyPage() {
  const { locale } = useTranslation();
  const isRu = locale === "ru";

  return (
    <main className="mx-auto max-w-3xl px-6 py-16">
      <h1 className="text-3xl font-bold text-surface-900 dark:text-white">
        {isRu ? "Политика конфиденциальности" : "Maxfiylik siyosati"}
      </h1>
      <p className="mt-4 text-surface-600 dark:text-surface-300">
        {isRu
          ? "IshTop уважает вашу конфиденциальность. Эта страница добавлена, чтобы юридические ссылки в приложении работали корректно."
          : "IshTop sizning maxfiyligingizni hurmat qiladi. Bu sahifa ilovadagi huquqiy havolalar uzilmasligi uchun qo'shilgan."}
      </p>
      <div className="mt-8">
        <Link className="text-brand-600 hover:underline" href="/">
          {isRu ? "Назад на главную" : "Bosh sahifaga qaytish"}
        </Link>
      </div>
    </main>
  );
}
