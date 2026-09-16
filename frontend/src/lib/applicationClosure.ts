/**
 * Why a closed application closed, and when — one answer for every surface.
 *
 * AUD-01 asks that the notification, the card, the detail page and the
 * timeline show the same closing reason and time. They did not: the card
 * asserted "Bu e'lon olib tashlangani uchun arizangiz yopildi" even when the
 * student had withdrawn it themselves, the detail page hedged between the two
 * causes ("...yoki siz qaytarib olganingiz uchun"), and neither showed a date.
 *
 * The reason is derivable: if the listing itself is closed or gone, it was
 * taken down; otherwise the student withdrew. Nothing is asserted that the
 * data does not say — where the cause is genuinely unknown, it says so.
 */

import type { Application } from "@/types/api";

export type ClosureCause = "listing_removed" | "withdrawn_by_user" | "unknown";

export interface Closure {
  cause: ClosureCause;
  /** When the application reached its closed state, if we know. */
  at: string | null;
}

/** Statuses that mean the application is over. */
export const CLOSED_STATUSES = new Set(["withdrawn", "rejected"]);

export function closureOf(application: Application): Closure | null {
  if (application.status !== "withdrawn") return null;

  const jobStatus = application.job?.status as string | undefined;
  const closeCode = application.job?.close_reason_code;

  let cause: ClosureCause = "unknown";
  if (jobStatus && jobStatus !== "active") {
    cause = "listing_removed";
  } else if (closeCode) {
    cause = "listing_removed";
  } else if (jobStatus === "active") {
    // The listing is still open, so the application did not end because of it.
    cause = "withdrawn_by_user";
  }

  return {
    cause,
    // decided_at is set when a decision is recorded; updated_at is when the
    // row last changed, which for a closed application is the closing.
    at: application.decided_at || application.updated_at || null,
  };
}

export function closureText(c: Closure, isRu: boolean): string {
  switch (c.cause) {
    case "listing_removed":
      return isRu
        ? "Заявка закрыта: вакансия была снята."
        : "Ariza yopildi: e'lon olib tashlangan.";
    case "withdrawn_by_user":
      return isRu
        ? "Заявка закрыта: вы её отозвали."
        : "Ariza yopildi: siz qaytarib oldingiz.";
    default:
      return isRu
        ? "Заявка закрыта. Ответ не ожидается."
        : "Ariza yopildi. Javob kutilmaydi.";
  }
}
