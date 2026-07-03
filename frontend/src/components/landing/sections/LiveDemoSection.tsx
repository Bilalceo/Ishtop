"use client";

/**
 * "How it works" video showcase — Silver rebrand.
 *
 * Replaced the 3-panel interactive playground with one clear product
 * walkthrough video (37s, recorded from the real app) + three plain steps.
 * First-time visitors understand the product in seconds; the full
 * interactive playground still lives at /demo.
 */

import { useRef, useState } from "react";
import Link from "next/link";
import { useReducedMotion } from "framer-motion";
import { ArrowRight, Play, Pause, Sparkles, UserRound, Wand2, Send } from "lucide-react";
import { useTranslation } from "@/hooks/useTranslation";
import { Reveal } from "./primitives";

type Locale = "uz" | "ru" | "en";

const COPY: Record<
  Locale,
  {
    eyebrow: string;
    title_a: string;
    title_b: string;
    sub: string;
    steps: { title: string; desc: string }[];
    primary: string;
    secondary: string;
    videoLabel: string;
  }
> = {
  uz: {
    eyebrow: "Qanday ishlaydi · 37 soniya",
    title_a: "Ko'ring: ",
    title_b: "kirishdan ishgacha.",
    sub: "Haqiqiy platformadan yozib olingan — hech qanday montaj yo'q. Ko'nikma qo'shasiz, AI mos ishlarni topadi, bir bosishda ariza yuborasiz.",
    steps: [
      { title: "Ko'nikma qo'shing", desc: "AI kasbingizga mos ko'nikmalarni o'zi tavsiya qiladi." },
      { title: "AI mos ishlarni topadi", desc: "Har bir ish uchun moslik foizi va sababi ko'rsatiladi." },
      { title: "Bir bosishda ariza", desc: "AI rezyume va arizani tayyorlab beradi — siz faqat yuborasiz." },
    ],
    primary: "Bepul boshlash",
    secondary: "O'zingiz sinab ko'ring",
    videoLabel: "IshTop qanday ishlashini ko'rsatuvchi video",
  },
  ru: {
    eyebrow: "Как это работает · 37 секунд",
    title_a: "Смотрите: ",
    title_b: "от входа до работы.",
    sub: "Записано в реальном продукте — без монтажа. Добавляете навыки, AI находит подходящие вакансии, отклик — в один клик.",
    steps: [
      { title: "Добавьте навыки", desc: "AI сам предложит навыки под вашу профессию." },
      { title: "AI найдёт вакансии", desc: "Для каждой — процент совпадения и объяснение почему." },
      { title: "Отклик в один клик", desc: "AI готовит резюме и отклик — вы просто отправляете." },
    ],
    primary: "Начать бесплатно",
    secondary: "Попробовать самому",
    videoLabel: "Видео о том, как работает IshTop",
  },
  en: {
    eyebrow: "How it works · 37 seconds",
    title_a: "Watch: ",
    title_b: "from sign-in to hired.",
    sub: "Recorded in the real product — no editing. Add skills, AI finds matching jobs, apply in one click.",
    steps: [
      { title: "Add your skills", desc: "AI suggests the right skills for your profession." },
      { title: "AI finds your matches", desc: "Every job shows a match % and the reason why." },
      { title: "Apply in one click", desc: "AI prepares the resume and application — you just send." },
    ],
    primary: "Get started free",
    secondary: "Try it yourself",
    videoLabel: "Video showing how IshTop works",
  },
};

const STEP_ICONS = [UserRound, Wand2, Send];
const STEP_TILES = [
  "bg-[#d7e7ff] text-[#3856a5]",
  "bg-[#e3ddff] text-[#5b4a9e]",
  "bg-[#d9f1e4] text-[#2f7a56]",
];

export function LiveDemoSection() {
  const { locale } = useTranslation();
  const reduce = useReducedMotion();
  const L = (["uz", "ru", "en"] as const).includes(locale as Locale)
    ? (locale as Locale)
    : "uz";
  const c = COPY[L];

  const videoRef = useRef<HTMLVideoElement>(null);
  // Autoplay (muted) unless the visitor prefers reduced motion.
  const [playing, setPlaying] = useState(!reduce);

  const togglePlay = () => {
    const v = videoRef.current;
    if (!v) return;
    if (v.paused) {
      void v.play();
      setPlaying(true);
    } else {
      v.pause();
      setPlaying(false);
    }
  };

  return (
    <section id="live-demo" className="silver-ground relative section-y" aria-labelledby="live-demo-heading">
      <div className="section-shell">
        {/* Header — one sentence, no jargon */}
        <Reveal className="mx-auto max-w-2xl text-center">
          <span className="chip-silver uppercase tracking-[0.18em] !text-[11px]">
            <Play className="h-3 w-3 text-[#8ab4ff]" aria-hidden />
            {c.eyebrow}
          </span>
          <h2 id="live-demo-heading" className="h-display mt-4 pb-1 text-3xl text-[#18181b] sm:text-5xl">
            {c.title_a}
            <span className="bg-gradient-to-r from-[#6f9bf0] to-[#a08de0] bg-clip-text text-transparent">
              {c.title_b}
            </span>
          </h2>
          <p className="mt-4 text-lg text-[#63636b]">{c.sub}</p>
        </Reveal>

        {/* Video in a browser frame */}
        <Reveal className="relative mx-auto mt-12 max-w-4xl" delay={0.1}>
          {/* pastel halo */}
          <div
            aria-hidden
            className="pointer-events-none absolute -inset-6 rounded-[36px] bg-gradient-to-r from-[#d7e7ff]/70 via-[#e3ddff]/60 to-[#ffe9d6]/60 blur-2xl"
          />
          <div className="card-silver relative overflow-hidden !rounded-[24px]">
            {/* browser chrome */}
            <div className="flex items-center gap-1.5 border-b border-[#ececea] bg-[#fafaf8] px-4 py-3">
              <span className="h-2.5 w-2.5 rounded-full bg-[#f4b8b0]" />
              <span className="h-2.5 w-2.5 rounded-full bg-[#f5d9a8]" />
              <span className="h-2.5 w-2.5 rounded-full bg-[#b8dfc5]" />
              <span className="ml-3 rounded-md bg-[#f1f1ef] px-3 py-1 text-[11px] text-[#8e8e96]">
                ishtop.uz
              </span>
            </div>

            <div className="group relative">
              {/* eslint-disable-next-line jsx-a11y/media-has-caption -- silent product screencast, no dialogue */}
              <video
                ref={videoRef}
                className="block w-full"
                src="/videos/ishtop-demo.mp4"
                poster="/videos/ishtop-demo-poster.jpg"
                autoPlay={!reduce}
                muted
                loop
                playsInline
                preload="metadata"
                aria-label={c.videoLabel}
                onClick={togglePlay}
              />
              {/* play / pause overlay */}
              <button
                type="button"
                onClick={togglePlay}
                aria-label={playing ? "Pause" : "Play"}
                className={`focus-ring absolute inset-0 m-auto grid h-16 w-16 place-items-center rounded-full bg-white/90 text-[#18181b] shadow-[0_12px_30px_-8px_rgba(24,24,27,0.35)] backdrop-blur transition-opacity duration-300 ${
                  playing ? "opacity-0 group-hover:opacity-100" : "opacity-100"
                }`}
              >
                {playing ? (
                  <Pause className="h-6 w-6" aria-hidden />
                ) : (
                  <Play className="ml-0.5 h-6 w-6" aria-hidden />
                )}
              </button>
            </div>
          </div>
        </Reveal>

        {/* Three plain steps — mirrors what the video shows */}
        <div className="mx-auto mt-12 grid max-w-4xl gap-4 sm:grid-cols-3">
          {c.steps.map((s, i) => {
            const Icon = STEP_ICONS[i];
            return (
              <Reveal key={s.title} delay={0.12 + i * 0.1}>
                <div className="card-silver h-full p-5">
                  <div className="flex items-center gap-3">
                    <span className={`grid h-10 w-10 shrink-0 place-items-center rounded-xl ${STEP_TILES[i]}`}>
                      <Icon className="h-[18px] w-[18px]" aria-hidden />
                    </span>
                    <p className="font-display text-sm font-semibold text-[#18181b]">
                      {i + 1}. {s.title}
                    </p>
                  </div>
                  <p className="mt-3 text-sm leading-relaxed text-[#63636b]">{s.desc}</p>
                </div>
              </Reveal>
            );
          })}
        </div>

        {/* One CTA row */}
        <Reveal className="mt-10 flex flex-col items-center justify-center gap-3 sm:flex-row" delay={0.2}>
          <Link href="/register" className="btn-silver-primary focus-ring group">
            {c.primary}
            <ArrowRight className="h-4 w-4 transition group-hover:translate-x-0.5" aria-hidden />
          </Link>
          <Link href="/demo" className="btn-silver-ghost focus-ring">
            <Sparkles className="h-4 w-4 text-[#b7a4ff]" aria-hidden />
            {c.secondary}
          </Link>
        </Reveal>
      </div>
    </section>
  );
}

export default LiveDemoSection;
