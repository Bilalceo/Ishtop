"use client";

/**
 * Checkout page is client-side because it reads query params (`useSearchParams`)
 * and interacts with Stripe + browser navigation.
 */

import { useEffect, useMemo, useState, type FormEvent } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { loadStripe, type StripeCardElement } from "@stripe/stripe-js";
import { CardElement, Elements, useElements, useStripe } from "@stripe/react-stripe-js";
import { ArrowLeft, CheckCircle2, CreditCard, Shield, Sparkles, Zap } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { ThemeToggle } from "@/components/ui/theme-toggle";
import { paymentApi } from "@/lib/api";
import { getErrorMessage } from "@/lib/api";
import { useRequireAuth } from "@/hooks/useAuth";
import { useTranslation } from "@/hooks/useTranslation";
import { useAuthStore } from "@/store/authStore";
import type { BillingCycle, CreatePaymentIntentRequest, PaymentIntentResponse } from "@/types/api";

type PaymentStatus = "idle" | "creating_intent" | "ready" | "processing" | "succeeded" | "failed";
type SubscriptionTier = CreatePaymentIntentRequest["subscription_tier"];

interface PriceInfo {
  usd: number;
  uzs: number;
}

const PRICES: Record<BillingCycle, PriceInfo> = {
  monthly: { usd: 4, uzs: 1000000 },
  yearly: { usd: 40, uzs: 10000000 },
};

const cardElementOptions = {
  style: {
    base: {
      color: "#0f172a",
      fontFamily:
        'Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
      fontSize: "16px",
      "::placeholder": {
        color: "#94a3b8",
      },
    },
    invalid: {
      color: "#ef4444",
    },
  },
  hidePostalCode: false,
};

function makeIdempotencyKey() {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }
  return `checkout_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;
}

function formatCurrency(amount: number, currency: string) {
  const normalized = currency.toUpperCase();
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: normalized,
    maximumFractionDigits: 0,
  }).format(amount / 100);
}

function mapPlan(plan: string | null): SubscriptionTier {
  return plan === "enterprise" ? "enterprise" : "premium";
}

function mapCycle(cycle: string | null): BillingCycle {
  return cycle === "yearly" ? "yearly" : "monthly";
}

function CheckoutPaymentForm(props: {
  clientSecret: string;
  amount: number;
  currency: string;
  subscriptionTier: SubscriptionTier;
  subscriptionMonths: number;
  isMockMode: boolean;
  billingName: string;
  billingEmail: string;
  onSuccess: (payment: PaymentIntentResponse) => void;
  onFailed: (message: string) => void;
}) {
  const { locale } = useTranslation();
  const isRu = locale === "ru";
  const stripe = useStripe();
  const elements = useElements();
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!stripe || !elements) {
      toast.error(isRu ? "Stripe пока не готов." : "Stripe hali tayyor emas.");
      return;
    }

    if (props.isMockMode) {
      props.onFailed(
        isRu
          ? "Бэкенд Stripe работает в mock-режиме. Установите STRIPE_SECRET_KEY и NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY для живой оплаты."
          : "Stripe backend mock rejimda. Jonli to'lov uchun STRIPE_SECRET_KEY va NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY ni sozlang."
      );
      return;
    }

    const cardElement = elements.getElement(CardElement);
    if (!cardElement) {
      toast.error(isRu ? "Поле карты пока не готово." : "Karta maydoni hali tayyor emas.");
      return;
    }

    setSubmitting(true);

    try {
      const result = await stripe.confirmCardPayment(props.clientSecret, {
        payment_method: {
          card: cardElement as StripeCardElement,
          billing_details: {
            name: props.billingName,
            email: props.billingEmail,
          },
        },
      });

      if (result.error) {
        throw new Error(
          result.error.message ||
            (isRu ? "Подтверждение оплаты не удалось." : "To'lovni tasdiqlash muvaffaqiyatsiz tugadi.")
        );
      }

      const paymentIntent = result.paymentIntent;
      if (!paymentIntent) {
        throw new Error(
          isRu
            ? "В ответе Stripe отсутствует payment intent."
            : "Stripe javobida payment intent mavjud emas."
        );
      }

      if (paymentIntent.status === "succeeded") {
        props.onSuccess({
          success: true,
          payment_id: paymentIntent.id,
          client_secret: props.clientSecret,
          amount: props.amount,
          currency: props.currency,
          subscription_tier: props.subscriptionTier,
          subscription_months: props.subscriptionMonths,
        });
        toast.success(
          isRu
            ? "Оплата прошла успешно. Ваша подписка активируется."
            : "To'lov muvaffaqiyatli. Obunangiz faollashtirilmoqda."
        );
        return;
      }

      throw new Error(
        isRu
          ? `Статус оплаты: ${paymentIntent.status}`
          : `To'lov holati: ${paymentIntent.status}`
      );
    } catch (error) {
      const message = getErrorMessage(error);
      props.onFailed(message);
      toast.error(message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="rounded-2xl border border-surface-200 bg-white p-4 shadow-sm dark:border-surface-700 dark:bg-surface-900">
        <CardElement options={cardElementOptions} />
      </div>

      <Button
        type="submit"
        variant="gradient"
        size="lg"
        className="w-full"
        disabled={!stripe || !elements || submitting || props.isMockMode}
        isLoading={submitting}
      >
        {props.isMockMode
          ? isRu
            ? "Требуется тестовый режим Stripe"
            : "Stripe test rejimi talab qilinadi"
          : isRu
          ? "Оплатить через Stripe"
          : "Stripe orqali to'lash"}
      </Button>
    </form>
  );
}

export default function CheckoutPageClient() {
  const { locale } = useTranslation();
  const isRu = locale === "ru";
  const router = useRouter();
  const searchParams = useSearchParams()!;
  const { hasHydrated, isAuthenticated, user } = useAuthStore();
  const authGate = useRequireAuth();

  const [paymentStatus, setPaymentStatus] = useState<PaymentStatus>("idle");
  const [paymentIntent, setPaymentIntent] = useState<PaymentIntentResponse | null>(null);
  const [paymentError, setPaymentError] = useState<string | null>(null);
  const [intentLoading, setIntentLoading] = useState(false);
  const [billingName, setBillingName] = useState(user?.full_name || "");
  const [billingEmail, setBillingEmail] = useState(user?.email || "");
  const [successPayment, setSuccessPayment] = useState<PaymentIntentResponse | null>(null);

  const publishableKey = process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY?.trim() || "";
  const stripePromise = useMemo(
    () => (publishableKey ? loadStripe(publishableKey) : null),
    [publishableKey]
  );

  const plan = mapPlan(searchParams.get("plan"));
  const cycle = mapCycle(searchParams.get("cycle"));
  const months = cycle === "monthly" ? 1 : 12;
  const price = PRICES[cycle];
  const isMockMode = Boolean(paymentIntent?.client_secret?.startsWith("pi_mock_"));
  const planLabel = plan === "enterprise" ? (isRu ? "Корпоративный" : "Korporativ") : "Premium";
  const cycleLabel = cycle === "yearly" ? (isRu ? "Ежегодно" : "Yillik") : isRu ? "Ежемесячно" : "Oylik";
  const periodLabel = isRu ? `${months} ${months === 1 ? "месяц" : "месяцев"}` : `${months} oy`;
  const features = isRu
    ? [
        "Неограниченная генерация резюме с ИИ",
        "50 откликов на вакансии в месяц",
        "Автоотклик на подходящие вакансии",
        "Расширенная аналитическая панель",
        "Премиум-шаблоны резюме",
        "Приоритетная поддержка по email",
      ]
    : [
        "Cheksiz AI rezyume yaratish",
        "Oyiga 50 ta ishga ariza",
        "Mos ishlar uchun avtomatik ariza",
        "Kengaytirilgan analitika paneli",
        "Premium rezyume shablonlari",
        "Ustuvor email qo'llab-quvvatlash",
      ];

  useEffect(() => {
    if (user?.full_name) {
      setBillingName(user.full_name);
    }
    if (user?.email) {
      setBillingEmail(user.email);
    }
  }, [user?.email, user?.full_name]);

  useEffect(() => {
    if (!hasHydrated || !isAuthenticated) {
      return;
    }

    if (plan === "enterprise") {
      toast.info(
        isRu
          ? "Корпоративные планы оформляются через отдел продаж."
          : "Korporativ tariflar savdo bo'limi orqali rasmiylashtiriladi."
      );
      router.replace("/contact");
      return;
    }

    let cancelled = false;
    const nextIdempotencyKey = makeIdempotencyKey();
    setPaymentError(null);
    setPaymentIntent(null);
    setPaymentStatus("creating_intent");
    setSuccessPayment(null);

    async function createIntent() {
      try {
        setIntentLoading(true);
        const response = await paymentApi.createPaymentIntent({
          subscription_tier: plan,
          subscription_months: months,
          idempotency_key: nextIdempotencyKey,
        });

        if (cancelled) return;

        setPaymentIntent(response.data);
        setPaymentStatus("ready");
      } catch (error) {
        if (cancelled) return;
        const message = getErrorMessage(error);
        setPaymentError(message);
        setPaymentStatus("failed");
        toast.error(message);
      } finally {
        if (!cancelled) {
          setIntentLoading(false);
        }
      }
    }

    createIntent();

    return () => {
      cancelled = true;
    };
  }, [hasHydrated, isAuthenticated, isRu, months, plan, router]);

  const handleSuccess = (payment: PaymentIntentResponse) => {
    setSuccessPayment(payment);
    setPaymentStatus("succeeded");
  };

  const handleFailed = (message: string) => {
    setPaymentError(message);
    setPaymentStatus("failed");
  };

  if (authGate.isLoading || !hasHydrated) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-surface-50 to-brand-50/20 dark:from-surface-950 dark:to-surface-900 p-4">
        <div className="mx-auto flex min-h-[60vh] max-w-5xl items-center justify-center">
          <Card className="p-8 text-center">
            <p className="text-surface-600 dark:text-surface-400">
              {isRu ? "Оформление оплаты загружается..." : "To'lov sahifasi yuklanmoqda..."}
            </p>
          </Card>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return null;
  }

  if (plan === "enterprise") {
    return null;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-surface-50 via-white to-brand-50/20 dark:from-surface-950 dark:via-surface-950 dark:to-surface-900 p-4">
      <div className="mx-auto max-w-6xl">
        <div className="mb-6 flex items-center justify-between">
          <Button variant="ghost" onClick={() => router.back()} className="flex items-center gap-2">
            <ArrowLeft className="h-4 w-4" />
            {isRu ? "Назад" : "Orqaga"}
          </Button>
          <ThemeToggle />
        </div>

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
          <Card className="lg:col-span-2 overflow-hidden border-surface-200/70 bg-white/90 p-0 shadow-xl backdrop-blur dark:border-surface-700/70 dark:bg-surface-900/90">
            <div className="border-b border-surface-200/70 p-6 dark:border-surface-700/70">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <div className="mb-3 inline-flex items-center gap-2 rounded-full bg-brand-500/10 px-3 py-1 text-xs font-semibold text-brand-700 dark:text-brand-300">
                    <Sparkles className="h-3.5 w-3.5" />
                    {isRu ? "Оплата через Stripe" : "Stripe orqali to'lov"}
                  </div>
                  <h1 className="text-3xl font-bold text-surface-900 dark:text-white">
                    {isRu ? "Завершите оформление подписки" : "Obunani yakunlang"}
                  </h1>
                  <p className="mt-2 max-w-2xl text-sm text-surface-600 dark:text-surface-400">
                    {isRu
                      ? "Обновитесь, чтобы открыть премиум AI-инструменты, автоотклик и расширенную аналитику."
                      : "Premium AI vositalari, avtomatik ariza va kengaytirilgan analitikani ochish uchun tarifni yangilang."}
                  </p>
                </div>

                <div className="rounded-2xl border border-surface-200 bg-surface-50 px-4 py-3 text-right dark:border-surface-700 dark:bg-surface-950/60">
                  <p className="text-xs uppercase tracking-[0.2em] text-surface-500">
                    {isRu ? "Итого по плану" : "Tarif jami"}
                  </p>
                  <p className="text-2xl font-bold text-surface-900 dark:text-white">
                    {formatCurrency(price.usd * 100, "USD")}
                  </p>
                </div>
              </div>
            </div>

            <div className="space-y-6 p-6">
              <div className="grid gap-4 md:grid-cols-2">
                <div className="rounded-2xl border border-surface-200 bg-surface-50 p-4 dark:border-surface-700 dark:bg-surface-950/50">
                  <p className="text-xs uppercase tracking-[0.2em] text-surface-500">
                    {isRu ? "Подписка" : "Obuna"}
                  </p>
                  <p className="mt-1 text-lg font-semibold text-surface-900 dark:text-white">
                    {planLabel} {isRu ? "план" : "tarif"}
                  </p>
                  <p className="text-sm text-surface-600 dark:text-surface-400">
                    {cycleLabel} {isRu ? "оплата" : "to'lov"}
                  </p>
                </div>

                <div className="rounded-2xl border border-surface-200 bg-surface-50 p-4 dark:border-surface-700 dark:bg-surface-950/50">
                  <p className="text-xs uppercase tracking-[0.2em] text-surface-500">
                    {isRu ? "Способ оплаты" : "To'lov usuli"}
                  </p>
                  <div className="mt-2 inline-flex items-center gap-2 rounded-full bg-brand-500/10 px-3 py-1 text-sm font-medium text-brand-700 dark:text-brand-300">
                    <CreditCard className="h-4 w-4" />
                    {isRu ? "Карта Stripe" : "Stripe kartasi"}
                  </div>
                </div>
              </div>

              {paymentStatus === "succeeded" && successPayment ? (
                <div className="rounded-3xl border border-green-200 bg-green-50 p-6 text-green-900 dark:border-green-900/60 dark:bg-green-950/40 dark:text-green-100">
                  <div className="flex items-start gap-3">
                    <CheckCircle2 className="mt-0.5 h-5 w-5" />
                    <div className="space-y-2">
                      <h2 className="text-xl font-semibold">
                        {isRu ? "Оплата завершена" : "To'lov yakunlandi"}
                      </h2>
                      <p className="text-sm text-green-900/80 dark:text-green-100/80">
                        {isRu
                          ? "Ваш платеж подтвержден. Активация подписки завершится после обработки webhook на бэкенде."
                          : "To'lovingiz tasdiqlandi. Obuna faollashuvi backend webhook qayta ishlangach yakunlanadi."}
                      </p>
                      <div className="grid gap-2 text-sm sm:grid-cols-2">
                        <div className="rounded-2xl bg-white/70 p-3 dark:bg-white/10">
                          <p className="text-xs uppercase tracking-[0.2em] text-green-900/60 dark:text-green-100/60">
                            {isRu ? "ID платежа" : "To'lov ID"}
                          </p>
                          <p className="mt-1 font-medium break-all">{successPayment.payment_id}</p>
                        </div>
                        <div className="rounded-2xl bg-white/70 p-3 dark:bg-white/10">
                          <p className="text-xs uppercase tracking-[0.2em] text-green-900/60 dark:text-green-100/60">
                            {isRu ? "Сумма" : "Miqdor"}
                          </p>
                          <p className="mt-1 font-medium">
                            {formatCurrency(successPayment.amount, successPayment.currency)}
                          </p>
                        </div>
                      </div>
                      <div className="pt-2">
                        <Button variant="gradient" onClick={() => router.push("/student")}>
                          {isRu ? "Перейти в кабинет" : "Kabinetga o'tish"}
                        </Button>
                      </div>
                    </div>
                  </div>
                </div>
              ) : null}

              {paymentError ? (
                <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800 dark:border-red-900/60 dark:bg-red-950/40 dark:text-red-100">
                  {paymentError}
                </div>
              ) : null}

              <div className="space-y-3">
                <p className="font-medium text-surface-900 dark:text-white">
                  {isRu ? "Платежные данные" : "To'lov ma'lumotlari"}
                </p>
                <div className="grid gap-3 md:grid-cols-2">
                  <label className="space-y-2">
                    <span className="text-sm text-surface-600 dark:text-surface-400">
                      {isRu ? "Полное имя" : "To'liq ism"}
                    </span>
                    <input
                      value={billingName}
                      onChange={(event) => setBillingName(event.target.value)}
                      className="w-full rounded-xl border border-surface-200 bg-white px-4 py-3 text-sm outline-none ring-0 transition focus:border-brand-500 dark:border-surface-700 dark:bg-surface-950"
                      placeholder={isRu ? "Ваше полное имя" : "To'liq ismingiz"}
                    />
                  </label>
                  <label className="space-y-2">
                    <span className="text-sm text-surface-600 dark:text-surface-400">
                      {isRu ? "Email" : "Email"}
                    </span>
                    <input
                      value={billingEmail}
                      onChange={(event) => setBillingEmail(event.target.value)}
                      className="w-full rounded-xl border border-surface-200 bg-white px-4 py-3 text-sm outline-none ring-0 transition focus:border-brand-500 dark:border-surface-700 dark:bg-surface-950"
                      placeholder="name@example.com"
                    />
                  </label>
                </div>
              </div>

              {intentLoading ? (
                <div className="rounded-2xl border border-dashed border-surface-300 bg-surface-50 px-4 py-6 text-sm text-surface-500 dark:border-surface-700 dark:bg-surface-950/40 dark:text-surface-400">
                  {isRu ? "Подготавливаем безопасную оплату..." : "Xavfsiz to'lov tayyorlanmoqda..."}
                </div>
              ) : null}

              {paymentIntent ? (
                <div className="space-y-4">
                  <div className="rounded-2xl border border-surface-200 bg-surface-50 p-4 text-sm text-surface-600 dark:border-surface-700 dark:bg-surface-950/50 dark:text-surface-400">
                    <div className="flex items-center gap-2 font-medium text-surface-900 dark:text-white">
                      <Shield className="h-4 w-4 text-brand-600" />
                      {isRu ? "Безопасный ввод карты" : "Xavfsiz karta kiritish"}
                    </div>
                    <p className="mt-2">
                      {isMockMode
                        ? isRu
                          ? "Бэкенд вернул mock payment intent. Добавьте реальные Stripe secret/publishable ключи, чтобы завершить оплату картой."
                          : "Backend mock payment intent qaytardi. Karta to'lovini yakunlash uchun haqiqiy Stripe secret/publishable kalitlarini qo'shing."
                        : isRu
                        ? "Данные вашей карты отправляются напрямую в Stripe. Мы никогда не храним номера карт на сервере."
                        : "Karta ma'lumotlari Stripe'ga to'g'ridan-to'g'ri yuboriladi. Biz serverda karta raqamlarini saqlamaymiz."}
                    </p>
                  </div>

                  {stripePromise ? (
                    <Elements stripe={stripePromise}>
                      <CheckoutPaymentForm
                        clientSecret={paymentIntent.client_secret}
                        amount={paymentIntent.amount}
                        currency={paymentIntent.currency}
                        subscriptionTier={plan}
                        subscriptionMonths={months}
                        isMockMode={isMockMode}
                        billingName={billingName}
                        billingEmail={billingEmail}
                        onSuccess={handleSuccess}
                        onFailed={handleFailed}
                      />
                    </Elements>
                  ) : (
                    <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900 dark:border-amber-900/60 dark:bg-amber-950/40 dark:text-amber-100">
                      {isRu ? "Укажите" : "Karta formasi uchun"}{" "}
                      <code>NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY</code>{" "}
                      {isRu ? "чтобы включить форму карты." : "ni sozlang."}
                    </div>
                  )}
                </div>
              ) : null}
            </div>
          </Card>

          <div className="space-y-6">
            <Card className="border-surface-200 bg-white/90 p-6 shadow-xl backdrop-blur dark:border-surface-700 dark:bg-surface-900/90">
              <h2 className="mb-4 text-lg font-semibold text-surface-900 dark:text-white">
                {isRu ? "Что вы получаете" : "Nimani olasiz"}
              </h2>
              <ul className="space-y-3">
                {features.map((feature) => (
                  <li
                    key={feature}
                    className="flex items-start gap-3 text-sm text-surface-700 dark:text-surface-300"
                  >
                    <CheckCircle2 className="mt-0.5 h-4 w-4 text-green-600" />
                    <span>{feature}</span>
                  </li>
                ))}
              </ul>
            </Card>

            <Card className="border-surface-200 bg-white/90 p-6 shadow-xl backdrop-blur dark:border-surface-700 dark:bg-surface-900/90">
              <h3 className="mb-4 text-lg font-semibold text-surface-900 dark:text-white">
                {isRu ? "Сводка заказа" : "Buyurtma xulosasi"}
              </h3>
              <div className="space-y-3 text-sm">
                <div className="flex items-center justify-between">
                  <span className="text-surface-600 dark:text-surface-400">
                    {isRu ? "Тариф" : "Tarif"}
                  </span>
                  <span className="font-medium text-surface-900 dark:text-white">{planLabel}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-surface-600 dark:text-surface-400">
                    {isRu ? "Оплата" : "To'lov"}
                  </span>
                  <span className="font-medium text-surface-900 dark:text-white">{cycleLabel}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-surface-600 dark:text-surface-400">
                    {isRu ? "Период" : "Muddat"}
                  </span>
                  <span className="font-medium text-surface-900 dark:text-white">{periodLabel}</span>
                </div>
                <div className="flex items-center justify-between border-t border-surface-200 pt-3 dark:border-surface-700">
                  <span className="text-surface-600 dark:text-surface-400">
                    {isRu ? "Итого" : "Jami"}
                  </span>
                  <span className="text-lg font-bold text-surface-900 dark:text-white">
                    {formatCurrency(price.usd * 100, "USD")}
                  </span>
                </div>
              </div>
            </Card>

            <Card className="border-surface-200 bg-gradient-to-br from-brand-500 to-indigo-600 p-6 text-white shadow-xl">
              <div className="flex items-center gap-2 text-sm font-medium text-white/80">
                <Zap className="h-4 w-4" />
                {isRu ? "Безопасная подписка" : "Xavfsiz obuna"}
              </div>
              <p className="mt-3 text-lg font-semibold">
                {isRu
                  ? "Быстрое обновление, автоматическая активация, без лишних шагов."
                  : "Tez yangilash, avtomatik faollashuv, ortiqcha qadamlar yo'q."}
              </p>
              <p className="mt-2 text-sm text-white/80">
                {isRu
                  ? "Webhook Stripe обновляет подписку после подтверждения оплаты."
                  : "Stripe webhooklari to'lov tasdiqlangach obunani yangilaydi."}
              </p>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}
