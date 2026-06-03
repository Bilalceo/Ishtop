"use client";

/**
 * IshTop — /demo · Live AI Match Playground
 *
 * Interactive product demo:
 *   1. User picks 3+ skill chips
 *   2. AI "thinking" trace types out, character by character
 *   3. Top 3 job matches animate in with explainable reasoning
 *   4. Reasoning bars fill from 0 to actual %
 *   5. Changing skills re-runs everything
 *
 * Entirely client-side — no backend needed. Real product feel, instant.
 */

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import {
  AnimatePresence,
  motion,
  useReducedMotion,
} from "framer-motion";
import {
  ArrowRight,
  Sparkles,
  CheckCircle2,
  ShieldCheck,
  RotateCcw,
  Wand2,
  ChevronRight,
  AlertCircle,
  Check,
  Share2,
} from "lucide-react";
import {
  SKILLS,
  generateThoughts,
  topMatches,
  type MatchResult,
  type Skill,
} from "./match-engine";
import {
  buildShareUrl,
  loadSkillsLocally,
  readSkillsFromUrl,
  saveSkillsLocally,
  syncUrlWithSkills,
} from "./url-state";

type Phase = "idle" | "thinking" | "results";

export default function DemoClient() {
  const reduce = useReducedMotion();

  const [selected, setSelected] = useState<string[]>([]);
  const [phase, setPhase] = useState<Phase>("idle");
  const [thoughts, setThoughts] = useState<string[]>([]);
  const [matches, setMatches] = useState<MatchResult[]>([]);

  // Mouse-tracked spotlight on hero
  const heroRef = useRef<HTMLDivElement>(null);

  // Hydrate from URL → localStorage → empty.
  // URL wins (shared links must show what was shared, not the visitor's history).
  useEffect(() => {
    const fromUrl = readSkillsFromUrl(window.location.search);
    if (fromUrl.length > 0) {
      setSelected(fromUrl);
      return;
    }
    const fromStorage = loadSkillsLocally();
    if (fromStorage.length > 0) {
      setSelected(fromStorage);
    }
  }, []);

  // Keep URL + localStorage synced with selected skills.
  useEffect(() => {
    syncUrlWithSkills(selected);
    saveSkillsLocally(selected);
  }, [selected]);

  // Group skills by category for the palette
  const grouped = useMemo(() => {
    const g = new Map<Skill["category"], Skill[]>();
    for (const s of SKILLS) {
      if (!g.has(s.category)) g.set(s.category, []);
      g.get(s.category)!.push(s);
    }
    return Array.from(g.entries());
  }, []);

  // Toggle skill, debounce-trigger the thinking flow
  const toggle = useCallback((id: string) => {
    setSelected((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  }, []);

  const reset = useCallback(() => {
    setSelected([]);
    setPhase("idle");
    setThoughts([]);
    setMatches([]);
  }, []);

  // Recompute on selection change
  useEffect(() => {
    if (selected.length === 0) {
      setPhase("idle");
      setThoughts([]);
      setMatches([]);
      return;
    }

    // Show thinking immediately
    setPhase("thinking");
    setThoughts([]);
    const lines = generateThoughts(selected);
    const results = topMatches(selected, 3);

    if (reduce) {
      // Instant for reduce-motion users
      setThoughts(lines);
      setMatches(results);
      setPhase("results");
      return;
    }

    // Stream lines one by one. Track every timeout id so cleanup can fully cancel
    // the in-flight chain — otherwise a stale closure could push undefined entries
    // after the effect has been re-fired.
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
      nextTimer = window.setTimeout(showLine, 240 + Math.random() * 120);
    };
    nextTimer = window.setTimeout(showLine, 220);

    return () => {
      cancelled = true;
      if (nextTimer !== null) window.clearTimeout(nextTimer);
    };
  }, [selected, reduce]);

  // Mouse spotlight
  useEffect(() => {
    const el = heroRef.current;
    if (!el || reduce) return;
    const onMove = (e: PointerEvent) => {
      const r = el.getBoundingClientRect();
      const x = ((e.clientX - r.left) / r.width) * 100;
      const y = ((e.clientY - r.top) / r.height) * 100;
      el.style.setProperty("--mx", `${x}%`);
      el.style.setProperty("--my", `${y}%`);
    };
    window.addEventListener("pointermove", onMove);
    return () => window.removeEventListener("pointermove", onMove);
  }, [reduce]);

  return (
    <main className="aurora-bg grain relative min-h-screen overflow-hidden text-white">
      {/* ===== Nav ===== */}
      <nav aria-label="Primary" className="relative z-30">
        <div className="section-shell flex h-16 items-center justify-between sm:h-20">
          <Link
            href="/"
            className="focus-ring flex items-center gap-2 rounded-full"
            aria-label="IshTop home"
          >
            <span
              aria-hidden
              className="grid h-9 w-9 place-items-center rounded-2xl bg-gradient-to-br from-violet-500 via-indigo-500 to-cyan-400 shadow-lg shadow-violet-500/30"
            >
              <Sparkles className="h-4 w-4 text-white" />
            </span>
            <span className="font-display text-lg font-semibold tracking-tight">IshTop</span>
            <span className="chip ml-2 !border-white/10 !bg-white/[0.04] !text-white/75 !text-[10px]">
              · LIVE DEMO
            </span>
          </Link>
          <div className="flex items-center gap-3">
            {selected.length > 0 && (
              <button
                type="button"
                onClick={reset}
                className="focus-ring inline-flex items-center gap-1.5 rounded-full border border-white/10 bg-white/[0.04] px-3 py-1.5 text-xs font-medium text-white/80 hover:bg-white/[0.08]"
              >
                <RotateCcw className="h-3 w-3" aria-hidden />
                Tozalash
              </button>
            )}
            <Link href="/register" className="btn-aurora focus-ring">
              Boshlash <ArrowRight className="h-3.5 w-3.5" aria-hidden />
            </Link>
          </div>
        </div>
      </nav>

      {/* ===== Hero header ===== */}
      <header
        ref={heroRef}
        className="spotlight relative z-10 pb-10 pt-6 sm:pt-10"
      >
        <div className="section-shell">
          <span className="h-eyebrow !border-white/10 !bg-white/[0.06] !text-white/80">
            <Wand2 className="h-3 w-3 text-amber-300" aria-hidden />
            AI playground · jonli
          </span>
          <h1 className="h-display mt-6 pb-1 text-4xl leading-tight text-white sm:text-5xl lg:text-[56px]">
            Tinglab ko&apos;ring. <span className="aurora-text">5 soniyada.</span>
          </h1>
          <p className="mt-4 max-w-2xl text-pretty text-white/70 sm:text-lg">
            Ko&apos;nikmalaringizni tanlang — AI o&apos;ylab, izohlab, eng mos 3 ta vakansiyani topadi.
            Hech qanday ro&apos;yxatdan o&apos;tish kerak emas. Bu — mahsulot ichida ko&apos;rasiz.
          </p>
        </div>
      </header>

      {/* ===== Playground ===== */}
      <section className="relative z-10 pb-24" aria-label="Live demo playground">
        <div className="section-shell grid gap-8 lg:grid-cols-[1fr_1.1fr]">
          {/* ─── Left: skill palette + thinking ─── */}
          <div className="space-y-6">
            {/* Skill palette */}
            <div className="rounded-3xl border border-white/10 bg-white/[0.04] p-5 backdrop-blur-md sm:p-6">
              <div className="flex items-center justify-between">
                <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-white/55">
                  1 · Ko&apos;nikmalaringizni tanlang
                </p>
                <span className="text-xs font-medium text-violet-300">
                  {selected.length} tanlangan
                </span>
              </div>

              <div className="mt-5 space-y-4">
                {grouped.map(([cat, list]) => (
                  <div key={cat}>
                    <p className="mb-2 text-[10px] font-semibold uppercase tracking-[0.18em] text-white/40">
                      {catLabel(cat)}
                    </p>
                    <div className="flex flex-wrap gap-1.5">
                      {list.map((s) => {
                        const isOn = selected.includes(s.id);
                        return (
                          <button
                            key={s.id}
                            type="button"
                            onClick={() => toggle(s.id)}
                            aria-pressed={isOn}
                            className={`focus-ring rounded-full border px-3 py-1.5 text-xs font-medium transition-all ${
                              isOn
                                ? "border-transparent bg-gradient-to-r from-violet-500 to-cyan-400 text-white shadow-lg shadow-violet-500/30"
                                : "border-white/10 bg-white/[0.04] text-white/75 hover:border-white/25 hover:bg-white/[0.08]"
                            }`}
                          >
                            {isOn && (
                              <CheckCircle2 className="-ml-0.5 mr-1 inline h-3 w-3" aria-hidden />
                            )}
                            {s.label}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>

              {selected.length === 0 && (
                <p className="mt-5 flex items-center gap-2 rounded-2xl bg-violet-500/10 px-3 py-2.5 text-xs text-violet-200">
                  <AlertCircle className="h-3.5 w-3.5 shrink-0" aria-hidden />
                  Boshlash uchun kamida 1 ta ko&apos;nikmani bosing.
                </p>
              )}
            </div>

            {/* Thinking trace */}
            <div className="rounded-3xl border border-white/10 bg-black/40 p-5 font-mono text-sm shadow-2xl shadow-violet-500/10 backdrop-blur-md sm:p-6">
              <div className="mb-3 flex items-center justify-between">
                <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-white/55">
                  2 · AI Reasoning
                </p>
                {phase === "thinking" && (
                  <span className="flex items-center gap-1 text-xs text-violet-300">
                    <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-violet-300 shadow-[0_0_8px_rgba(124,92,255,0.9)]" />
                    thinking…
                  </span>
                )}
                {phase === "results" && (
                  <span className="flex items-center gap-1 text-xs text-emerald-300">
                    <CheckCircle2 className="h-3 w-3" aria-hidden /> done
                  </span>
                )}
              </div>

              <div className="min-h-[160px] space-y-1.5 text-white/85">
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
                    {"// AI tushuntirishi shu yerda chiqadi."}
                  </p>
                )}
              </div>
            </div>
          </div>

          {/* ─── Right: live matches ─── */}
          <div>
            <div className="mb-4 flex items-center justify-between">
              <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-white/55">
                3 · Sizning eng mos vakansiyalaringiz
              </p>
              <span className="text-xs text-white/55">{matches.length} ta natija</span>
            </div>

            {phase !== "results" || matches.length === 0 ? (
              <EmptyMatches phase={phase} selected={selected.length} />
            ) : (
              <ul className="space-y-4">
                <AnimatePresence>
                  {matches.map((m, i) => (
                    <MatchCard key={m.job.id} m={m} index={i} reduce={!!reduce} />
                  ))}
                </AnimatePresence>
              </ul>
            )}

            {phase === "results" && (
              <motion.div
                initial={reduce ? false : { opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.5, duration: 0.5 }}
                className="mt-6 rounded-3xl border border-white/10 bg-gradient-to-br from-violet-500/10 to-cyan-400/10 p-5 backdrop-blur-md"
              >
                <p className="text-sm text-white/85">
                  Bu faqat demo. Haqiqiy IshTop&apos;da: 500+ verified kompaniya, Auto-Apply,
                  Resume AI va Interview Coach.
                </p>
                <div className="mt-4 flex flex-wrap gap-3">
                  <Link
                    href="/register"
                    className="btn-aurora focus-ring"
                  >
                    Bepul ro&apos;yxatdan o&apos;tish
                    <ArrowRight className="h-3.5 w-3.5" aria-hidden />
                  </Link>
                  <ShareButton selected={selected} />
                </div>
              </motion.div>
            )}
          </div>
        </div>
      </section>
    </main>
  );
}

/* ----------------------------------------------------------- MatchCard */

function MatchCard({
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
      initial={reduce ? false : { opacity: 0, y: 20, rotateX: 12 }}
      animate={{ opacity: 1, y: 0, rotateX: 0 }}
      exit={{ opacity: 0, y: -10 }}
      transition={{ duration: 0.55, ease: [0.19, 1, 0.22, 1], delay: index * 0.12 }}
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
          <ScoreNumber score={m.score} reduce={reduce} />
          <p className="mt-0.5 text-[10px] font-semibold uppercase tracking-wider opacity-80">
            match
          </p>
        </div>
      </div>

      {/* Reasoning bar */}
      <div className="mt-4">
        <div className="h-1.5 w-full overflow-hidden rounded-full bg-white/[0.06]">
          <motion.div
            initial={reduce ? false : { width: 0 }}
            animate={{ width: `${m.score}%` }}
            transition={{ duration: 1.1, ease: [0.19, 1, 0.22, 1], delay: 0.2 + index * 0.12 }}
            className="h-full rounded-full bg-gradient-to-r from-violet-500 via-cyan-400 to-emerald-400"
          />
        </div>
      </div>

      <button
        type="button"
        onClick={() => setExpanded((v) => !v)}
        aria-expanded={expanded}
        className="focus-ring mt-3 inline-flex items-center gap-1 rounded-full text-xs font-semibold text-violet-300 hover:text-violet-200"
      >
        Nega? <ChevronRight className={`h-3 w-3 transition-transform ${expanded ? "rotate-90" : ""}`} aria-hidden />
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
                const Icon =
                  r.type === "match"
                    ? CheckCircle2
                    : r.type === "trust"
                    ? ShieldCheck
                    : AlertCircle;
                const color =
                  r.type === "match"
                    ? "text-emerald-300"
                    : r.type === "trust"
                    ? "text-cyan-300"
                    : "text-amber-300";
                return (
                  <li key={i} className="flex items-start gap-2">
                    <Icon className={`mt-0.5 h-4 w-4 shrink-0 ${color}`} aria-hidden />
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

/* ------------------------------------------------------- Score counter */

function ScoreNumber({ score, reduce }: { score: number; reduce: boolean }) {
  const [v, setV] = useState(reduce ? score : 0);

  useEffect(() => {
    if (reduce) {
      setV(score);
      return;
    }
    let raf = 0;
    const start = performance.now();
    const duration = 900;
    const tick = (now: number) => {
      const t = Math.min(1, (now - start) / duration);
      // out-expo
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

/* --------------------------------------------------------- Empty state */

function EmptyMatches({ phase, selected }: { phase: Phase; selected: number }) {
  return (
    <div className="grid place-items-center rounded-3xl border border-dashed border-white/10 bg-white/[0.02] p-10 text-center backdrop-blur-md">
      {phase === "idle" || selected === 0 ? (
        <>
          <span
            aria-hidden
            className="grid h-14 w-14 place-items-center rounded-2xl bg-gradient-to-br from-violet-500/20 to-cyan-400/20"
          >
            <Wand2 className="h-6 w-6 text-violet-300" aria-hidden />
          </span>
          <p className="mt-4 text-sm font-medium text-white/80">
            Boshlash uchun chap tomondan ko&apos;nikma tanlang
          </p>
          <p className="mt-1 text-xs text-white/55">3-5 ta ko&apos;nikma — eng yaxshi natija</p>
        </>
      ) : (
        <>
          <div className="flex gap-1" aria-label="Loading">
            {[0, 1, 2].map((i) => (
              <span
                key={i}
                className="h-2 w-2 animate-pulse rounded-full bg-violet-400"
                style={{ animationDelay: `${i * 150}ms` }}
              />
            ))}
          </div>
          <p className="mt-4 text-sm text-white/70">AI vakansiyalarni qidirmoqda…</p>
        </>
      )}
    </div>
  );
}

/* ----------------------------------------------------- ShareButton */

function ShareButton({ selected }: { selected: string[] }) {
  const [copied, setCopied] = useState(false);

  const onShare = async () => {
    const url = buildShareUrl(selected);
    const title = "IshTop · Mening AI match natijam";
    const text = "Mening ko'nikmalarim bo'yicha AI top 3 vakansiyani topdi. Sinab ko'r:";

    // Prefer native Web Share API (iOS, Android, modern Chrome)
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
      // clipboard blocked — fallback prompt
      window.prompt("Link nusxalang:", url);
    }
  };

  return (
    <button
      type="button"
      onClick={onShare}
      aria-label={copied ? "Link nusxalandi" : "Natijani share qilish"}
      className="focus-ring inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/[0.04] px-5 py-2.5 text-sm font-semibold text-white/85 backdrop-blur-md transition hover:border-white/30 hover:bg-white/[0.08]"
    >
      {copied ? (
        <>
          <Check className="h-3.5 w-3.5 text-emerald-300" aria-hidden />
          Link nusxalandi
        </>
      ) : (
        <>
          <Share2 className="h-3.5 w-3.5" aria-hidden />
          Natijani share qilish
        </>
      )}
    </button>
  );
}

/* --------------------------------------------------------- Helpers */

function catLabel(c: Skill["category"]) {
  return (
    {
      frontend: "Frontend",
      backend: "Backend",
      design: "Design",
      data: "Data",
      devops: "DevOps",
      mobile: "Mobile",
    } as const
  )[c];
}
