"use client";

/**
 * The short guide the help centre already promised.
 *
 * "Tezkor boshlash" was described as a step-by-step guide and linked to
 * /student/resumes — a list of resumes, which is a destination, not an
 * explanation. The steps below describe what the product actually does,
 * including the part students get wrong: the application goes to the
 * employer's own contact, so nothing happens unless they write.
 */

import Link from "next/link";
import {
  ArrowRight,
  FileText,
  Search,
  Send,
  MessageSquare,
  ShieldAlert,
} from "lucide-react";
import { useTranslation } from "@/hooks/useTranslation";
import { AUTO_APPLY_PER_MONTH } from "@/lib/plans";

interface Step {
  icon: typeof FileText;
  title: string;
  body: string[];
  action?: { href: string; label: string };
}

const uz = (): Step[] => [
  {
    icon: FileText,
    title: "1. Rezyume tayyorlang",
    body: [
      "AI rezyume yaratuvchidan foydalaning — ta'lim, tajriba va ko'nikmalaringizni kiritsangiz, u tayyor rezyume qaytaradi.",
      "AI yozganini albatta o'qib chiqing: sanalar va nomlar xato bo'lishi mumkin, ular uchun javobgarlik sizda.",
      "Rezyume \"qoralama\" holatida bo'lsa, avto-ariza ishlamaydi — uni nashr qiling.",
    ],
    action: { href: "/student/resumes/create-ai", label: "AI rezyume yaratish" },
  },
  {
    icon: Search,
    title: "2. Mos ishlarni toping",
    body: [
      "Rezyume tayyor bo'lgach, katalog sizning sohangizga mos vakansiyalarni oldinga chiqaradi.",
      "Har bir e'londa \"Rezyumengizga mosligi\" foizi bor. Uning ostidagi ro'yxat qaysi talab mos kelgani va qaysi biri yetishmayotganini ko'rsatadi — foizning o'zidan ko'ra shu ro'yxat foydaliroq.",
      "Filtr orqali hudud, ish turi va tajriba darajasini toraytiring.",
    ],
    action: { href: "/student/jobs", label: "Vakansiyalarni ko'rish" },
  },
  {
    icon: Send,
    title: "3. Ariza bering — to'g'ridan-to'g'ri",
    body: [
      "Bu eng muhim qadam. IshTop vositachi emas: \"Ariza berish\" tugmasi sizga ish beruvchining telefon raqami yoki Telegram username'ini ochadi.",
      "Ya'ni siz o'zingiz yozasiz yoki qo'ng'iroq qilasiz. Tugmani bosishning o'zi hech kimga xabar yubormaydi.",
      "Yozganingizdan keyin arizani \"Arizalarim\" sahifasida belgilab qo'ying — shunda kimga murojaat qilganingizni yo'qotmaysiz.",
    ],
    action: { href: "/student/applications", label: "Arizalarim" },
  },
  {
    icon: MessageSquare,
    title: "4. Suhbatga tayyorlaning",
    body: [
      "Suhbat murabbiyi sizga savol beradi, javobingizni baholaydi va namuna javob ko'rsatadi.",
      "Uni rezyumengiz bo'yicha ham, aniq bir vakansiya talablari bo'yicha ham ishga tushirish mumkin — vakansiya sahifasidagi \"AI bilan suhbatga tayyorlanish\" tugmasi orqali.",
    ],
    action: { href: "/student/interview", label: "Suhbat murabbiyi" },
  },
  {
    icon: ShieldAlert,
    title: "5. O'zingizni ehtiyot qiling",
    body: [
      "Katalogdagi e'lonlarning bir qismi ochiq Telegram kanallaridan yig'iladi. Maosh va talablar — e'lon muallifining so'zlari, biz ularni tekshira olmaymiz.",
      "Ishga joylashish uchun sizdan pul, karta ma'lumoti yoki hujjat garovi so'ralsa — bu firibgarlik. Suhbatni to'xtating va bizga xabar bering.",
    ],
  },
];

const ru = (): Step[] => [
  {
    icon: FileText,
    title: "1. Подготовьте резюме",
    body: [
      "Используйте AI-генератор: укажите образование, опыт и навыки — он вернёт готовое резюме.",
      "Обязательно перечитайте то, что написал AI: даты и названия могут быть неточными, и отвечаете за них вы.",
      "Пока резюме в статусе «черновик», авто-отклик работать не будет — опубликуйте его.",
    ],
    action: { href: "/student/resumes/create-ai", label: "Создать AI-резюме" },
  },
  {
    icon: Search,
    title: "2. Найдите подходящие вакансии",
    body: [
      "Как только резюме готово, каталог поднимает наверх вакансии из вашей сферы.",
      "У каждой есть процент соответствия. Список под ним показывает, какие требования совпали, а каких не хватает — он полезнее самого процента.",
      "Сузьте выдачу фильтрами по региону, типу занятости и уровню.",
    ],
    action: { href: "/student/jobs", label: "Смотреть вакансии" },
  },
  {
    icon: Send,
    title: "3. Откликайтесь — напрямую",
    body: [
      "Это главный шаг. IshTop не посредник: кнопка «Откликнуться» открывает телефон или Telegram работодателя.",
      "То есть пишете или звоните вы сами. Само нажатие кнопки никому ничего не отправляет.",
      "После обращения отметьте отклик на странице «Мои отклики», чтобы не потерять, кому вы уже написали.",
    ],
    action: { href: "/student/applications", label: "Мои отклики" },
  },
  {
    icon: MessageSquare,
    title: "4. Подготовьтесь к собеседованию",
    body: [
      "Тренажёр задаёт вопрос, оценивает ваш ответ и показывает образец.",
      "Его можно запустить и по вашему резюме, и по требованиям конкретной вакансии — кнопкой «Подготовиться к собеседованию» на странице вакансии.",
    ],
    action: { href: "/student/interview", label: "Тренажёр собеседования" },
  },
  {
    icon: ShieldAlert,
    title: "5. Берегите себя",
    body: [
      "Часть объявлений собрана из открытых Telegram-каналов. Зарплата и требования — слова автора объявления, мы не можем их проверить.",
      "Если за трудоустройство просят деньги, данные карты или документы в залог — это мошенничество. Прекратите общение и сообщите нам.",
    ],
  },
];

export default function GettingStartedPage() {
  const { locale } = useTranslation();
  const isRu = locale === "ru";
  const steps = isRu ? ru() : uz();

  return (
    <div className="space-y-6 p-4 lg:p-8">
      <div>
        <Link
          href="/student/help"
          className="focus-ring text-sm font-medium text-brand-600 hover:underline dark:text-brand-300"
        >
          ← {isRu ? "Центр помощи" : "Yordam markazi"}
        </Link>
        <h1 className="mt-4 font-display text-2xl font-bold text-surface-900 dark:text-white">
          {isRu ? "Быстрый старт" : "Tezkor boshlash"}
        </h1>
        <p className="mt-2 max-w-2xl text-surface-600 dark:text-surface-300">
          {isRu
            ? `Пять шагов от пустого профиля до первого отклика. Всё, кроме авто-отклика (${AUTO_APPLY_PER_MONTH.premium} в месяц на Premium), доступно бесплатно.`
            : `Bo'sh profildan birinchi arizagacha — besh qadam. Avto-arizadan (Premium'da oyiga ${AUTO_APPLY_PER_MONTH.premium} ta) tashqari hammasi bepul.`}
        </p>
      </div>

      <ol className="space-y-4">
        {steps.map((step) => {
          const Icon = step.icon;
          return (
            <li
              key={step.title}
              className="rounded-2xl border border-surface-200 bg-white p-5 shadow-sm dark:border-surface-700 dark:bg-surface-900"
            >
              <div className="flex gap-4">
                <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-brand-500/10 text-brand-600 dark:text-brand-300">
                  <Icon className="h-5 w-5" aria-hidden />
                </span>
                <div className="min-w-0 flex-1">
                  <h2 className="font-semibold text-surface-900 dark:text-white">
                    {step.title}
                  </h2>
                  <div className="mt-2 space-y-2">
                    {step.body.map((line, i) => (
                      <p
                        key={i}
                        className="text-sm leading-relaxed text-surface-600 dark:text-surface-300"
                      >
                        {line}
                      </p>
                    ))}
                  </div>
                  {step.action && (
                    <Link
                      href={step.action.href}
                      className="focus-ring mt-3 inline-flex items-center gap-1.5 rounded-full bg-brand-500/10 px-3 py-1.5 text-sm font-semibold text-brand-700 hover:bg-brand-500/20 dark:text-brand-300"
                    >
                      {step.action.label}
                      <ArrowRight className="h-3.5 w-3.5" aria-hidden />
                    </Link>
                  )}
                </div>
              </div>
            </li>
          );
        })}
      </ol>
    </div>
  );
}
