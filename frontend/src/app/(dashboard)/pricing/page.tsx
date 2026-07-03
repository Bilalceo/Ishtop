"use client";

/**
 * =============================================================================
 * PRICING PAGE
 * =============================================================================
 * 
 * Premium subscription pricing and plans
 */

import { useState, useEffect } from "react";
import { Check, X, Sparkles, Zap, Crown, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { ThemeToggle } from "@/components/ui/theme-toggle";
import { useAuthStore } from "@/store/authStore";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { useTranslation } from "@/hooks/useTranslation";

// =============================================================================
// TYPES
// =============================================================================

interface PricingPlan {
  id: string;
  name: string;
  price: {
    monthly: number;
    yearly: number;
  };
  description: string;
  features: string[];
  notIncluded?: string[];
  popular?: boolean;
  icon: any;
  color: string;
}

// =============================================================================
// PRICING DATA
// =============================================================================

const getPricingPlans = (isRu: boolean): PricingPlan[] => [
  {
    id: "free",
    name: isRu ? "Бесплатный" : "Bepul",
    price: {
      monthly: 0,
      yearly: 0,
    },
    description: isRu ? "Идеально для знакомства со IshTop" : "IshTop ni sinab ko'rish uchun",
    features: [
      isRu ? "1 AI-резюме" : "1 ta AI rezyume",
      isRu ? "5 заявок в месяц" : "Oyiga 5 ta ariza",
      isRu ? "Базовый подбор вакансий" : "Asosiy ish moslashtirish",
      isRu ? "Поддержка по email" : "Email qo'llab-quvvatlash",
    ],
    notIncluded: [
      isRu ? "Безлимитные AI-генерации" : "Cheksiz AI yaratish",
      isRu ? "Автоотклик" : "Avto-ariza funksiyasi",
      isRu ? "Приоритетная поддержка" : "Ustuvor qo'llab-quvvatlash",
      isRu ? "Панель аналитики" : "Analitika paneli",
    ],
    icon: Sparkles,
    color: "bg-gray-500",
  },
  {
    id: "premium",
    name: "Premium",
    price: {
      monthly: 25000,
      yearly: 250000,
    },
    description: isRu ? "Для активных соискателей и студентов" : "Faol ish izlovchilar va talabalar uchun",
    features: [
      isRu ? "Безлимитная AI генерация резюме" : "Cheksiz AI rezyume yaratish",
      isRu ? "50 заявок в месяц" : "Oyiga 50 ta ariza",
      isRu ? "Автоотклик на подходящие вакансии" : "Mos ishlar uchun avto-ariza",
      isRu ? "Приоритетный подбор" : "Ustuvor ish moslashtirish",
      isRu ? "Расширенная аналитика" : "Kengaytirilgan analitika",
      isRu ? "Премиум шаблоны резюме" : "Premium rezyume shablonlari",
      isRu ? "Приоритетная email поддержка" : "Ustuvor email qo'llab-quvvatlash",
    ],
    popular: true,
    icon: Zap,
    color: "bg-brand-500",
  },
  {
    id: "enterprise",
    name: "Enterprise",
    price: {
      monthly: 0,  // Custom
      yearly: 0,   // Custom
    },
    description: isRu ? "Для команд и организаций" : "Jamoalar va tashkilotlar uchun",
    features: [
      isRu ? "Все возможности Premium" : "Premium dagi hamma imkoniyat",
      isRu ? "Безлимитные заявки" : "Cheksiz arizalar",
      isRu ? "Управление командой (до 50 пользователей)" : "Jamoa boshqaruvi (50 foydalanuvchigacha)",
      isRu ? "Кастомный брендинг" : "Maxsus brending",
      isRu ? "Доступ к API" : "API kirish",
      isRu ? "Выделенный менеджер" : "Alohida menejer",
      isRu ? "24/7 приоритетная поддержка" : "24/7 ustuvor yordam",
      isRu ? "SLA гарантия" : "SLA kafolati",
      isRu ? "Кастомные интеграции" : "Maxsus integratsiyalar",
    ],
    icon: Crown,
    color: "bg-brand-500",
  },
];

// =============================================================================
// COMPONENT
// =============================================================================

export default function PricingPage() {
  const { locale } = useTranslation();
  const isRu = locale === "ru";
  const router = useRouter();
  const { user, isAuthenticated } = useAuthStore();
  const pricingPlans = getPricingPlans(isRu);
  const [billingCycle, setBillingCycle] = useState<"monthly" | "yearly">("monthly");
  const [loading, setLoading] = useState(false);

  const handleSelectPlan = async (planId: string) => {
    if (!isAuthenticated) {
      toast.error(isRu ? "Войдите в систему для оформления подписки" : "Obuna uchun tizimga kiring");
      router.push("/login?redirect=/pricing");
      return;
    }

    if (planId === "free") {
      toast.info(isRu ? "Вы уже на бесплатном тарифе!" : "Siz allaqachon bepul tarifdasiz!");
      return;
    }

    if (planId === "enterprise") {
      // Redirect to contact page
      router.push("/contact");
      return;
    }

    // Redirect to checkout
    router.push(`/checkout?plan=${planId}&cycle=${billingCycle}`);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-surface-50 to-brand-50/20 dark:from-surface-950 dark:to-surface-900 relative">
      <div className="absolute top-4 right-4">
        <ThemeToggle />
      </div>
      <div className="container mx-auto px-4 py-12">
        {/* Header */}
        <div className="text-center mb-12">
          <h1 className="text-4xl md:text-5xl font-bold text-surface-900 dark:text-white mb-4">
            {isRu ? "Выберите тариф" : "Tarifni tanlang"}
          </h1>
          <p className="text-lg text-surface-600 dark:text-surface-400 mb-8 max-w-2xl mx-auto">
            {isRu
              ? "Откройте все возможности AI-инструментов для карьеры. Начните бесплатно и улучшайте в любой момент."
              : "AI asosidagi karyera vositalarining to'liq imkoniyatlarini oching. Bepul boshlang va istalgan payt tarifni oshiring."}
          </p>

          {/* Billing Toggle */}
          <div className="inline-flex items-center bg-white dark:bg-surface-800 rounded-full p-1 shadow-md">
            <button
              onClick={() => setBillingCycle("monthly")}
              className={`px-6 py-2 rounded-full text-sm font-medium transition-all ${
                billingCycle === "monthly"
                  ? "bg-brand-500 text-white"
                  : "text-surface-600 dark:text-surface-400 hover:text-surface-900 dark:hover:text-white"
              }`}
            >
              {isRu ? "Ежемесячно" : "Oylik"}
            </button>
            <button
              onClick={() => setBillingCycle("yearly")}
              className={`px-6 py-2 rounded-full text-sm font-medium transition-all relative ${
                billingCycle === "yearly"
                  ? "bg-brand-500 text-white"
                  : "text-surface-600 dark:text-surface-400 hover:text-surface-900 dark:hover:text-white"
              }`}
            >
              {isRu ? "Ежегодно" : "Yillik"}
              <span className="absolute -top-2 -right-2 bg-green-500 text-white text-xs px-2 py-0.5 rounded-full">
                {isRu ? "Экономия 17%" : "17% tejaladi"}
              </span>
            </button>
          </div>
        </div>

        {/* Pricing Cards */}
        <div className="grid md:grid-cols-3 gap-8 max-w-7xl mx-auto">
          {pricingPlans.map((plan) => {
            const Icon = plan.icon;
            const price = billingCycle === "monthly" ? plan.price.monthly : plan.price.yearly;
            const isCurrentPlan = user?.subscription_tier === plan.id;

            return (
              <Card
                key={plan.id}
                className={`relative overflow-hidden transition-all duration-300 hover:scale-105 ${
                  plan.popular
                    ? "border-2 border-brand-500 shadow-xl"
                    : "border border-surface-200 dark:border-surface-700"
                }`}
              >
                {/* Popular Badge */}
                {plan.popular && (
                  <div className="absolute top-0 right-0 bg-brand-500 text-white text-xs font-bold px-3 py-1 rounded-bl-lg">
                    {isRu ? "ПОПУЛЯРНЫЙ" : "ENG MASHHUR"}
                  </div>
                )}

                <div className="p-8">
                  {/* Icon & Name */}
                  <div className="flex items-center gap-3 mb-4">
                    <div className={`${plan.color} p-3 rounded-lg`}>
                      <Icon className="h-6 w-6 text-white" />
                    </div>
                    <div>
                      <h3 className="text-2xl font-bold text-surface-900 dark:text-white">
                        {plan.name}
                      </h3>
                      <p className="text-sm text-surface-600 dark:text-surface-400">
                        {plan.description}
                      </p>
                    </div>
                  </div>

                  {/* Price */}
                  <div className="mb-6">
                    {plan.id === "enterprise" ? (
                      <div className="text-4xl font-bold text-surface-900 dark:text-white">
                        {isRu ? "Индивидуально" : "Maxsus"}
                      </div>
                    ) : (
                      <div>
                        <span className="text-5xl font-bold text-surface-900 dark:text-white">
                          {price.toLocaleString("ru-RU")}
                        </span>
                        <span className="text-surface-600 dark:text-surface-400 ml-2">
                          {isRu ? "сум" : "so'm"}/{billingCycle === "monthly" ? (isRu ? "мес" : "oy") : (isRu ? "год" : "yil")}
                        </span>
                        {billingCycle === "yearly" && plan.id !== "free" && (
                          <div className="text-sm text-green-600 dark:text-green-400 mt-1">
                            {isRu ? "Экономия" : "Tejaladi"} {(plan.price.monthly * 12 - plan.price.yearly).toLocaleString("ru-RU")} {isRu ? "сум" : "so'm"}/{isRu ? "год" : "yil"}
                          </div>
                        )}
                      </div>
                    )}
                  </div>

                  {/* CTA Button */}
                  <Button
                    onClick={() => handleSelectPlan(plan.id)}
                    disabled={isCurrentPlan || loading}
                    variant={plan.popular ? "gradient" : "outline"}
                    className="w-full mb-6"
                    size="lg"
                  >
                    {isCurrentPlan ? (
                      isRu ? "Текущий тариф" : "Joriy tarif"
                    ) : plan.id === "enterprise" ? (
                      isRu ? "Связаться с отделом продаж" : "Savdo bo'limi bilan bog'lanish"
                    ) : (
                      <>
                        {isRu ? "Начать" : "Boshlash"}
                        <ArrowRight className="ml-2 h-4 w-4" />
                      </>
                    )}
                  </Button>

                  {/* Features */}
                  <div className="space-y-3">
                    {plan.features.map((feature, idx) => (
                      <div key={idx} className="flex items-start gap-3">
                        <Check className="h-5 w-5 text-green-500 flex-shrink-0 mt-0.5" />
                        <span className="text-sm text-surface-700 dark:text-surface-300">
                          {feature}
                        </span>
                      </div>
                    ))}

                    {plan.notIncluded && plan.notIncluded.length > 0 && (
                      <>
                        <div className="border-t border-surface-200 dark:border-surface-700 my-4" />
                        {plan.notIncluded.map((feature, idx) => (
                          <div key={idx} className="flex items-start gap-3 opacity-50">
                            <X className="h-5 w-5 text-surface-400 flex-shrink-0 mt-0.5" />
                            <span className="text-sm text-surface-600 dark:text-surface-400">
                              {feature}
                            </span>
                          </div>
                        ))}
                      </>
                    )}
                  </div>
                </div>
              </Card>
            );
          })}
        </div>

        {/* FAQ or Additional Info */}
        <div className="mt-16 text-center">
          <p className="text-surface-600 dark:text-surface-400 mb-4">
            {isRu ? "Все тарифы включают доступ к AI инструментам и регулярным обновлениям." : "Barcha tariflar AI vositalari va muntazam yangilanishlarni o'z ichiga oladi."}
          </p>
          <p className="text-sm text-surface-500 dark:text-surface-500">
            {isRu ? "Нужна помощь с выбором?" : "Tanlashda yordam kerakmi?"} <a href="/contact" className="text-brand-500 hover:underline">{isRu ? "Свяжитесь с нами" : "Biz bilan bog'laning"}</a>
          </p>
        </div>
      </div>
    </div>
  );
}
