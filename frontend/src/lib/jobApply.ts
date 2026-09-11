/**
 * How a candidate reaches the employer for a given job.
 *
 * Most listings are aggregated from other people's Telegram channels and sit
 * under one import account nobody signs into, so we do not take applications
 * for them — an application nobody can answer is worse than none. What we do
 * have is the employer's own contact, exactly as the source post wrote it.
 *
 * This used to route people into our Telegram bot to read that contact, which
 * meant leaving the site to see information the site already had. The bot still
 * serves people who arrive from Telegram; on the web it is shown here.
 */

import type { Job } from "@/types/api";

export const APPLY_BOT = "ishtop_ariza_bot";

export type ApplyRoute =
  | { kind: "internal" }
  | { kind: "contact" }
  | { kind: "none" };

export type ParsedContact = {
  phones: string[];
  handles: string[];
  /** Whatever the post said around the contact — a name, or what to send. */
  note: string;
};

const PHONE_RE = /\+?998[\s-]?\d{2}[\s-]?\d{3}[\s-]?\d{2}[\s-]?\d{2}/g;
const HANDLE_RE = /@([A-Za-z0-9_]{4,32})/g;

/** Words the source wrapped the contact in; they say less than our own labels. */
const FILLER = new Set([
  "batafsil",
  "kanali",
  "kanal",
  "murojaat",
  "aloqa",
  "tel",
  "telefon",
  "bog'lanish",
  "boglanish",
  "uchun",
  "qiling",
  "yozing",
  "raqam",
  "контакт",
  "телефон",
  "подробнее",
  "канал",
  "связь",
]);

export function parseContact(raw: string | null | undefined): ParsedContact {
  const text = (raw || "").trim();
  const phones = [...text.matchAll(PHONE_RE)].map((m) => m[0].trim());
  const handles = [...text.matchAll(HANDLE_RE)].map((m) => m[1]);

  let note = text.replace(PHONE_RE, " ").replace(HANDLE_RE, " ");
  note = note.replace(/[\s,;/]+/g, " ").replace(/\s*:\s*(?=\(|$)/g, " ");
  note = note
    .split(" ")
    .filter((w) => {
      const bare = w.replace(/^[.,;:()-]+|[.,;:()-]+$/g, "").toLowerCase();
      return bare && !FILLER.has(bare) && /[\p{L}\p{N}]/u.test(w);
    })
    .join(" ")
    .replace(/^[.,;:-]+|[.,;:-]+$/g, "");

  return { phones, handles, note };
}

/** "+998901234567" -> "+998 90 123-45-67", the way a number is written here. */
export function formatPhone(raw: string): string {
  const d = raw.replace(/\D/g, "").slice(-12);
  if (d.length !== 12) return raw.trim();
  return `+${d.slice(0, 3)} ${d.slice(3, 5)} ${d.slice(5, 8)}-${d.slice(8, 10)}-${d.slice(10)}`;
}

/** The `tel:` target for a phone as the post wrote it. */
export function telHref(raw: string): string {
  return `tel:+${raw.replace(/\D/g, "").slice(-12)}`;
}

export function jobApplyRoute(job: Job): ApplyRoute {
  const contact = (job.contact_info || "").trim();
  if (contact) return { kind: "contact" };

  // The employer has a real account here, so the in-app form reaches someone.
  if (job.company_id && !isImportAccount(job)) return { kind: "internal" };

  // Deliberately NOT falling back to `external_apply_url`. That field holds the
  // source post or the site we read the listing from — sending the candidate
  // there hands our traffic to the channel (or the competitor) we took the
  // listing from, and they apply somewhere we can never follow up. A listing we
  // cannot route on our own page is a listing we should not be carrying.
  return { kind: "none" };
}

/** True when applying does not go through our own application form. */
export function isExternalApply(job: Job): boolean {
  return jobApplyRoute(job).kind !== "internal";
}

const IMPORT_ACCOUNT_NAMES = new Set(["ish beruvchi", "работодатель"]);

/**
 * Aggregated listings sit under one shared import account, so a `company_id`
 * on them points at us, not at an employer who reads applications.
 */
function isImportAccount(job: Job): boolean {
  const name = (job.company?.name || "").trim().toLowerCase();
  return IMPORT_ACCOUNT_NAMES.has(name);
}

/** Deep link opening this exact job in the bot (used from Telegram entry points). */
export function jobBotLink(jobId: string): string {
  return `https://t.me/${APPLY_BOT}?start=job_${jobId}`;
}
