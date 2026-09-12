"use client";

/**
 * The generated cover for a job page.
 *
 * Drawn, not photographed. We hold no image for any aggregated employer, and a
 * stock photo of an office above a cleaning job in Samarqand tells the reader
 * something untrue — so the banner is built from what we do know: the
 * employer's own generated colour (so the banner and the logo below it are one
 * mark) and a motif chosen by the listing's field of work.
 *
 * A per-listing hash rotates and offsets the motif, so two sales jobs in the
 * same colour family still do not look like the same picture.
 *
 * The title does NOT sit on this — it stays on the card's own surface below, so
 * there is no text-over-gradient contrast to get wrong in either theme.
 */

import { useId } from "react";
import { companyBrand } from "@/lib/companyBrand";
import { cn } from "@/lib/utils";

/** Which motif suits which field of work. */
const MOTIF_BY_CATEGORY: Record<string, Motif> = {
  it: "grid",
  finance: "bars",
  call: "rings",
  marketing: "blobs",
  education: "chevrons",
  medicine: "cross",
  food: "arcs",
  logistics: "chevrons",
  engineering: "hex",
  construction: "triangles",
  sales: "arcs",
  other: "grid",
};

type Motif =
  | "grid"
  | "bars"
  | "rings"
  | "blobs"
  | "chevrons"
  | "cross"
  | "arcs"
  | "hex"
  | "triangles";

/** One tile of each motif, drawn in currentColor at the caller's opacity. */
function MotifTile({ motif }: { motif: Motif }) {
  switch (motif) {
    case "grid":
      return (
        <>
          <circle cx="4" cy="4" r="1.6" />
          <circle cx="24" cy="24" r="1.6" />
        </>
      );
    case "bars":
      return (
        <>
          <rect x="3" y="16" width="4" height="12" rx="1.5" />
          <rect x="11" y="10" width="4" height="18" rx="1.5" />
          <rect x="19" y="4" width="4" height="24" rx="1.5" />
        </>
      );
    case "rings":
      return (
        <>
          <circle cx="14" cy="14" r="5" fill="none" strokeWidth="1.6" stroke="currentColor" />
          <circle cx="14" cy="14" r="11" fill="none" strokeWidth="1.2" stroke="currentColor" />
        </>
      );
    case "blobs":
      return (
        <>
          <ellipse cx="9" cy="10" rx="7" ry="5" />
          <ellipse cx="22" cy="22" rx="5" ry="7" />
        </>
      );
    case "chevrons":
      return (
        <path
          d="M2 20 L10 10 L18 20 M12 20 L20 10 L28 20"
          fill="none"
          strokeWidth="1.8"
          stroke="currentColor"
          strokeLinecap="round"
        />
      );
    case "cross":
      return (
        <>
          <rect x="11" y="4" width="6" height="20" rx="2" />
          <rect x="4" y="11" width="20" height="6" rx="2" />
        </>
      );
    case "arcs":
      return (
        <>
          <path d="M0 22 A14 14 0 0 1 28 22" fill="none" strokeWidth="1.8" stroke="currentColor" />
          <path d="M6 28 A8 8 0 0 1 22 28" fill="none" strokeWidth="1.4" stroke="currentColor" />
        </>
      );
    case "hex":
      return (
        <path
          d="M14 3 L23 8.5 L23 19.5 L14 25 L5 19.5 L5 8.5 Z"
          fill="none"
          strokeWidth="1.5"
          stroke="currentColor"
        />
      );
    case "triangles":
      return (
        <>
          <path d="M4 24 L12 8 L20 24 Z" />
          <path d="M18 24 L24 12 L30 24 Z" opacity="0.6" />
        </>
      );
  }
}

export function JobBanner({
  name,
  category,
  className,
}: {
  /** Employer name when known, job title otherwise — same input as the logo. */
  name: string | null | undefined;
  category: string | null | undefined;
  className?: string;
}) {
  const uid = useId().replace(/[^a-zA-Z0-9]/g, "");
  const brand = companyBrand(name);
  const motif = MOTIF_BY_CATEGORY[(category || "other").toLowerCase()] ?? "grid";

  // Per-listing variation: the motif rotates and shifts, and the highlight
  // moves across the banner, so the same colour pair reads differently.
  const angle = [0, 15, -15, 30, -30, 45][brand.motif];
  const shift = brand.motif * 5;
  const glowX = 62 + brand.motif * 6;

  return (
    <div
      className={cn("relative overflow-hidden", className)}
      style={{
        backgroundImage: `linear-gradient(115deg, ${brand.from} 0%, ${brand.to} 100%)`,
      }}
      aria-hidden="true"
    >
      <svg className="absolute inset-0 h-full w-full text-white" role="presentation">
        <defs>
          <pattern
            id={`motif-${uid}`}
            width="54"
            height="54"
            patternUnits="userSpaceOnUse"
            patternTransform={`rotate(${angle}) translate(${shift} ${shift})`}
          >
            <g fill="currentColor" opacity="0.11">
              <MotifTile motif={motif} />
            </g>
          </pattern>
          <radialGradient id={`glow-${uid}`} cx={`${glowX}%`} cy="8%" r="72%">
            <stop offset="0%" stopColor="#fff" stopOpacity="0.22" />
            <stop offset="100%" stopColor="#fff" stopOpacity="0" />
          </radialGradient>
        </defs>
        <rect width="100%" height="100%" fill={`url(#motif-${uid})`} />
        <rect width="100%" height="100%" fill={`url(#glow-${uid})`} />
      </svg>
      {/* Settles the banner into the card below instead of cutting hard. */}
      <div className="absolute inset-x-0 bottom-0 h-8 bg-gradient-to-t from-black/15 to-transparent" />
    </div>
  );
}
