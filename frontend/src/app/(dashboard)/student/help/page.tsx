"use client";

import Link from "next/link";
import { BookOpen, MessageCircle, Mail, Shield, FileText, ArrowRight } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useTranslation } from "@/hooks/useTranslation";

function docsItems(isRu: boolean) {
  return [
    {
      icon: BookOpen,
      title: isRu ? "Быстрый старт" : "Tezkor boshlash",
      desc: isRu
        ? "Как создать резюме и откликнуться на вакансии."
        : "Rezyume yaratish va vakansiyaga ariza yuborish bo'yicha qisqa yo'riqnoma.",
      href: "/student/resumes",
      label: isRu ? "Открыть" : "Ochish",
    },
    {
      icon: FileText,
      title: isRu ? "Правила платформы" : "Platforma qoidalari",
      desc: isRu
        ? "Узнайте требования к профилю и вакансиям."
        : "Profil va ariza yuborish bo'yicha talablarni ko'ring.",
      href: "/terms",
      label: isRu ? "Читать" : "O'qish",
    },
    {
      icon: Shield,
      title: isRu ? "Конфиденциальность" : "Maxfiylik siyosati",
      desc: isRu
        ? "Как мы защищаем и обрабатываем ваши данные."
        : "Ma'lumotlaringiz qanday himoyalanishini ko'ring.",
      href: "/privacy",
      label: isRu ? "Посмотреть" : "Ko'rish",
    },
    {
      icon: MessageCircle,
      title: isRu ? "Поддержка в Telegram" : "Telegram orqali yordam",
      desc: isRu
        ? "Напишите нам, если возникли проблемы с аккаунтом или откликом."
        : "Akkount yoki ariza bilan muammo bo'lsa, bizga yozing.",
      href: "https://t.me/ishtop_support",
      label: isRu ? "Написать" : "Yozish",
      external: true,
    },
  ];
}

export default function StudentHelpPage() {
  const { locale } = useTranslation();
  const isRu = locale === "ru";
  const items = docsItems(isRu);

  return (
    <div className="space-y-6 p-4 lg:p-8">
      <div className="rounded-2xl border border-surface-200 bg-white p-6 shadow-sm dark:border-surface-700 dark:bg-surface-900">
        <h1 className="text-2xl font-bold text-surface-900 dark:text-white">
          {isRu ? "Центр помощи студента" : "Talabalar uchun yordam markazi"}
        </h1>
        <p className="mt-2 text-sm text-surface-600 dark:text-surface-400">
          {isRu
            ? "Здесь вы найдете инструкции, документы и каналы связи с поддержкой."
            : "Bu yerda yo'riqnomalar, hujjatlar va qo'llab-quvvatlash kanallarini topasiz."}
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        {items.map((item) => {
          const Icon = item.icon;
          const content = (
            <Card className="h-full rounded-2xl border-surface-200 transition-all hover:-translate-y-0.5 hover:shadow-md dark:border-surface-700">
              <CardHeader>
                <div className="mb-2 flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300">
                  <Icon className="h-5 w-5" />
                </div>
                <CardTitle>{item.title}</CardTitle>
                <CardDescription>{item.desc}</CardDescription>
              </CardHeader>
              <CardContent>
                <Button className="w-full justify-between bg-gradient-to-r from-emerald-500 to-teal-600">
                  {item.label}
                  <ArrowRight className="h-4 w-4" />
                </Button>
              </CardContent>
            </Card>
          );

          if (item.external) {
            return (
              <a key={item.title} href={item.href} target="_blank" rel="noreferrer">
                {content}
              </a>
            );
          }

          return (
            <Link key={item.title} href={item.href}>
              {content}
            </Link>
          );
        })}
      </div>

      <div className="rounded-2xl border border-surface-200 bg-white p-6 dark:border-surface-700 dark:bg-surface-900">
        <h2 className="text-lg font-semibold text-surface-900 dark:text-white">
          {isRu ? "Не нашли ответ?" : "Javob topolmadingizmi?"}
        </h2>
        <p className="mt-2 text-sm text-surface-600 dark:text-surface-400">
          {isRu
            ? "Отправьте письмо в поддержку, мы ответим в течение рабочего дня."
            : "Support emailga yozing, odatda 1 ish kuni ichida javob beramiz."}
        </p>
        <a href="mailto:support@ishtop.uz" className="mt-4 inline-block">
          <Button variant="outline" className="gap-2">
            <Mail className="h-4 w-4" />
            support@ishtop.uz
          </Button>
        </a>
      </div>
    </div>
  );
}

