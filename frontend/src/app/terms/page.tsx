"use client";

import Link from "next/link";
import { useTranslation } from "@/hooks/useTranslation";

export default function TermsPage() {
  const { locale } = useTranslation();
  const isRu = locale === "ru";

  return (
    <main className="mx-auto max-w-3xl px-6 py-16">
      <h1 className="text-3xl font-bold text-surface-900 dark:text-white">
        {isRu ? "Условия использования" : "Foydalanish shartlari"}
      </h1>
      <p className="mt-4 text-surface-600 dark:text-surface-300">
        {isRu
          ? "Эта страница добавлена, чтобы юридические ссылки на странице регистрации и главной странице работали корректно."
          : "Bu sahifa ro'yxatdan o'tish va bosh sahifadagi huquqiy havolalar to'g'ri ishlashi uchun qo'shilgan."}
      </p>
      <div className="mt-8">
        <Link className="text-brand-600 hover:underline" href="/">
          {isRu ? "Назад на главную" : "Bosh sahifaga qaytish"}
        </Link>
      </div>
    </main>
  );
}
