"use client";

import { Quote, Star } from "lucide-react";
import { useTranslation } from "@/hooks/useTranslation";
import { ScrollReveal3D, Tilt } from "./primitives";
import { SwipeStack } from "@/components/ui/swipe-cards";

type Locale = "uz" | "ru" | "en";

type Item = {
  name: string;
  role: string;
  company: string;
  avatarBg: string;
  initials: string;
  quote: string;
  stat: string;
};

const ITEMS: Record<Locale, Item[]> = {
  uz: [
    {
      name: "Sevinch Q.",
      role: "Junior Frontend Developer",
      company: "EPAM",
      avatarBg: "linear-gradient(135deg,#8ab4ff,#b7a4ff)",
      initials: "SQ",
      quote:
        "12 ta ariza yubordim, 4 ta suhbat oldim, 2 ta oferta. IshTop tushuntirib bergan match score sababli qaysi ishga e'tibor qaratishni bildim.",
      stat: "2 hafta — birinchi oferta",
    },
    {
      name: "Nodirbek A.",
      role: "Data Analyst",
      company: "Uzum",
      avatarBg: "linear-gradient(135deg,#f0b98a,#e88fae)",
      initials: "NA",
      quote:
        "Resume AI portfeligimni o'zgartirdi. ATS-friendly bullet pointlar va explainable match — bularsiz hech ham birinchi ishni topa olmagan bo'lar edim.",
      stat: "Resume score 62 → 94",
    },
    {
      name: "Aziza T.",
      role: "QA Engineer",
      company: "TBC Bank",
      avatarBg: "linear-gradient(135deg,#7cc7a2,#8ab4ff)",
      initials: "AT",
      quote:
        "Interview Coach realistik mock interviewlar bilan o'ziga ishonch berdi. Birinchi suhbatdayoq oferta oldim.",
      stat: "Mock → real interview pass rate +38%",
    },
  ],
  ru: [
    {
      name: "Севинч К.",
      role: "Junior Frontend Developer",
      company: "EPAM",
      avatarBg: "linear-gradient(135deg,#8ab4ff,#b7a4ff)",
      initials: "СК",
      quote:
        "12 откликов, 4 интервью, 2 оффера. Объяснимый match score помог сфокусироваться на правильных вакансиях.",
      stat: "2 недели до первого оффера",
    },
    {
      name: "Нодирбек А.",
      role: "Data Analyst",
      company: "Uzum",
      avatarBg: "linear-gradient(135deg,#f0b98a,#e88fae)",
      initials: "НА",
      quote:
        "Resume AI переписал портфолио. ATS-friendly буллеты и понятный match — без этого первая работа точно бы не случилась.",
      stat: "Resume score 62 → 94",
    },
    {
      name: "Азиза Т.",
      role: "QA Engineer",
      company: "TBC Bank",
      avatarBg: "linear-gradient(135deg,#7cc7a2,#8ab4ff)",
      initials: "АТ",
      quote:
        "Interview Coach с реалистичными mock-интервью дал уверенность. На первом же реальном интервью — оффер.",
      stat: "Mock → real interview pass rate +38%",
    },
  ],
  en: [
    {
      name: "Sevinch Q.",
      role: "Junior Frontend Developer",
      company: "EPAM",
      avatarBg: "linear-gradient(135deg,#8ab4ff,#b7a4ff)",
      initials: "SQ",
      quote:
        "12 applications, 4 interviews, 2 offers. The explainable match score helped me focus on the right roles.",
      stat: "2 weeks to first offer",
    },
    {
      name: "Nodirbek A.",
      role: "Data Analyst",
      company: "Uzum",
      avatarBg: "linear-gradient(135deg,#f0b98a,#e88fae)",
      initials: "NA",
      quote:
        "Resume AI rewrote my portfolio. ATS-friendly bullets and explainable matches — without them I wouldn't have landed a job.",
      stat: "Resume score 62 → 94",
    },
    {
      name: "Aziza T.",
      role: "QA Engineer",
      company: "TBC Bank",
      avatarBg: "linear-gradient(135deg,#7cc7a2,#8ab4ff)",
      initials: "AT",
      quote:
        "Interview Coach gave me realistic mock interviews and confidence. First real interview was an offer.",
      stat: "Mock → real interview pass rate +38%",
    },
  ],
};

export function Testimonials() {
  const { locale } = useTranslation();
  const L = (["uz", "ru", "en"] as const).includes(locale as Locale)
    ? (locale as Locale)
    : "uz";
  const items = ITEMS[L];

  return (
    <section className="silver-ground section-y" aria-labelledby="stories-heading">
      <div className="section-shell">
        <div className="mx-auto max-w-2xl text-center">
          <span className="chip-silver uppercase tracking-[0.18em] !text-[11px]">
            {L === "ru" ? "Истории успеха" : L === "en" ? "Success stories" : "Muvaffaqiyat hikoyalari"}
          </span>
          <h2 id="stories-heading" className="h-display mt-4 text-3xl text-[#18181b] sm:text-5xl">
            {L === "ru"
              ? "Студенты, которые вчера были как ты"
              : L === "en"
              ? "Students who were where you are"
              : "Kechagi sizlar — bugungi mutaxassislar"}
          </h2>
        </div>

        {/* Mobile: swipeable card stack (signature pattern) */}
        <div className="mt-12 lg:hidden">
          <SwipeStack
            items={items}
            ariaLabel={
              L === "ru"
                ? "Истории успеха"
                : L === "en"
                ? "Success stories"
                : "Muvaffaqiyat hikoyalari"
            }
            renderItem={(t) => <TestimonialCard item={t} />}
          />
        </div>

        {/* Desktop / tablet: 3D tilt grid */}
        <div className="mt-14 hidden items-stretch gap-5 lg:grid lg:grid-cols-3">
          {items.map((t, i) => (
            <ScrollReveal3D key={t.name} delay={i * 0.08} amount={0.3} fullHeight>
              <Tilt max={6} className="group h-full">
                <TestimonialCard item={t} />
              </Tilt>
            </ScrollReveal3D>
          ))}
        </div>
      </div>
    </section>
  );
}

type TestimonialItem = (typeof ITEMS)["uz"][number];

function TestimonialCard({ item: t }: { item: TestimonialItem }) {
  return (
    <figure
      className="card-silver card-silver-hover relative flex h-full flex-col p-7"
      style={{ transformStyle: "preserve-3d" }}
    >
      <Quote className="absolute right-6 top-6 h-8 w-8 text-[#c9d9f5]" aria-hidden />
      <div className="flex items-center gap-1 text-amber-400" aria-label="5 out of 5 stars">
        {Array.from({ length: 5 }).map((_, i) => (
          <Star key={i} className="h-4 w-4 fill-current" aria-hidden />
        ))}
      </div>
      <blockquote className="mt-5 text-pretty text-[#3f3f46]">
        &ldquo;{t.quote}&rdquo;
      </blockquote>

      <div className="mt-5 inline-flex w-fit items-center gap-2 rounded-full bg-[#d9f1e4] px-3 py-1 text-xs font-semibold text-[#2f7a56]">
        {t.stat}
      </div>

      <figcaption className="mt-auto flex items-center gap-3 border-t border-[#ececea] pt-5">
        <span
          aria-hidden
          className="grid h-11 w-11 place-items-center rounded-full text-sm font-semibold text-white"
          style={{ background: t.avatarBg }}
        >
          {t.initials}
        </span>
        <div>
          <p className="font-semibold text-[#18181b]">{t.name}</p>
          <p className="text-xs text-[#8e8e96]">
            {t.role} · {t.company}
          </p>
        </div>
      </figcaption>
    </figure>
  );
}

export default Testimonials;
