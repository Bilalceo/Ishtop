"use client";

import { useState } from "react";
import { ChevronDown, HelpCircle } from "lucide-react";
import { useTranslation } from "@/hooks/useTranslation";

type Locale = "uz" | "ru" | "en";

const Q: Record<Locale, { q: string; a: string }[]> = {
  uz: [
    {
      q: "IshTop bepulmi?",
      a: "Ha. Asosiy imkoniyatlar — profil, AI moslik va arizalar — bepul. Premium'da avto-ariza, AI rezyume Pro va suhbat murabbiyi mavjud.",
    },
    {
      q: "AI mening ma'lumotlarimni o‘qiydimi?",
      a: "Faqat sizning ruxsatingiz bilan. Ma'lumotlar shifrlangan, uchinchi tomonga sotilmaydi va istalgan vaqtda o‘chirish mumkin.",
    },
    {
      q: "Tajribasiz talabaman, mosligi bormi?",
      a: "Albatta. IshTop ko‘nikma + portfolio asosida ham match qila oladi. Skill-gap plan 7/14/30 kunda nima o‘rganishni ko‘rsatadi.",
    },
    {
      q: "Soxta vakansiyalar bo‘ladimi?",
      a: "Yo‘q. Har bir kompaniya 0-100 Trust Score bilan baholanadi. Past balli e'lonlar avtomatik filtrlanadi.",
    },
    {
      q: "Qaysi tilda ishlaydi?",
      a: "O‘zbekcha, ruscha va inglizcha. AI matnlar ham tanlangan tilingizda chiqadi.",
    },
  ],
  ru: [
    {
      q: "IshTop бесплатный?",
      a: "Да. Базовые функции — профиль, AI-подбор и отклики — бесплатно. В Premium: авто-отклики, AI-резюме Pro и тренажёр собеседований.",
    },
    {
      q: "AI читает мои данные?",
      a: "Только с твоего разрешения. Данные шифруются, не продаются и удаляются по запросу.",
    },
    {
      q: "Я без опыта — подойдёт?",
      a: "Да. IshTop умеет матчить по навыкам и портфолио. Skill-gap план показывает, что учить в ближайшие 7/14/30 дней.",
    },
    {
      q: "Бывают фейковые вакансии?",
      a: "Нет. Каждая компания — Trust Score 0–100. Подозрительные посты фильтруются автоматически.",
    },
    {
      q: "На каких языках работает?",
      a: "Узбекский, русский, английский. AI-тексты — на твоём выбранном языке.",
    },
  ],
  en: [
    {
      q: "Is IshTop free?",
      a: "Yes. Profile, AI match and applications are free. Premium adds Auto-apply, Resume AI Pro and Interview Coach.",
    },
    {
      q: "Does AI read my data?",
      a: "Only with your permission. Data is encrypted, never sold, and you can delete it any time.",
    },
    {
      q: "I have no experience — will it work?",
      a: "Yes. IshTop matches by skills and portfolio. The skill-gap plan tells you what to learn in 7/14/30 days.",
    },
    {
      q: "Will I see fake job posts?",
      a: "No. Every company has a 0–100 Trust Score. Low-score posts are filtered automatically.",
    },
    {
      q: "Which languages do you support?",
      a: "Uzbek, Russian, English. AI outputs adapt to your selected language.",
    },
  ],
};

export function FAQ() {
  const { locale } = useTranslation();
  const L = (["uz", "ru", "en"] as const).includes(locale as Locale)
    ? (locale as Locale)
    : "uz";
  const items = Q[L];
  const [open, setOpen] = useState<number | null>(0);

  return (
    <section
      id="faq"
      className="silver-ground section-y"
      aria-labelledby="faq-heading"
    >
      <div className="section-shell">
        <div className="mx-auto max-w-2xl text-center">
          <span className="chip-silver uppercase tracking-[0.18em] !text-[11px]">
            <HelpCircle className="h-3 w-3 text-[#8ab4ff]" />
            FAQ
          </span>
          <h2 id="faq-heading" className="h-display mt-4 text-3xl text-[#18181b] sm:text-4xl">
            {L === "ru"
              ? "Часто задаваемые вопросы"
              : L === "en"
              ? "Frequently asked questions"
              : "Ko'p so'raladigan savollar"}
          </h2>
        </div>

        <div className="mx-auto mt-12 max-w-3xl">
          <ul className="space-y-3">
            {items.map((item, i) => {
              const isOpen = open === i;
              return (
                <li key={item.q} className="card-silver overflow-hidden">
                  <button
                    type="button"
                    onClick={() => setOpen(isOpen ? null : i)}
                    aria-expanded={isOpen}
                    aria-controls={`faq-panel-${i}`}
                    className="focus-ring flex w-full items-center justify-between gap-4 p-5 text-left"
                  >
                    <span className="font-display text-base font-semibold text-[#18181b] sm:text-lg">
                      {item.q}
                    </span>
                    <ChevronDown
                      aria-hidden
                      className={`h-5 w-5 shrink-0 text-[#8e8e96] transition-transform duration-300 ${
                        isOpen ? "rotate-180 text-[#8ab4ff]" : ""
                      }`}
                    />
                  </button>
                  <div
                    id={`faq-panel-${i}`}
                    role="region"
                    aria-hidden={!isOpen}
                    className={`grid overflow-hidden px-5 transition-all duration-400 ease-out ${
                      isOpen ? "grid-rows-[1fr] pb-5" : "grid-rows-[0fr]"
                    }`}
                  >
                    <div className="overflow-hidden text-pretty text-[#63636b]">
                      {item.a}
                    </div>
                  </div>
                </li>
              );
            })}
          </ul>
        </div>
      </div>
    </section>
  );
}

export default FAQ;
