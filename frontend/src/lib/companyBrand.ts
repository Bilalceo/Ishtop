/**
 * A stable visual identity for an employer that has no logo.
 *
 * Almost every listing here is aggregated from a Telegram post, so we hold no
 * logo file for the employer — but a category icon was worse than a letter:
 * 53 of 100 active listings classify as "Savdo", so half the list showed the
 * same shopping cart and nothing in it was distinguishable.
 *
 * So the mark is *derived from the employer's name*: initials plus a colour
 * picked by hashing that name. It is deterministic (the same company looks the
 * same on every page and every reload), costs no request, needs no storage, and
 * has a real value in both themes. Where an employer does have a logo on file,
 * that wins — see `CompanyLogo`.
 */

/** FNV-1a. Small, fast, and stable across runtimes — Math.random would make a
 *  company change colour on every render, and `charCodeAt` sums collide badly
 *  on names that are anagrams ("Nishon"/"Noshin"). */
function hash(text: string): number {
  let h = 0x811c9dc5;
  for (let i = 0; i < text.length; i += 1) {
    h ^= text.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return h >>> 0;
}

/**
 * Hand-picked stops rather than `hsl(hash % 360)`: an even hue spread runs
 * through muddy olives and yellows that look broken next to the brand blue,
 * and adjacent hues stop being told apart at 44px. Each entry is dark enough
 * for white text at every size.
 */
const PALETTE: { from: string; to: string }[] = [
  { from: "#4F6BED", to: "#7C4DE0" }, // indigo → violet
  { from: "#0E7C86", to: "#14A07A" }, // teal → green
  { from: "#C2410C", to: "#E8590C" }, // burnt orange
  { from: "#1D4ED8", to: "#0EA5E9" }, // blue → sky
  { from: "#9333EA", to: "#DB2777" }, // purple → pink
  { from: "#047857", to: "#0D9488" }, // emerald → teal
  { from: "#B91C1C", to: "#DC2626" }, // red
  { from: "#7C3AED", to: "#4F46E5" }, // violet → indigo
  { from: "#0F766E", to: "#0891B2" }, // deep teal → cyan
  { from: "#A16207", to: "#CA8A04" }, // amber (dark enough for white)
  { from: "#334155", to: "#475569" }, // slate, for the plainest names
  { from: "#BE185D", to: "#9D174D" }, // rose
];

/** Legal forms carry no identity — "OOO Nishon" and "Nishon" are one company. */
const LEGAL = new Set([
  "ooo", "ооо", "oao", "оао", "zao", "зао", "llc", "ltd", "inc", "mchj",
  "ip", "ип", "xk", "aj", "ao", "ао", "co", "corp", "gmbh",
]);

function words(name: string): string[] {
  return name
    .replace(/[«»"“”'’`(),.]/g, " ")
    .split(/[\s\-–—/|]+/)
    .map((w) => w.trim())
    .filter((w) => w.length > 0 && !LEGAL.has(w.toLowerCase()));
}

/** Up to two initials — "TATA Building Company" -> "TB", "Nishon Group" -> "NG". */
export function initialsOf(name: string): string {
  const parts = words(name);
  if (parts.length === 0) return "?";
  if (parts.length === 1) {
    // One word: two letters read better than one at tile size.
    return parts[0].slice(0, 2).toUpperCase();
  }
  return (parts[0][0] + parts[1][0]).toUpperCase();
}

export type CompanyBrand = {
  initials: string;
  from: string;
  to: string;
  /** 0-5, used to vary the generated banner so two listings differ. */
  motif: number;
};

/**
 * `name` should be the employer when we know it, and the job title otherwise —
 * that still gives each listing its own mark instead of one shared glyph.
 */
export function companyBrand(name: string | null | undefined): CompanyBrand {
  const clean = (name || "").trim();
  const key = clean.toLowerCase().replace(/\s+/g, " ") || "ishtop";
  const h = hash(key);
  const stop = PALETTE[h % PALETTE.length];
  return {
    initials: initialsOf(clean || "Ish"),
    from: stop.from,
    to: stop.to,
    motif: (h >>> 8) % 6,
  };
}
