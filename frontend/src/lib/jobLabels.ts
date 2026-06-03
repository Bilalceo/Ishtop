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

function pick(map: Record<string, Pair>, value: string | undefined | null, isRu: boolean): string {
  if (!value) return "";
  const pair = map[value];
  if (pair) return isRu ? pair[1] : pair[0];
  // Unknown value → humanise instead of leaking the raw enum token.
  return value.replace(/_/g, " ");
}

export function jobTypeLabel(value: string | undefined | null, isRu: boolean): string {
  return pick(JOB_TYPE, value, isRu);
}

export function experienceLabel(value: string | undefined | null, isRu: boolean): string {
  return pick(EXPERIENCE, value, isRu);
}

/** Filter option lists — order roughly mirrors the local market (entry-first). */
export function jobTypeOptions(isRu: boolean): { value: string; label: string }[] {
  return (["full_time", "part_time", "internship", "remote", "hybrid", "contract"] as const).map(
    (v) => ({ value: v, label: jobTypeLabel(v, isRu) }),
  );
}

export function experienceOptions(isRu: boolean): { value: string; label: string }[] {
  return (["intern", "junior", "mid", "senior", "lead"] as const).map((v) => ({
    value: v,
    label: experienceLabel(v, isRu),
  }));
}
