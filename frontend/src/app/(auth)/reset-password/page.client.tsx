"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { isAxiosError } from "axios";
import { z } from "zod";
import {
  ArrowLeft,
  CheckCircle,
  Eye,
  EyeOff,
  KeyRound,
  Loader2,
  ShieldCheck,
} from "lucide-react";
import { Alert } from "@/components/ui/alert";
import { authApi } from "@/lib/api";
import { useTranslation } from "@/hooks/useTranslation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

type ResetPasswordFormData = {
  token: string;
  newPassword: string;
  confirmPassword: string;
};

export default function ResetPasswordPageClient({
  initialToken,
}: {
  initialToken?: string;
}) {
  const { locale } = useTranslation();
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);
  const resetPasswordSchema = z
    .object({
      token: z
        .string()
        .trim()
        .min(1, locale === "ru" ? "Токен сброса обязателен" : "Tiklash tokeni majburiy"),
      newPassword: z
        .string()
        .min(
          8,
          locale === "ru" ? "Пароль должен содержать минимум 8 символов" : "Parol kamida 8 ta belgidan iborat bo'lishi kerak"
        )
        .regex(
          /[A-Z]/,
          locale === "ru"
            ? "Пароль должен содержать хотя бы одну заглавную букву"
            : "Parolda kamida bitta katta harf bo'lishi kerak"
        )
        .regex(
          /[a-z]/,
          locale === "ru"
            ? "Пароль должен содержать хотя бы одну строчную букву"
            : "Parolda kamida bitta kichik harf bo'lishi kerak"
        )
        .regex(
          /\d/,
          locale === "ru" ? "Пароль должен содержать хотя бы одну цифру" : "Parolda kamida bitta raqam bo'lishi kerak"
        ),
      confirmPassword: z
        .string()
        .min(1, locale === "ru" ? "Подтвердите новый пароль" : "Yangi parolni tasdiqlang"),
    })
    .refine((data) => data.newPassword === data.confirmPassword, {
      message: locale === "ru" ? "Пароли не совпадают" : "Parollar mos emas",
      path: ["confirmPassword"],
    });

  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
  } = useForm<ResetPasswordFormData>({
    resolver: zodResolver(resetPasswordSchema),
    defaultValues: {
      token: initialToken ?? "",
      newPassword: "",
      confirmPassword: "",
    },
  });

  useEffect(() => {
    reset({
      token: initialToken ?? "",
      newPassword: "",
      confirmPassword: "",
    });
  }, [initialToken, reset]);

  const onSubmit = async (data: ResetPasswordFormData) => {
    setIsLoading(true);
    setError(null);

    try {
      await authApi.resetPassword(data.token, data.newPassword);
      setIsSuccess(true);

      setTimeout(() => {
        router.push("/login?password_reset=true");
      }, 1800);
    } catch (err: unknown) {
      if (isAxiosError(err)) {
        const detail = err.response?.data?.detail;
        setError(
          typeof detail === "string"
            ? detail
            : err.message ||
                (locale === "ru" ? "Не удалось сбросить пароль" : "Parolni tiklab bo'lmadi")
        );
      } else if (err instanceof Error) {
        setError(err.message);
      } else {
        setError(locale === "ru" ? "Не удалось сбросить пароль" : "Parolni tiklab bo'lmadi");
      }
    } finally {
      setIsLoading(false);
    }
  };

  if (isSuccess) {
    return (
      <div className="mx-auto w-full max-w-md text-center">
        <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-full bg-green-100">
          <CheckCircle className="h-8 w-8 text-green-600" />
        </div>
        <h1 className="font-display text-2xl font-bold text-surface-900 dark:text-white">
          {locale === "ru" ? "Пароль обновлен" : "Parol yangilandi"}
        </h1>
        <p className="mt-3 text-surface-500 dark:text-surface-300">
          {locale === "ru"
            ? "Ваш пароль успешно сброшен. Перенаправляем на страницу входа..."
            : "Parolingiz muvaffaqiyatli tiklandi. Kirish sahifasiga yo'naltirilmoqda..."}
        </p>
        <Link
          href="/login?password_reset=true"
          className="mt-8 inline-flex items-center gap-2 text-sm font-medium text-brand-600 hover:text-brand-500"
        >
          <ArrowLeft className="h-4 w-4" />
          {locale === "ru" ? "Назад ко входу" : "Kirishga qaytish"}
        </Link>
      </div>
    );
  }

  return (
    <div className="mx-auto w-full max-w-md">
      <div className="mb-8 space-y-3">
        <div className="inline-flex items-center gap-2 rounded-full border border-brand-200 bg-brand-50 px-3 py-1 text-xs font-medium text-brand-700">
          <ShieldCheck className="h-4 w-4" />
          {locale === "ru" ? "Безопасный сброс пароля" : "Xavfsiz parol tiklash"}
        </div>
        <h1 className="font-display text-3xl font-bold text-surface-900 dark:text-white">
          {locale === "ru" ? "Сбросьте пароль" : "Parolingizni tiklang"}
        </h1>
        <p className="text-surface-500 dark:text-surface-400">
          {locale === "ru"
            ? "Используйте токен из письма, чтобы создать новый пароль. Если токен отсутствует, вставьте его вручную ниже."
            : "Yangi parol yaratish uchun emaildagi tokendan foydalaning. Agar token bo'lmasa, uni quyida qo'lda kiriting."}
        </p>
      </div>

      {error && (
        <div className="mb-6">
          <Alert variant="error">{error}</Alert>
        </div>
      )}

      {!initialToken && (
        <div className="mb-6">
          <Alert variant="warning">
            {locale === "ru"
              ? "Не удалось определить токен сброса из ссылки. Вставьте токен из письма или запросите новую ссылку для сброса."
              : "Havoladan tiklash tokenini aniqlab bo'lmadi. Emaildagi tokenni kiriting yoki yangi tiklash havolasini so'rang."}
          </Alert>
        </div>
      )}

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
        <div className="space-y-2">
          <Label htmlFor="token">{locale === "ru" ? "Токен сброса" : "Tiklash tokeni"}</Label>
          <Input
            id="token"
            type="text"
            placeholder={
              locale === "ru"
                ? "Вставьте токен из письма"
                : "Email havolasidagi tokenni kiriting"
            }
            icon={<KeyRound className="h-5 w-5" />}
            error={errors.token?.message}
            autoComplete="off"
            {...register("token")}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="newPassword">{locale === "ru" ? "Новый пароль" : "Yangi parol"}</Label>
          <div className="relative">
            <Input
              id="newPassword"
              type={showPassword ? "text" : "password"}
              placeholder={
                locale === "ru"
                  ? "Введите надежный новый пароль"
                  : "Kuchli yangi parolni kiriting"
              }
              icon={<ShieldCheck className="h-5 w-5" />}
              error={errors.newPassword?.message}
              autoComplete="new-password"
              {...register("newPassword")}
            />
            <button
              type="button"
              onClick={() => setShowPassword((value) => !value)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-surface-400 hover:text-surface-600"
              aria-label={
                showPassword
                  ? locale === "ru"
                    ? "Скрыть пароль"
                    : "Parolni yashirish"
                  : locale === "ru"
                    ? "Показать пароль"
                    : "Parolni ko'rsatish"
              }
            >
              {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
            </button>
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="confirmPassword">
            {locale === "ru" ? "Подтвердите новый пароль" : "Yangi parolni tasdiqlang"}
          </Label>
          <Input
            id="confirmPassword"
            type={showPassword ? "text" : "password"}
            placeholder={
              locale === "ru"
                ? "Повторите новый пароль"
                : "Yangi parolni takrorlang"
            }
            icon={<ShieldCheck className="h-5 w-5" />}
            error={errors.confirmPassword?.message}
            autoComplete="new-password"
            {...register("confirmPassword")}
          />
        </div>

        <div className="rounded-xl border border-surface-200 bg-surface-50 p-4 text-sm text-surface-600 dark:border-surface-700 dark:bg-surface-800/60 dark:text-surface-300">
          <p className="font-medium text-surface-800 dark:text-surface-100">
            {locale === "ru" ? "Требования к паролю" : "Parol talablari"}
          </p>
          <ul className="mt-2 list-disc space-y-1 pl-5">
            <li>{locale === "ru" ? "Минимум 8 символов" : "Kamida 8 ta belgi"}</li>
            <li>
              {locale === "ru"
                ? "Минимум одна заглавная буква"
                : "Kamida bitta katta harf"}
            </li>
            <li>
              {locale === "ru"
                ? "Минимум одна строчная буква"
                : "Kamida bitta kichik harf"}
            </li>
            <li>{locale === "ru" ? "Минимум одна цифра" : "Kamida bitta raqam"}</li>
          </ul>
        </div>

        <Button type="submit" className="w-full" size="lg" variant="gradient" disabled={isLoading}>
          {isLoading ? (
            <span className="flex items-center justify-center gap-2">
              <Loader2 className="h-4 w-4 animate-spin" />
              {locale === "ru" ? "Сбрасываем..." : "Tiklanmoqda..."}
            </span>
          ) : (
            locale === "ru" ? "Сбросить пароль" : "Parolni tiklash"
          )}
        </Button>
      </form>

      <div className="mt-8 flex items-center justify-between gap-4 text-sm">
        <Link href="/forgot-password" className="font-medium text-brand-600 hover:text-brand-500">
          {locale === "ru" ? "Нужна новая ссылка?" : "Yangi tiklash havolasi kerakmi?"}
        </Link>
        <Link href="/login" className="inline-flex items-center gap-2 text-surface-500 hover:text-surface-700 dark:text-surface-400 dark:hover:text-surface-200">
          <ArrowLeft className="h-4 w-4" />
          {locale === "ru" ? "Назад ко входу" : "Kirishga qaytish"}
        </Link>
      </div>
    </div>
  );
}
