"use client";

import Link from "next/link";
import { useTranslation } from "@/hooks/useTranslation";

export default function ContactPage() {
  const { locale } = useTranslation();
  const isRu = locale === "ru";

  return (
    <main className="mx-auto max-w-3xl px-6 py-16">
      <h1 className="text-3xl font-bold text-surface-900 dark:text-white">
        {isRu ? "Связаться с нами" : "Bog'lanish"}
      </h1>
      <p className="mt-4 text-surface-600 dark:text-surface-300">
        {isRu
          ? "Нужна помощь по IshTop? Напишите нам на"
          : "IshTop bo'yicha yordam kerakmi? Quyidagi manzilga yozing:"}{" "}
        <a className="text-brand-600 hover:underline" href="mailto:support@ishtop.uz">
          support@ishtop.uz
        </a>
        .
      </p>
      <div className="mt-8">
        <Link className="text-brand-600 hover:underline" href="/">
          {isRu ? "Назад на главную" : "Bosh sahifaga qaytish"}
        </Link>
      </div>
    </main>
  );
}
