/**
 * What we can say about a closed application — and nothing more.
 *
 * The first version of this file inferred the cause from the CURRENT state of
 * the listing: job closed now, therefore the application closed because of it;
 * job open now, therefore the student withdrew. Both inferences are unsound.
 * A listing can be closed long after, or for reasons unrelated to, an
 * application ending; and a listing being open says nothing about who ended
 * the application. Checked against production on 2026-09-16: three withdrawn
 * applications sit against listings that are still active, and they were not
 * withdrawn by the students.
 *
 * It also used `updated_at` as the closing date. For 15 of the 16 withdrawn
 * applications in production `decided_at` is NULL, so `updated_at` was the
 * timestamp of a bulk maintenance write — presented to the student as the day
 * their application closed.
 *
 * So: the cause comes only from a recorded closure reason, the date only from
 * `decided_at`, and where neither exists the page says so. No inference.
 */

import type { Application } from "@/types/api";

/** Statuses that mean the application is over. */
export const CLOSED_STATUSES = new Set(["withdrawn", "rejected"]);

/**
 * A closure reason recorded against the application itself.
 *
 * Nothing writes one today, which is why `reason` is effectively always null
 * and the UI says the cause was not recorded. The field is read rather than
 * assumed absent so that a reason stored later surfaces without another
 * change here.
 */
interface WithClosure {
  closure_reason?: string | null;
  closure_reason_code?: string | null;
}

export interface Closure {
  /** Recorded reason, or null when nothing recorded one. */
  reason: string | null;
  /** The recorded decision time, or null. Never a row's last-modified time. */
  at: string | null;
}

export function closureOf(application: Application): Closure | null {
  // Only "withdrawn". A rejection records its own cause — the employer
  // declined — so it keeps its own wording; overwriting it with "sababi qayd
  // etilmagan" would lose information we actually have.
  if (application.status !== "withdrawn") return null;

  const extra = application as Application & WithClosure;
  const reason =
    typeof extra.closure_reason === "string" && extra.closure_reason.trim()
      ? extra.closure_reason.trim()
      : null;

  return {
    reason,
    // decided_at is set by the transition that ended the application. Absent
    // means we do not know when it happened, and updated_at is not a
    // substitute: it moves on every write, including maintenance.
    at: application.decided_at || null,
  };
}

/** One sentence for the student, asserting only what is recorded. */
export function closureText(c: Closure, isRu: boolean): string {
  if (c.reason) {
    return isRu ? `Заявка закрыта: ${c.reason}` : `Ariza yopilgan: ${c.reason}`;
  }
  return isRu
    ? "Заявка закрыта; причина не зафиксирована."
    : "Ariza yopilgan; sababi qayd etilmagan.";
}

/**
 * The line the card and the detail page both render: the sentence, plus the
 * date only when there is a recorded one.
 */
export function closureLine(
  c: Closure,
  isRu: boolean,
  formatDate: (iso: string) => string
): string {
  const text = closureText(c, isRu);
  return c.at ? `${text} · ${formatDate(c.at)}` : text;
}
