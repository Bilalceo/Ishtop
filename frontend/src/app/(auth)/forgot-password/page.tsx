/**
 * Forgot Password Page
 */

"use client";

import { useState } from "react";
import Link from "next/link";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Mail, ArrowLeft, CheckCircle } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { useTranslation } from "@/hooks/useTranslation";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

type ForgotPasswordFormData = {
  email: string;
};

export default function ForgotPasswordPage() {
  const { locale } = useTranslation();
  const [isLoading, setIsLoading] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [debugResetUrl, setDebugResetUrl] = useState<string | null>(null);
  const { requestPasswordReset } = useAuth();
  const forgotPasswordSchema = z.object({
    email: z
      .string()
      .email(
        locale === "ru"
          ? "Пожалуйста, введите корректный email адрес"
          : "Iltimos, to'g'ri email manzilini kiriting"
      ),
  });

  const {
    register,
    handleSubmit,
    formState: { errors },
    getValues,
  } = useForm<ForgotPasswordFormData>({
    resolver: zodResolver(forgotPasswordSchema),
  });

  const onSubmit = async (data: ForgotPasswordFormData) => {
    setIsLoading(true);
    setError(null);
    setDebugResetUrl(null);

    try {
      const response = await requestPasswordReset(data.email);
      setDebugResetUrl(response?.debug_reset_url ?? null);
      setIsSuccess(true);
    } catch (err: unknown) {
      setError(
        (err as { message?: string })?.message ||
          (locale === "ru"
            ? "Не удалось отправить письмо для сброса пароля"
            : "Parolni tiklash xatini yuborib bo'lmadi")
      );
    } finally {
      setIsLoading(false);
    }
  };

  if (isSuccess) {
    return (
      <div className="mx-auto w-full max-w-sm text-center">
        <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-full bg-green-100">
          <CheckCircle className="h-8 w-8 text-green-600" />
        </div>
        <h1 className="font-display text-2xl font-bold text-surface-900 dark:text-white">
          {locale === "ru" ? "Проверьте почту" : "Emailingizni tekshiring"}
        </h1>
        <p className="mt-3 text-surface-500 dark:text-surface-300">
          {locale === "ru"
            ? "Мы отправили ссылку для сброса пароля на"
            : "Parolni tiklash havolasini quyidagi emailga yubordik"}{" "}
          <strong className="text-surface-700 dark:text-surface-100">{getValues("email")}</strong>
        </p>
        <p className="mt-4 text-sm text-surface-400">
          {locale === "ru"
            ? "Не получили письмо? Проверьте папку спам или"
            : "Email kelmadimi? Spam papkasini tekshiring yoki"}{" "}
          <button
            onClick={() => setIsSuccess(false)}
            className="font-medium text-brand-600 hover:text-brand-500"
          >
            {locale === "ru" ? "попробуйте снова" : "qayta urinib ko'ring"}
          </button>
        </p>
        {debugResetUrl && (
          <div className="mt-4 rounded-xl border border-amber-300 bg-amber-50 p-3 text-left text-xs text-amber-800">
            <p className="font-semibold">
              {locale === "ru"
                ? "Тестовый режим: email недоступен"
                : "Test rejim: email yuborish yoqilmagan"}
            </p>
            <p className="mt-1 break-all">{debugResetUrl}</p>
          </div>
        )}
        <Link
          href="/login"
          className="mt-8 inline-flex items-center gap-2 text-sm font-medium text-brand-600 hover:text-brand-500"
        >
          <ArrowLeft className="h-4 w-4" />
          {locale === "ru" ? "Назад ко входу" : "Kirishga qaytish"}
        </Link>
      </div>
    );
  }

  return (
    <div className="mx-auto w-full max-w-sm">
      <div className="mb-8">
        <h1 className="font-display text-2xl font-bold text-surface-900 dark:text-white">
          {locale === "ru" ? "Забыли пароль?" : "Parolingizni unutdingizmi?"}
        </h1>
        <p className="mt-2 text-surface-500 dark:text-surface-400">
          {locale === "ru"
            ? "Не переживайте! Введите email, и мы отправим ссылку для сброса."
            : "Xavotir olmang! Emailingizni kiriting, biz tiklash havolasini yuboramiz."}
        </p>
      </div>

      {error && (
        <div className="mb-6">
          <Alert variant="error">{error}</Alert>
        </div>
      )}

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
        {/* Email */}
        <div className="space-y-2">
          <Label htmlFor="email">{locale === "ru" ? "Email адрес" : "Email manzil"}</Label>
          <Input
            id="email"
            type="email"
            placeholder="you@example.com"
            icon={<Mail className="h-5 w-5" />}
            error={errors.email?.message}
            {...register("email")}
          />
        </div>

        {/* Submit */}
        <Button type="submit" className="w-full" size="lg" isLoading={isLoading}>
          {locale === "ru" ? "Отправить ссылку" : "Tiklash havolasini yuborish"}
        </Button>
      </form>

      {/* Back to login */}
      <Link
        href="/login"
        className="mt-8 inline-flex items-center gap-2 text-sm font-medium text-surface-500 hover:text-surface-700 dark:text-surface-400 dark:hover:text-surface-200"
      >
        <ArrowLeft className="h-4 w-4" />
        {locale === "ru" ? "Назад ко входу" : "Kirishga qaytish"}
      </Link>
    </div>
  );
}














