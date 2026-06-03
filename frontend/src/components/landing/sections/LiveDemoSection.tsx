"use client";

/**
 * Embedded live AI demo for the main landing page.
 *
 * Compact, focused version of /demo:
 *   - 8 popular skills only (vs 22 on the full demo)
 *   - Inline thinking trace
 *   - 2 match cards (vs 3)
 *   - Visitor sees product working before scrolling further
 *
 * Reuses the same match-engine module for consistency.
 */

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import {
  AnimatePresence,
  motion,
  useReducedMotion,
} from "framer-motion";
import {
  ArrowRight,
  CheckCircle2,
  ShieldCheck,
  Wand2,
  ChevronRight,
  RotateCcw,
  Sparkles,
  Share2,
  Check,
} from "lucide-react";
import {
  generateThoughts,
  topMatches,
  type MatchResult,
} from "@/components/demo/match-engine";
import { buildShareUrl } from "@/components/demo/url-state";

// Curated short list — frontend-heavy because that's our largest audience.
const QUICK_SKILLS: { id: string; label: string }[] = [
  { id: "react", label: "React" },
  { id: "typescript", label: "TypeScript" },
  { id: "tailwind", label: "Tailwind" },
  { id: "nextjs", label: "Next.js" },
  { id: "python", label: "Python" },
  { id: "sql", label: "SQL" },
  { id: "figma", label: "Figma" },
  { id: "node", label: "Node.js" },
];

type Phase = "idle" | "thinking" | "results";

export function LiveDemoSection() {
  const reduce = useReducedMotion();
  const [selected, setSelected] = useState<string[]>([]);
  const [phase, setPhase] = useState<Phase>("idle");
  const [thoughts, setThoughts] = useState<string[]>([]);
  const [matches, setMatches] = useState<MatchResult[]>([]);

  const toggle = useCallback((id: string) => {
    setSelected((p) => (p.includes(id) ? p.filter((x) => x !== id) : [...p, id]));
  }, []);

  const reset = useCallback(() => {
    setSelected([]);
    setPhase("idle");
    setThoughts([]);
    setMatches([]);
  }, []);

  useEffect(() => {
    if (selected.length === 0) {
      setPhase("idle");
      setThoughts([]);
      setMatches([]);
      return;
    }
    setPhase("thinking");
    setThoughts([]);
    const lines = generateThoughts(selected);
    const results = topMatches(selected, 2);

    if (reduce) {
      setThoughts(lines);
      setMatches(results);
      setPhase("results");
      return;
    }

    let lineIdx = 0;
    let cancelled = false;
    let nextTimer: number | null = null;
    const showLine = () => {
      if (cancelled) return;
      if (lineIdx >= lines.length) {
        setMatches(results);
        setPhase("results");
        return;
      }
      const line = lines[lineIdx];
      lineIdx += 1;
      if (line === undefined) return;
      setThoughts((prev) => [...prev, line]);
      nextTimer = window.setTimeout(showLine, 220 + Math.random() * 100);
    };
    nextTimer = window.setTimeout(showLine, 200);
    return () => {
      cancelled = true;
      if (nextTimer !== null) window.clearTimeout(nextTimer);
    };
  }, [selected, reduce]);

  return (
    <section
      id="live-demo"
      className="aurora-bg grain relative section-y"
      aria-labelledby="live-demo-heading"
    >
      <div className="section-shell">
        {/* Header */}
        <div className="mx-auto max-w-2xl text-center">
          <span className="h-eyebrow !border-white/10 !bg-white/[0.06] !text-white/80">
            <Wand2 className="h-3 w-3 text-amber-300" aria-hidden />
            Tinglab ko&apos;ring · jonli
          </span>
          <h2
            id="live-demo-heading"
            className="h-display mt-4 pb-1 text-3xl text-white sm:text-5xl"
          >
            Bizning AI &mdash; <span className="aurora-text">shu yerda</span>, hozir.
          </h2>
          <p className="mt-4 text-lg text-white/70">
            Quyidan ko&apos;nikma tanlang. Ro&apos;yxatdan o&apos;tmasdan,{" "}
            <strong className="text-white">5 soniyada</strong> AI o&apos;ylaganini va explainable
            match natijasini ko&apos;rasiz.
          </p>
        </div>

        {/* Playground */}
        <div className="mt-12 grid items-stretch gap-6 lg:grid-cols-[1fr_1.05fr]">
          {/* Left — skill chips + thinking */}
          <div className="space-y-5">
            {/* Skill chips */}
            <div className="rounded-3xl border border-white/10 bg-white/[0.04] p-5 backdrop-blur-md sm:p-6">
              <div className="flex items-center justify-between">
                <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-white/55">
                  1 · Ko&apos;nikmangizni tanlang
                </p>
                {selected.length > 0 && (
                  <button
                    type="button"
                    onClick={reset}
                    className="focus-ring inline-flex items-center gap-1 rounded-full text-xs text-white/55 hover:text-white"
                  >
                    <RotateCcw className="h-3 w-3" aria-hidden /> Tozalash
                  </button>
                )}
              </div>

              <div className="mt-4 flex flex-wrap gap-2">
                {QUICK_SKILLS.map((s) => {
                  const isOn = selected.includes(s.id);
                  return (
                    <button
                      key={s.id}
                      type="button"
                      onClick={() => toggle(s.id)}
                      aria-pressed={isOn}
                      className={`focus-ring rounded-full border px-3.5 py-2 text-sm font-medium transition-all ${
                        isOn
                          ? "border-transparent bg-gradient-to-r from-violet-500 to-cyan-400 text-white shadow-lg shadow-violet-500/30"
                          : "border-white/10 bg-white/[0.04] text-white/80 hover:border-white/25 hover:bg-white/[0.08]"
                      }`}
                    >
                      {isOn && (
                        <CheckCircle2 className="-ml-0.5 mr-1 inline h-3.5 w-3.5" aria-hidden />
                      )}
                      {s.label}
                    </button>
                  );
                })}
              </div>

              {selected.length === 0 && (
                <p className="mt-4 text-xs text-white/55">
                  💡 3 ta ko&apos;nikma tanlang — eng yaxshi natija
                </p>
              )}
            </div>

            {/* Thinking trace */}
            <div className="rounded-3xl border border-white/10 bg-black/40 p-5 font-mono text-sm shadow-2xl shadow-violet-500/10 backdrop-blur-md sm:p-6">
              <div className="mb-3 flex items-center justify-between">
                <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-white/55">
                  2 · AI o&apos;ylab ko&apos;ryapti
                </p>
                {phase === "thinking" && (
                  <span className="flex items-center gap-1 text-xs text-violet-300">
                    <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-violet-300 shadow-[0_0_8px_rgba(124,92,255,0.9)]" />
                    thinking…
                  </span>
                )}
                {phase === "results" && (
                  <span className="flex items-center gap-1 text-xs text-emerald-300">
                    <CheckCircle2 className="h-3 w-3" aria-hidden /> tayyor
                  </span>
                )}
              </div>

              <div className="min-h-[140px] space-y-1.5 text-white/85">
                <AnimatePresence>
                  {thoughts.filter(Boolean).map((line, i, arr) => {
                    const isDone = line.startsWith("✓");
                    const isArrow = line.startsWith(">");
                    return (
                      <motion.p
                        key={`${i}-${line}`}
                        initial={reduce ? false : { opacity: 0, y: 4 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.25 }}
                        className={
                          isDone ? "text-emerald-300" : isArrow ? "text-white/75" : "text-white/85"
                        }
                      >
                        {line}
                        {phase === "thinking" && i === arr.length - 1 && !isDone && (
                          <span className="ml-1 inline-block h-3.5 w-1.5 translate-y-0.5 animate-pulse bg-violet-300" />
                        )}
                      </motion.p>
                    );
                  })}
                </AnimatePresence>
                {phase === "idle" && (
                  <p className="text-white/45">
                    {"// AI tushuntirishi shu yerda chiqadi"}
                  </p>
                )}
              </div>
            </div>
          </div>

          {/* Right — live matches */}
          <div className="flex flex-col">
            <p className="mb-4 text-[11px] font-semibold uppercase tracking-[0.18em] text-white/55">
              3 · Sizning eng mos vakansiyalaringiz
            </p>

            {phase !== "results" || matches.length === 0 ? (
              <EmptyState phase={phase} hasSelection={selected.length > 0} />
            ) : (
              <ul className="space-y-4">
                <AnimatePresence>
                  {matches.map((m, i) => (
                    <CompactMatchCard
                      key={m.job.id}
                      m={m}
                      index={i}
                      reduce={!!reduce}
                    />
                  ))}
                </AnimatePresence>
              </ul>
            )}

            {/* CTA to full demo + register */}
            <motion.div
              initial={reduce ? false : { opacity: 0, y: 12 }}
              animate={
                phase === "results"
                  ? { opacity: 1, y: 0 }
                  : { opacity: 0.65, y: 0 }
              }
              transition={{ delay: 0.4, duration: 0.5 }}
              className="mt-4 rounded-3xl border border-white/10 bg-gradient-to-br from-violet-500/10 via-transparent to-cyan-400/10 p-5 backdrop-blur-md"
            >
              <p className="text-sm text-white/80">
                Bu faqat ko&apos;rsatuv. Haqiqiy IshTop&apos;da:{" "}
                <strong className="text-white">500+ verified kompaniya</strong>, Auto-Apply,
                Resume AI va Interview Coach.
              </p>
              <div className="mt-4 flex flex-wrap gap-3">
                <Link href="/register" className="btn-aurora focus-ring">
                  Bepul boshlash
                  <ArrowRight className="h-3.5 w-3.5" aria-hidden />
                </Link>
                <Link href="/demo" className="btn-ghost-dark focus-ring">
                  <Sparkles className="h-3.5 w-3.5" aria-hidden />
                  To&apos;liq playground
                </Link>
                {selected.length > 0 && phase === "results" && (
                  <InlineShareButton selected={selected} />
                )}
              </div>
            </motion.div>
          </div>
        </div>
      </div>
    </section>
  );
}

/* ----------------------------------------------------- CompactMatchCard */

function CompactMatchCard({
  m,
  index,
  reduce,
}: {
  m: MatchResult;
  index: number;
  reduce: boolean;
}) {
  const [expanded, setExpanded] = useState(index === 0);
  const tone =
    m.score >= 80
      ? "bg-emerald-500/15 text-emerald-300"
      : m.score >= 60
      ? "bg-amber-500/15 text-amber-300"
      : "bg-white/10 text-white/70";

  return (
    <motion.li
      initial={reduce ? false : { opacity: 0, y: 18, rotateX: 10 }}
      animate={{ opacity: 1, y: 0, rotateX: 0 }}
      exit={{ opacity: 0, y: -8 }}
      transition={{ duration: 0.55, ease: [0.19, 1, 0.22, 1], delay: index * 0.14 }}
      className="rounded-3xl border border-white/10 bg-white/[0.04] p-5 backdrop-blur-md transition-all hover:border-white/20 hover:bg-white/[0.06] sm:p-6"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="font-display text-base font-semibold text-white sm:text-lg">
            {m.job.title}
          </p>
          <p className="mt-0.5 text-sm text-white/65">
            {m.job.company} · {m.job.location}
          </p>
          <div className="mt-2 flex flex-wrap items-center gap-2 text-xs">
            <span className="text-emerald-300">{m.job.salary}</span>
            <span className="inline-flex items-center gap-1 rounded-full bg-cyan-500/15 px-2 py-0.5 text-cyan-300">
              <ShieldCheck className="h-3 w-3" aria-hidden /> Trust {m.job.trustScore}
            </span>
          </div>
        </div>
        <div className={`shrink-0 rounded-xl px-3 py-2 text-center ${tone}`}>
          <CountUp score={m.score} reduce={reduce} />
          <p className="mt-0.5 text-[10px] font-semibold uppercase tracking-wider opacity-80">
            match
          </p>
        </div>
      </div>

      <div className="mt-4 h-1.5 w-full overflow-hidden rounded-full bg-white/[0.06]">
        <motion.div
          initial={reduce ? false : { width: 0 }}
          animate={{ width: `${m.score}%` }}
          transition={{ duration: 1.1, ease: [0.19, 1, 0.22, 1], delay: 0.2 + index * 0.12 }}
          className="h-full rounded-full bg-gradient-to-r from-violet-500 via-cyan-400 to-emerald-400"
        />
      </div>

      <button
        type="button"
        onClick={() => setExpanded((v) => !v)}
        aria-expanded={expanded}
        className="focus-ring mt-3 inline-flex items-center gap-1 rounded-full text-xs font-semibold text-violet-300 hover:text-violet-200"
      >
        Nega?
        <ChevronRight
          className={`h-3 w-3 transition-transform ${expanded ? "rotate-90" : ""}`}
          aria-hidden
        />
      </button>

      <AnimatePresence initial={false}>
        {expanded && (
          <motion.div
            initial={reduce ? false : { height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.4, ease: [0.19, 1, 0.22, 1] }}
            className="overflow-hidden"
          >
            <ul className="mt-4 space-y-2 rounded-2xl border border-white/[0.06] bg-white/[0.03] p-4 text-sm">
              {m.reasons.map((r, i) => {
                const color =
                  r.type === "match"
                    ? "text-emerald-300"
                    : r.type === "trust"
                    ? "text-cyan-300"
                    : "text-amber-300";
                return (
                  <li key={i} className="flex items-start gap-2">
                    <CheckCircle2 className={`mt-0.5 h-4 w-4 shrink-0 ${color}`} aria-hidden />
                    <span className="text-white/85">{r.text}</span>
                  </li>
                );
              })}
            </ul>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.li>
  );
}

/* ------------------------------------------------- Animated count-up */

function CountUp({ score, reduce }: { score: number; reduce: boolean }) {
  const [v, setV] = useState(reduce ? score : 0);
  const startTs = useRef<number | null>(null);

  useEffect(() => {
    if (reduce) {
      setV(score);
      return;
    }
    let raf = 0;
    startTs.current = null;
    const tick = (now: number) => {
      if (startTs.current === null) startTs.current = now;
      const t = Math.min(1, (now - startTs.current) / 900);
      const eased = 1 - Math.pow(1 - t, 4);
      setV(Math.round(score * eased));
      if (t < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [score, reduce]);

  return (
    <span className="text-xl font-bold leading-none">
      {v}
      <span className="text-xs">%</span>
    </span>
  );
}

/* ----------------------------------------------------- Empty state */

function EmptyState({
  phase,
  hasSelection,
}: {
  phase: Phase;
  hasSelection: boolean;
}) {
  return (
    <div className="flex flex-1 grid-cols-1 place-items-center rounded-3xl border border-dashed border-white/10 bg-white/[0.02] p-10 text-center backdrop-blur-md">
      {!hasSelection ? (
        <div>
          <span
            aria-hidden
            className="mx-auto grid h-14 w-14 place-items-center rounded-2xl bg-gradient-to-br from-violet-500/20 to-cyan-400/20"
          >
            <Wand2 className="h-6 w-6 text-violet-300" aria-hidden />
          </span>
          <p className="mt-4 text-sm font-medium text-white/80">
            Chap tomondan ko&apos;nikma tanlang
          </p>
          <p className="mt-1 text-xs text-white/55">3 ta — eng yaxshi natija</p>
        </div>
      ) : phase === "thinking" ? (
        <div>
          <div className="flex justify-center gap-1" aria-label="Loading">
            {[0, 1, 2].map((i) => (
              <span
                key={i}
                className="h-2 w-2 animate-pulse rounded-full bg-violet-400"
                style={{ animationDelay: `${i * 150}ms` }}
              />
            ))}
          </div>
          <p className="mt-4 text-sm text-white/70">AI vakansiyalarni qidirmoqda…</p>
        </div>
      ) : null}
    </div>
  );
}

/* ----------------------------------------------------- InlineShareButton */

function InlineShareButton({ selected }: { selected: string[] }) {
  const [copied, setCopied] = useState(false);

  const onShare = async () => {
    const url = buildShareUrl(selected);
    const title = "IshTop · Mening AI match natijam";
    const text =
      "Mening ko'nikmalarim bo'yicha AI top vakansiyalarni topdi. Sinab ko'r:";
    const nav = navigator as Navigator & { share?: (data: ShareData) => Promise<void> };
    if (typeof nav.share === "function") {
      try {
        await nav.share({ title, text, url });
        return;
      } catch {
        // user cancelled — fall through to clipboard
      }
    }
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1800);
    } catch {
      window.prompt("Link nusxalang:", url);
    }
  };

  return (
    <button
      type="button"
      onClick={onShare}
      aria-label={copied ? "Link nusxalandi" : "Natijani share qilish"}
      className="focus-ring inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/[0.04] px-5 py-3 text-sm font-semibold text-white/85 backdrop-blur-md transition hover:border-white/30 hover:bg-white/[0.08]"
    >
      {copied ? (
        <>
          <Check className="h-3.5 w-3.5 text-emerald-300" aria-hidden />
          Link nusxalandi
        </>
      ) : (
        <>
          <Share2 className="h-3.5 w-3.5" aria-hidden />
          Share natijani
        </>
      )}
    </button>
  );
}

export default LiveDemoSection;
