"use client";

/**
 * The employer's mark: their own logo when we have one, otherwise a monogram
 * generated from their name (see `lib/companyBrand.ts`).
 *
 * Not an <img> with a generated file behind it — the mark is drawn from two
 * values, so there is nothing to upload, cache or invalidate, and it renders
 * identically on the server and the client.
 */

import { useState } from "react";
import { companyBrand } from "@/lib/companyBrand";
import { cn } from "@/lib/utils";

const SIZES = {
  sm: { box: "h-11 w-11 rounded-xl", text: "text-sm" },
  md: { box: "h-14 w-14 rounded-2xl", text: "text-lg" },
  lg: { box: "h-20 w-20 rounded-2xl", text: "text-2xl" },
} as const;

export function CompanyLogo({
  name,
  logoUrl,
  size = "sm",
  className,
}: {
  /** The employer's name; pass the job title when the employer is unknown. */
  name: string | null | undefined;
  logoUrl?: string | null;
  size?: keyof typeof SIZES;
  className?: string;
}) {
  // A logo URL on file can still 404 or be hotlink-blocked, and a broken image
  // icon is worse than a monogram — so a failed load falls back rather than
  // leaving a hole in the row.
  const [broken, setBroken] = useState(false);
  const brand = companyBrand(name);
  const s = SIZES[size];
  const label = (name || "").trim();

  if (logoUrl && !broken) {
    return (
      <div
        className={cn(
          "flex shrink-0 items-center justify-center overflow-hidden border border-surface-200 bg-white dark:border-surface-700 dark:bg-white",
          s.box,
          className,
        )}
      >
        {/* object-contain with a white ground: most real logos are transparent
            PNGs drawn in a dark colour, which vanish on a dark surface. */}
        <img
          src={logoUrl}
          alt={label}
          loading="lazy"
          onError={() => setBroken(true)}
          className="h-full w-full object-contain p-1"
        />
      </div>
    );
  }

  return (
    <div
      aria-label={label || undefined}
      role={label ? "img" : undefined}
      className={cn(
        "flex shrink-0 select-none items-center justify-center font-bold tracking-tight text-white shadow-sm",
        s.box,
        s.text,
        className,
      )}
      style={{
        backgroundImage: `linear-gradient(135deg, ${brand.from} 0%, ${brand.to} 100%)`,
      }}
    >
      {brand.initials}
    </div>
  );
}
