"use client";

/**
 * =============================================================================
 * SMARTCAREER AI - Login Page (Client)
 * =============================================================================
 *
 * This file intentionally stays client-side because it uses hooks like
 * `useSearchParams()` and interacts with browser APIs.
 */

import { useMemo, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { motion, AnimatePresence } from "framer-motion";
import { Eye, EyeOff, Mail, Lock, Loader2, ArrowRight } from "lucide-react";
import { Alert } from "@/components/ui/alert";
import { useAuth } from "@/hooks/useAuth";
import { useTranslation } from "@/hooks/useTranslation";
import { getBackendOrigin } from "@/lib/runtime-config";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

// =============================================================================
// VALIDATION SCHEMA
// =============================================================================

type TranslateFn = (
  key: string,
  variables?: Record<string, string | number>,
) => string;

const createLoginSchema = (t: TranslateFn) =>
  z.object({
    email: z
      .string()
      .min(1, t("validation.required"))
      .email(t("validation.email")),
    password: z
      .string()
      .min(1, t("validation.required"))
      .min(6, t("validation.minLength", { min: 6 })),
    rememberMe: z.boolean().optional(),
  });

type LoginFormData = z.infer<ReturnType<typeof createLoginSchema>>;

// =============================================================================
// ANIMATION VARIANTS
// =============================================================================

const fadeIn = {
  initial: { opacity: 0, y: 10 },
  animate: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: -10 },
};

export default function LoginPageClient() {
  const searchParams = useSearchParams()!;
  const sessionExpired = searchParams.get("session_expired") === "true";
  const registered = searchParams.get("registered") === "true";
  const passwordReset = searchParams.get("password_reset") === "true";
  const redirectTo = searchParams.get("redirect");

  const { login, isLoading, error, clearError } = useAuth();
  const { t, locale } = useTranslation();
  const isRu = locale === "ru";
  const loginSchema = useMemo(() => createLoginSchema(t), [t]);
  const [showPassword, setShowPassword] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
    watch,
  } = useForm<LoginFormData>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: "",
      password: "",
      rememberMe: false,
    },
  });

  watch("email"); // keeps the form controlled; used by some UI patterns

  const onSubmit = async (data: LoginFormData) => {
    clearError();
    try {
      await login(
        { email: data.email, password: data.password },
        redirectTo || undefined,
      );
      setIsSuccess(true);
    } catch {
      // Error is already stored in state
    }
  };

  const handleGoogleOAuth = () => {
    const backendOrigin = getBackendOrigin();
    window.location.href = `${backendOrigin}/api/v1/auth/oauth/google?redirect=true`;
  };

  const localizedError =
    error === "Invalid email or password"
      ? t("auth.login.invalidCredentials")
      : error;

  return (
    <motion.div
      initial={false}
      animate={{ opacity: 1 }}
      className="mx-auto w-full max-w-md"
    >
      {/* Header */}
      <motion.div
        initial={false}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="mb-8 text-center"
      >
        <h1 className="font-display text-3xl font-bold text-surface-900 dark:text-white">
          {t("auth.login.title")}
        </h1>
        <p className="mt-2 text-surface-500 dark:text-surface-300">
          {t("auth.login.subtitle")}
        </p>
      </motion.div>

      {/* Alerts */}
      <AnimatePresence mode="wait">
        {sessionExpired && (
          <motion.div key="session-expired" {...fadeIn} className="mb-6">
            <Alert variant="warning">{t("auth.login.sessionExpired")}</Alert>
          </motion.div>
        )}
        {registered && (
          <motion.div key="registered" {...fadeIn} className="mb-6">
            <Alert variant="success">{t("auth.login.registered")}</Alert>
          </motion.div>
        )}
        {passwordReset && (
          <motion.div key="password-reset" {...fadeIn} className="mb-6">
            <Alert variant="success">{t("auth.login.passwordReset")}</Alert>
          </motion.div>
        )}
        {error && (
          <motion.div key="error" {...fadeIn} className="mb-6">
            <Alert variant="error">{localizedError}</Alert>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Form */}
      <motion.form
        initial={false}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        onSubmit={handleSubmit(onSubmit)}
        autoComplete="off"
        data-lpignore="true"
        className="space-y-5"
      >
        {/* Email Field */}
        <div className="space-y-2">
          <Label htmlFor="email">{t("auth.login.email")}</Label>
          <div className="relative">
            <Mail className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-surface-400" />
            <input
              id="email"
              type="email"
              placeholder="you@example.com"
              autoComplete="off"
              data-lpignore="true"
              className={cn(
                "flex h-12 w-full rounded-xl border bg-white pl-10 pr-4 text-sm text-surface-900 transition-all dark:bg-surface-900 dark:text-surface-100",
                "placeholder:text-surface-400",
                "focus:outline-none focus:ring-2 focus:ring-brand-500 focus:ring-offset-0",
                errors.email
                  ? "border-red-300 focus:ring-red-500"
                  : "border-surface-300 hover:border-surface-400",
              )}
              {...register("email")}
            />
          </div>
          {errors.email && (
            <motion.p {...fadeIn} className="text-sm text-red-600 dark:text-red-400">
              {errors.email.message}
            </motion.p>
          )}
        </div>

        {/* Password Field */}
        <div className="space-y-2">
          <Label htmlFor="password">{t("auth.login.password")}</Label>
          <div className="relative">
            <Lock className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-surface-400" />
            <input
              id="password"
              type={showPassword ? "text" : "password"}
              placeholder="••••••••"
              autoComplete="off"
              data-lpignore="true"
              className={cn(
                "flex h-12 w-full rounded-xl border bg-white pl-10 pr-12 text-sm text-surface-900 transition-all dark:bg-surface-900 dark:text-surface-100",
                "placeholder:text-surface-400",
                "focus:outline-none focus:ring-2 focus:ring-brand-500 focus:ring-offset-0",
                errors.password
                  ? "border-red-300 focus:ring-red-500"
                  : "border-surface-300 hover:border-surface-400",
              )}
              {...register("password")}
            />
            <button
              type="button"
              onClick={() => setShowPassword((v) => !v)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-surface-400 hover:text-surface-600"
              aria-label={
                showPassword
                  ? isRu
                    ? "Скрыть пароль"
                    : "Parolni yashirish"
                  : isRu
                    ? "Показать пароль"
                    : "Parolni ko'rsatish"
              }
            >
              {showPassword ? (
                <EyeOff className="h-5 w-5" />
              ) : (
                <Eye className="h-5 w-5" />
              )}
            </button>
          </div>
          {errors.password && (
            <motion.p {...fadeIn} className="text-sm text-red-600 dark:text-red-400">
              {errors.password.message}
            </motion.p>
          )}
        </div>

        {/* Remember / Forgot */}
        <div className="flex items-center justify-between">
          <label className="flex items-center gap-2 text-sm text-surface-600 dark:text-surface-300">
            <input
              type="checkbox"
              className="h-4 w-4 rounded border-surface-300"
              {...register("rememberMe")}
            />
            {t("auth.login.rememberMe")}
          </label>
          <Link
            href="/forgot-password"
            className="text-sm text-brand-600 hover:text-brand-700"
          >
            {t("auth.login.forgotPassword")}
          </Link>
        </div>

        {/* Submit */}
        <Button
          type="submit"
          className="w-full"
          variant="gradient"
          size="lg"
          disabled={isSubmitting || isLoading}
        >
          {isSubmitting || isLoading ? (
            <span className="flex items-center justify-center gap-2">
              <Loader2 className="h-4 w-4 animate-spin" />
              {t("auth.login.signingIn")}
            </span>
          ) : (
            <span className="flex items-center justify-center gap-2">
              {isSuccess ? t("auth.login.signIn") : t("auth.login.signIn")}
              <ArrowRight className="h-4 w-4" />
            </span>
          )}
        </Button>

        {/* Social */}
        <div className="relative py-2">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-surface-200 dark:border-surface-700" />
          </div>
          <div className="relative flex justify-center">
            <span className="bg-white px-4 text-xs text-surface-500 dark:bg-surface-950 dark:text-surface-300">
              {t("auth.login.orContinueWith")}
            </span>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-3">
          <Button type="button" variant="outline" onClick={handleGoogleOAuth}>
            Google
          </Button>
        </div>

        <p className="text-center text-sm text-surface-600 dark:text-surface-300">
          {t("auth.login.noAccount")}{" "}
          <Link
            href="/register"
            className="font-medium text-brand-600 hover:text-brand-700"
          >
            {t("auth.login.createAccount")}
          </Link>
        </p>
      </motion.form>
    </motion.div>
  );
}
