/**
 * Visual identity for the "soha" a listing belongs to.
 *
 * The card used to open with the employer's first letter, which carries no
 * information: 247 listings all showed one grey glyph, so nothing in the list
 * was scannable. The category is derived server-side by the same keyword
 * classifier the Telegram bot uses (`app/core/job_categories.py`, validated on
 * 224 live listings), and arrives on the job as `category`.
 *
 * Lucide icons rather than the taxonomy's emoji: emoji render differently on
 * every platform and sit oddly against the rest of the UI, which is lucide
 * throughout.
 */

import {
  Code2,
  ShoppingCart,
  UtensilsCrossed,
  Truck,
  Factory,
  PhoneCall,
  Palette,
  GraduationCap,
  Stethoscope,
  Calculator,
  HardHat,
  Briefcase,
  type LucideIcon,
} from "lucide-react";

export type CategoryStyle = {
  id: string;
  labelUz: string;
  labelRu: string;
  Icon: LucideIcon;
  /** Tile background + icon colour, light and dark. */
  tile: string;
};

const CATEGORIES: Record<string, Omit<CategoryStyle, "id">> = {
  it: {
    labelUz: "IT · Dasturlash",
    labelRu: "IT · Разработка",
    Icon: Code2,
    tile: "bg-indigo-50 text-indigo-600 dark:bg-indigo-500/15 dark:text-indigo-300",
  },
  sales: {
    labelUz: "Savdo · Xizmat",
    labelRu: "Продажи · Сервис",
    Icon: ShoppingCart,
    tile: "bg-sky-50 text-sky-600 dark:bg-sky-500/15 dark:text-sky-300",
  },
  food: {
    labelUz: "Ovqatlanish",
    labelRu: "Общепит",
    Icon: UtensilsCrossed,
    tile: "bg-orange-50 text-orange-600 dark:bg-orange-500/15 dark:text-orange-300",
  },
  logistics: {
    labelUz: "Logistika",
    labelRu: "Логистика",
    Icon: Truck,
    tile: "bg-emerald-50 text-emerald-600 dark:bg-emerald-500/15 dark:text-emerald-300",
  },
  engineering: {
    labelUz: "Ishlab chiqarish",
    labelRu: "Производство",
    Icon: Factory,
    tile: "bg-slate-100 text-slate-600 dark:bg-slate-500/20 dark:text-slate-300",
  },
  call: {
    labelUz: "Call-markaz",
    labelRu: "Call-центр",
    Icon: PhoneCall,
    tile: "bg-cyan-50 text-cyan-600 dark:bg-cyan-500/15 dark:text-cyan-300",
  },
  marketing: {
    labelUz: "Marketing · Dizayn",
    labelRu: "Маркетинг · Дизайн",
    Icon: Palette,
    tile: "bg-fuchsia-50 text-fuchsia-600 dark:bg-fuchsia-500/15 dark:text-fuchsia-300",
  },
  education: {
    labelUz: "Ta'lim",
    labelRu: "Образование",
    Icon: GraduationCap,
    tile: "bg-amber-50 text-amber-600 dark:bg-amber-500/15 dark:text-amber-300",
  },
  medicine: {
    labelUz: "Tibbiyot · Go'zallik",
    labelRu: "Медицина · Красота",
    Icon: Stethoscope,
    tile: "bg-rose-50 text-rose-600 dark:bg-rose-500/15 dark:text-rose-300",
  },
  finance: {
    labelUz: "Buxgalteriya · Moliya",
    labelRu: "Бухгалтерия · Финансы",
    Icon: Calculator,
    tile: "bg-teal-50 text-teal-600 dark:bg-teal-500/15 dark:text-teal-300",
  },
  construction: {
    labelUz: "Qurilish",
    labelRu: "Строительство",
    Icon: HardHat,
    tile: "bg-yellow-50 text-yellow-700 dark:bg-yellow-500/15 dark:text-yellow-300",
  },
  other: {
    labelUz: "Boshqa",
    labelRu: "Другое",
    Icon: Briefcase,
    tile: "bg-surface-100 text-surface-500 dark:bg-surface-800 dark:text-surface-400",
  },
};

export function categoryStyle(id: string | null | undefined): CategoryStyle {
  const key = (id || "other").toLowerCase();
  const found = CATEGORIES[key] ?? CATEGORIES.other;
  return { id: key in CATEGORIES ? key : "other", ...found };
}

export function categoryLabel(
  id: string | null | undefined,
  isRu: boolean,
): string {
  const c = categoryStyle(id);
  return isRu ? c.labelRu : c.labelUz;
}
