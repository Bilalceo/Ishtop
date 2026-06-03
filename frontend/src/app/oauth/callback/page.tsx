"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuthStore } from "@/store/authStore";
import type { User } from "@/types/api";
import { getApiBaseUrl } from "@/lib/runtime-config";
import { useTranslation } from "@/hooks/useTranslation";

const API_BASE_URL = getApiBaseUrl();

function isUserLike(value: unknown): value is User {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return false;
  }

  const record = value as Record<string, unknown>;
  const hasEmail = typeof record.email === "string";
  const hasIdentity =
    typeof record.full_name === "string" ||
    typeof record.role === "string" ||
    typeof record.id === "string";

  return hasEmail && hasIdentity;
}

function extractUser(payload: unknown): User | null {
  if (!payload || typeof payload !== "object" || Array.isArray(payload)) {
    return null;
  }

  const record = payload as Record<string, unknown>;
  const data = record.data;
  if (data && typeof data === "object" && !Array.isArray(data)) {
    const nested = data as Record<string, unknown>;
    if (isUserLike(nested.user)) {
      return nested.user;
    }
  }

  if (isUserLike(record.user)) {
    return record.user;
  }

  if (isUserLike(record)) {
    return record;
  }

  return null;
}

function getRoleRoot(role?: string | null) {
  return role === "company" ? "/company" : role === "admin" ? "/admin" : "/student";
}

export default function OAuthCallbackPage() {
  const { locale } = useTranslation();
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const processedRef = useRef(false);
  const loadProfileError =
    locale === "ru"
      ? "Не удалось загрузить профиль после OAuth"
      : "OAuthdan keyin profilni yuklab bo'lmadi";
  const invalidProfileError =
    locale === "ru"
      ? "Данные профиля OAuth некорректны"
      : "OAuth profil ma'lumotlari yaroqsiz";
  const loginFailedError = locale === "ru" ? "Не удалось войти через OAuth" : "OAuth orqali kirish muvaffaqiyatsiz";

  useEffect(() => {
    if (processedRef.current) return;
    processedRef.current = true;

    const run = async () => {
      try {
        // Clear transport artifacts from URL.
        window.history.replaceState({}, document.title, "/oauth/callback");

        // Restore session from secure cookies first.
        await useAuthStore.getState().bootstrapSession();

        const res = await fetch(`${API_BASE_URL}/auth/me`, {
          method: "GET",
          credentials: "include",
        });

        if (!res.ok) {
          throw new Error(loadProfileError);
        }

        const payload = await res.json();
        const user = extractUser(payload);

        if (!user) {
          throw new Error(invalidProfileError);
        }

        useAuthStore.getState().setUser(user);

        router.replace(getRoleRoot(user.role));
      } catch (e: any) {
        setError(e?.message || loginFailedError);
      }
    };

    run();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (error) {
    return (
      <div className="mx-auto max-w-md p-8">
        <h1 className="text-xl font-semibold">
          {locale === "ru" ? "Ошибка входа через OAuth" : "OAuth orqali kirish muvaffaqiyatsiz"}
        </h1>
        <p className="mt-2 text-sm text-surface-600">{error}</p>
        <button
          className="mt-6 rounded-lg bg-purple-600 px-4 py-2 text-white"
          onClick={() => router.replace("/login")}
        >
          {locale === "ru" ? "Назад ко входу" : "Kirishga qaytish"}
        </button>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-md p-8">
      <h1 className="text-xl font-semibold">
        {locale === "ru" ? "Выполняем вход..." : "Tizimga kirilmoqda..."}
      </h1>
      <p className="mt-2 text-sm text-surface-600">
        {locale === "ru"
          ? "Завершаем вход через OAuth и загружаем ваш профиль."
          : "OAuth orqali kirish yakunlanmoqda va profilingiz yuklanmoqda."}
      </p>
    </div>
  );
}
