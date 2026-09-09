/**
 * Single source of truth for job_type / experience_level display labels and
 * filter options (UZ + RU). Previously each page/component kept its own inline
 * map, and several were missing values the backend actually returns (notably
 * `intern` and `internship`) — so those jobs rendered raw English ("intern"),
 * mixing languages. Use these helpers everywhere instead.
 *
 * Backend enums:
 *   JobType        = full_time | part_time | remote | hybrid | contract | internship
 *   ExperienceLevel = intern | junior | mid | senior | lead | executive
 */

type Pair = readonly [uz: string, ru: string];

const JOB_TYPE: Record<string, Pair> = {
  full_time: ["To'liq stavka", "Полная занятость"],
  part_time: ["Yarim stavka", "Частичная занятость"],
  remote: ["Masofaviy", "Удалённо"],
  hybrid: ["Gibrid", "Гибрид"],
  contract: ["Shartnoma", "Контракт"],
  internship: ["Amaliyot", "Стажировка"],
};

const EXPERIENCE: Record<string, Pair> = {
  intern: ["Amaliyotchi (tajribasiz)", "Стажёр (без опыта)"],
  entry: ["Boshlang'ich", "Начальный"], // legacy alias, not a backend enum value
  junior: ["Boshlovchi (0-2 yil)", "Начинающий (0-2 года)"],
  mid: ["O'rta (2-5 yil)", "Средний (2-5 лет)"],
  senior: ["Katta (5+ yil)", "Старший (5+ лет)"],
  lead: ["Rahbar (7+ yil)", "Руководитель (7+ лет)"],
  executive: ["Direktor", "Директор"],
};

function pick(
  map: Record<string, Pair>,
  value: string | undefined | null,
  isRu: boolean,
): string {
  if (!value) return "";
  const pair = map[value];
  if (pair) return isRu ? pair[1] : pair[0];
  // Unknown value → humanise instead of leaking the raw enum token.
  return value.replace(/_/g, " ");
}

export function jobTypeLabel(
  value: string | undefined | null,
  isRu: boolean,
): string {
  return pick(JOB_TYPE, value, isRu);
}

export function experienceLabel(
  value: string | undefined | null,
  isRu: boolean,
): string {
  return pick(EXPERIENCE, value, isRu);
}

/** Company names that carry no information and should be treated as missing. */
const PLACEHOLDER_COMPANIES = new Set([
  "ish beruvchi",
  "xususiy korxona",
  "kompaniya",
  "работодатель",
  "частная компания",
]);

/**
 * Split a listing into a clean title and a real company name.
 *
 * Aggregated vacancies are stored under one import account whose name is the
 * placeholder "Ish beruvchi", with the real employer appended to the title —
 * e.g. "Frontend Dasturchi (I TECH IT GROUP)". Showing that verbatim gives every
 * card the same meaningless company line, so pull the employer out of the
 * trailing parentheses and drop it from the title.
 */
export function jobDisplayIdentity(
  title: string | undefined | null,
  companyName: string | undefined | null,
): { title: string; company: string; companyIsReal: boolean } {
  const rawTitle = (title || "").trim();
  const rawCompany = (companyName || "").trim();
  const companyIsReal =
    rawCompany !== "" && !PLACEHOLDER_COMPANIES.has(rawCompany.toLowerCase());
  if (companyIsReal)
    return { title: rawTitle, company: rawCompany, companyIsReal: true };

  // Take the trailing parenthesised group, matching brackets from the end so a
  // nested name survives: "Savdo vakili (Nishon Group (go'sht))" -> "Nishon Group (go'sht)".
  if (rawTitle.endsWith(")")) {
    let depth = 0;
    let open = -1;
    for (let i = rawTitle.length - 1; i >= 0; i -= 1) {
      const ch = rawTitle[i];
      if (ch === ")") depth += 1;
      else if (ch === "(") {
        depth -= 1;
        if (depth === 0) {
          open = i;
          break;
        }
      }
    }
    if (open > 0) {
      const inner = rawTitle.slice(open + 1, -1).trim();
      const head = rawTitle.slice(0, open).trim();
      // Ignore qualifiers like "(Junior)" — they describe the role, not the employer.
      const isQualifier =
        /^(junior|middle|mid|senior|intern|remote|masofaviy|part[- ]?time|full[- ]?time)$/i.test(
          inner,
        );
      if (
        head &&
        inner.length >= 3 &&
        inner.length <= 70 &&
        !isQualifier &&
        /\s|[A-ZА-Я]/.test(inner)
      ) {
        // The employer name is real, but its verification belongs to the import
        // account rather than this employer — so companyIsReal stays false.
        return { title: head, company: inner, companyIsReal: false };
      }
    }
  }
  // Nothing usable: report no company at all rather than echoing a
  // placeholder like "Ish beruvchi" on every listing.
  return {
    title: rawTitle,
    company: companyIsReal ? rawCompany : "",
    companyIsReal,
  };
}

/** Filter option lists — order roughly mirrors the local market (entry-first). */
export function jobTypeOptions(
  isRu: boolean,
): { value: string; label: string }[] {
  return (
    [
      "full_time",
      "part_time",
      "internship",
      "remote",
      "hybrid",
      "contract",
    ] as const
  ).map((v) => ({ value: v, label: jobTypeLabel(v, isRu) }));
}

export function experienceOptions(
  isRu: boolean,
): { value: string; label: string }[] {
  return (["intern", "junior", "mid", "senior", "lead"] as const).map((v) => ({
    value: v,
    label: experienceLabel(v, isRu),
  }));
}
