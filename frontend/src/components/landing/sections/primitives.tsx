"use client";

/**
 * 3D motion primitives — Tilt, ScrollReveal3D, ParallaxLayer, Spotlight
 * Built on framer-motion. No new deps.
 */

import {
  motion,
  useMotionValue,
  useScroll,
  useSpring,
  useTransform,
  useReducedMotion,
} from "framer-motion";
import {
  useEffect,
  useRef,
  type CSSProperties,
  type PointerEvent as ReactPointerEvent,
  type ReactNode,
} from "react";

/* ----------------------------------------------------------------- Tilt 3D */

export function Tilt({
  children,
  className,
  max = 10,
  glare = true,
  style,
}: {
  children: ReactNode;
  className?: string;
  max?: number;
  glare?: boolean;
  style?: CSSProperties;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const reduce = useReducedMotion();

  const rx = useSpring(0, { stiffness: 220, damping: 22 });
  const ry = useSpring(0, { stiffness: 220, damping: 22 });
  const mx = useMotionValue(50);
  const my = useMotionValue(50);
  const glareBg = useTransform([mx, my], (latest: number[]) => {
    const [x, y] = latest;
    return `radial-gradient(400px circle at ${x}% ${y}%, rgba(255,255,255,0.18), transparent 45%)`;
  });

  const onMove = (e: ReactPointerEvent<HTMLDivElement>) => {
    if (reduce || !ref.current) return;
    const r = ref.current.getBoundingClientRect();
    const px = (e.clientX - r.left) / r.width;
    const py = (e.clientY - r.top) / r.height;
    ry.set((px - 0.5) * max * 2);
    rx.set(-(py - 0.5) * max * 2);
    mx.set(px * 100);
    my.set(py * 100);
  };

  const onLeave = () => {
    rx.set(0);
    ry.set(0);
    mx.set(50);
    my.set(50);
  };

  return (
    <div
      ref={ref}
      onPointerMove={onMove}
      onPointerLeave={onLeave}
      className={`perspective-1200 ${className ?? ""}`}
      style={style}
    >
      <motion.div
        style={{ rotateX: rx, rotateY: ry, transformStyle: "preserve-3d" }}
        className="will-transform relative h-full w-full"
      >
        {children}
        {glare && (
          <motion.span
            aria-hidden
            className="pointer-events-none absolute inset-0 rounded-[inherit]"
            style={{ background: glareBg, mixBlendMode: "overlay" }}
          />
        )}
      </motion.div>
    </div>
  );
}

/* ------------------------------------------------------- ScrollReveal3D */

export function ScrollReveal3D({
  children,
  className,
  delay = 0,
  amount = 0.4,
  fullHeight = false,
}: {
  children: ReactNode;
  className?: string;
  delay?: number;
  amount?: number;
  fullHeight?: boolean;
}) {
  const reduce = useReducedMotion();
  return (
    <motion.div
      initial={reduce ? false : { opacity: 0, y: 48, rotateX: 18, z: -80 }}
      whileInView={{ opacity: 1, y: 0, rotateX: 0, z: 0 }}
      viewport={{ once: true, amount }}
      transition={{ duration: 0.9, ease: [0.19, 1, 0.22, 1], delay }}
      style={{ transformStyle: "preserve-3d" }}
      className={`${fullHeight ? "h-full" : ""} ${className ?? ""}`}
    >
      {children}
    </motion.div>
  );
}

/* ----------------------------------------------------- ParallaxLayer */

export function ParallaxLayer({
  children,
  className,
  speed = -60,
  style,
}: {
  children: ReactNode;
  className?: string;
  speed?: number;
  style?: CSSProperties;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const reduce = useReducedMotion();
  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ["start end", "end start"],
  });
  const y = useTransform(scrollYProgress, [0, 1], reduce ? [0, 0] : [0, speed]);
  const ySpring = useSpring(y, { stiffness: 80, damping: 22, mass: 0.3 });

  return (
    <motion.div
      ref={ref}
      style={{ y: ySpring, position: "relative", ...style }}
      className={className}
    >
      {children}
    </motion.div>
  );
}

/* ------------------------------------------------------------ Spotlight */

export function Spotlight({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const reduce = useReducedMotion();

  useEffect(() => {
    if (reduce) return;
    const el = ref.current;
    if (!el) return;
    const onMove = (e: PointerEvent) => {
      const r = el.getBoundingClientRect();
      const x = ((e.clientX - r.left) / r.width) * 100;
      const y = ((e.clientY - r.top) / r.height) * 100;
      el.style.setProperty("--mx", `${x}%`);
      el.style.setProperty("--my", `${y}%`);
    };
    el.addEventListener("pointermove", onMove);
    return () => el.removeEventListener("pointermove", onMove);
  }, [reduce]);

  return (
    <div ref={ref} className={`spotlight ${className ?? ""}`}>
      {children}
    </div>
  );
}

/* ---------------------------------------------- ScrollProgressBar */

export function ScrollProgressBar() {
  const { scrollYProgress } = useScroll();
  const scaleX = useSpring(scrollYProgress, { stiffness: 120, damping: 20, mass: 0.2 });
  return (
    <motion.div
      aria-hidden
      style={{ scaleX, transformOrigin: "0% 50%" }}
      className="pointer-events-none fixed inset-x-0 top-0 z-[60] h-[2px] bg-gradient-to-r from-violet-500 via-cyan-400 to-amber-400"
    />
  );
}
