"use client";

import { Suspense } from "react";
import { useTranslation } from "@/hooks/useTranslation";
import VerifyEmailPageClient from "./page.client";

export default function VerifyEmailPage() {
  const { locale } = useTranslation();

  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center text-surface-500">
          {locale === "ru" ? "Загрузка..." : "Yuklanmoqda..."}
        </div>
      }
    >
      <VerifyEmailPageClient />
    </Suspense>
  );
}

