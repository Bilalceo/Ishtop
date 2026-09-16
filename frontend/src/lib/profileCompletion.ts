/**
 * Profile completeness, and which fields are still missing.
 *
 * The dashboard showed "60%" and left the student to guess which 40%, while
 * the skill-gap panel beside it said "Profil to'la" — a different thing
 * entirely (no missing skills in the current recommendations). Extracted so
 * the page and its test share one definition rather than two copies.
 */

export interface ProfileFieldsSource {
  full_name?: string | null;
  email?: string | null;
  phone?: string | null;
  bio?: string | null;
  location?: string | null;
}

/** Field weights sum to 80; every account starts at 20 for existing. */
export const PROFILE_FIELDS = [
  { key: "full_name", weight: 20 },
  { key: "email", weight: 20 },
  { key: "phone", weight: 15 },
  { key: "bio", weight: 15 },
  { key: "location", weight: 10 },
] as const;

export type ProfileFieldKey = (typeof PROFILE_FIELDS)[number]["key"];

export interface ProfileCompletion {
  percent: number;
  missing: ProfileFieldKey[];
}

export function profileCompletion(
  user: ProfileFieldsSource | null | undefined
): ProfileCompletion {
  const filled = (key: ProfileFieldKey) => Boolean(user?.[key]);
  return {
    percent: PROFILE_FIELDS.reduce(
      (sum, f) => (filled(f.key) ? sum + f.weight : sum),
      20
    ),
    missing: PROFILE_FIELDS.filter((f) => !filled(f.key)).map((f) => f.key),
  };
}

export const PROFILE_FIELD_LABELS: Record<ProfileFieldKey, [string, string]> = {
  full_name: ["Ism va familiya", "Имя и фамилия"],
  email: ["Elektron pochta", "Электронная почта"],
  phone: ["Telefon raqami", "Номер телефона"],
  bio: ["O'zingiz haqingizda qisqacha", "Кратко о себе"],
  location: ["Joylashuv", "Местоположение"],
};
