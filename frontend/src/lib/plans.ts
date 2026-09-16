/**
 * =============================================================================
 * PLANS — the single source of truth for tiers, prices and limits
 * =============================================================================
 *
 * There were two. /plans sold "Free / Pro / Team" with auto-apply at 10 and 50
 * *per day*; /pricing sold "Bepul / Premium / Enterprise" with 50 applications
 * *per month*; checkout knew only `premium` and `enterprise`. Same 25 000 so'm,
 * three different promises, and a buyer could not tell what they were paying
 * for.
 *
 * The backend decides who is right. `app/core/premium.py` stores the tier as
 * one of free / premium / enterprise and enforces exactly one quota:
 *
 *     FEATURE_LIMITS["auto_apply"] = {free: 0, premium: 50, enterprise: None}
 *
 * and `_get_month_start()` in the auto-apply route makes that window a MONTH.
 * So the honest numbers are 0 / 50-per-month / unlimited, and "10 per day" and
 * "the limit resets at UTC midnight" described a product that does not exist.
 *
 * RULE FOR THIS FILE: a number may appear here only if the backend enforces it.
 * Anything else is a capability, described in words, with no figure attached.
 * `FEATURE_LIMITS` also declares ai_resume_generation and
 * job_applications_per_month, but nothing calls get_feature_limit() for them,
 * so they are not advertised as limits until they are enforced.
 */

/** Tier ids as the database and the payment intent store them. */
export type PlanId = "free" | "premium" | "enterprise";

/** The enforced auto-apply quota, per month. Mirrors FEATURE_LIMITS. */
export const AUTO_APPLY_PER_MONTH: Record<PlanId, number | null> = {
  free: 0,
  premium: 50,
  enterprise: null, // unlimited
};

export const PLAN_PRICES_UZS = {
  premium: { monthly: 25_000, yearly: 250_000 },
} as const;

export interface PlanCopy {
  id: PlanId;
  name: string;
  tagline: string;
  /** Rendered price, already formatted. */
  price: string;
  priceNote: string;
  /** Numeric price in so'm; null means "by agreement". */
  priceUzs: { monthly: number; yearly: number } | null;
  features: string[];
  /** Stated plainly rather than implied by omission. */
  notIncluded: string[];
  cta: string;
  popular?: boolean;
}

const nbsp = (n: number) => n.toLocaleString("ru-RU").replace(/ |,/g, " ");

export function getPlans(isRu: boolean): PlanCopy[] {
  const perMonth = isRu ? "в месяц" : "oyiga";
  return [
    {
      id: "free",
      name: isRu ? "Бесплатный" : "Bepul",
      tagline: isRu
        ? "Чтобы найти работу вручную — без ограничений по времени"
        : "Ishni o'zingiz qidirib topish uchun — muddat cheklovisiz",
      price: isRu ? "0 сум" : "0 so'm",
      priceNote: isRu ? "/ месяц" : "/ oy",
      priceUzs: { monthly: 0, yearly: 0 },
      features: [
        isRu ? "Все вакансии каталога" : "Katalogdagi barcha vakansiyalar",
        isRu ? "AI-резюме и экспорт в PDF" : "AI rezyume va PDF eksport",
        isRu ? "Отклик напрямую работодателю" : "To'g'ridan-to'g'ri ish beruvchiga ariza",
        isRu ? "AI-тренажёр собеседования" : "AI suhbat murabbiyi",
        isRu ? "Подбор вакансий по резюме" : "Rezyume bo'yicha ish tanlash",
      ],
      notIncluded: [isRu ? "Авто-отклик" : "Avto-ariza"],
      cta: isRu ? "Начать бесплатно" : "Bepul boshlash",
    },
    {
      id: "premium",
      name: "Premium",
      tagline: isRu
        ? "Когда откликов нужно больше, чем времени на них"
        : "Ariza ko'p kerak, vaqt esa oz bo'lganda",
      price: `${nbsp(PLAN_PRICES_UZS.premium.monthly)} ${isRu ? "сум" : "so'm"}`,
      priceNote: isRu ? "/ месяц" : "/ oy",
      priceUzs: { ...PLAN_PRICES_UZS.premium },
      features: [
        isRu ? "Всё из бесплатного тарифа" : "Bepul tarifdagi hamma narsa",
        isRu
          ? `Авто-отклик: ${AUTO_APPLY_PER_MONTH.premium} откликов ${perMonth}`
          : `Avto-ariza: ${perMonth} ${AUTO_APPLY_PER_MONTH.premium} ta`,
        isRu ? "AI подбирает вакансии под резюме" : "AI rezyumega mos ishlarni tanlaydi",
        isRu ? "Предпросмотр перед отправкой" : "Yuborishdan oldin ko'rib chiqish",
        isRu
          ? `${nbsp(PLAN_PRICES_UZS.premium.yearly)} сум при оплате за год`
          : `Yillik to'lovda ${nbsp(PLAN_PRICES_UZS.premium.yearly)} so'm`,
      ],
      notIncluded: [],
      cta: isRu ? "Перейти на Premium" : "Premium'ga o'tish",
      popular: true,
    },
    {
      id: "enterprise",
      name: "Enterprise",
      tagline: isRu
        ? "Для буткемпов и команд, ведущих своих студентов"
        : "O'z talabalarini kuzatadigan bootcamp va jamoalar uchun",
      price: isRu ? "Индивидуально" : "Kelishiladi",
      priceNote: isRu ? "по договорённости" : "shartnoma asosida",
      priceUzs: null,
      features: [
        isRu ? "Всё из Premium" : "Premium'dagi hamma narsa",
        isRu ? "Авто-отклик без лимита" : "Avto-ariza cheklovsiz",
        isRu ? "Выделенный менеджер" : "Alohida menejer",
      ],
      notIncluded: [],
      cta: isRu ? "Связаться" : "Bog'lanish",
    },
  ];
}

/** What a tier's auto-apply allowance reads as in the UI. */
export function autoApplyLabel(id: PlanId, isRu: boolean): string {
  const limit = AUTO_APPLY_PER_MONTH[id];
  if (limit === null) return isRu ? "Без лимита" : "Cheklovsiz";
  if (limit === 0) return isRu ? "Недоступно" : "Mavjud emas";
  return isRu ? `${limit} в месяц` : `Oyiga ${limit} ta`;
}
