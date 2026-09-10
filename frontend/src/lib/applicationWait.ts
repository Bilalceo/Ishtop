/**
 * How long has an application been waiting, and what should the candidate do?
 *
 * "pending" on its own tells a candidate nothing: an application submitted
 * yesterday and one ignored for three months look identical. Ten real
 * applications sat unanswered for up to 94 days while the UI showed a hopeful
 * amber "Kutilmoqda" on every one of them.
 *
 * So derive a waiting stage from the data the API already returns
 * (days_since_applied + reviewed_at) and let the UI be honest about it —
 * including telling the candidate to stop waiting and act.
 */

export type WaitStage = "fresh" | "waiting" | "silent";

/** An employer that has not looked at the application after this many days is not going to. */
export const SILENT_AFTER_DAYS = 21;
const WAITING_AFTER_DAYS = 7;

export function applicationWaitStage(app: {
  status: string;
  reviewed_at?: string | null;
  days_since_applied?: number | null;
  applied_at?: string;
}): WaitStage | null {
  // Only an untouched application is "waiting" — once it moves, the status speaks.
  if (app.status !== "pending" || app.reviewed_at) return null;

  const days =
    typeof app.days_since_applied === "number"
      ? app.days_since_applied
      : app.applied_at
        ? Math.floor((Date.now() - new Date(app.applied_at).getTime()) / 86_400_000)
        : 0;

  if (days >= SILENT_AFTER_DAYS) return "silent";
  if (days >= WAITING_AFTER_DAYS) return "waiting";
  return "fresh";
}

export function waitDays(app: {
  days_since_applied?: number | null;
  applied_at?: string;
}): number {
  if (typeof app.days_since_applied === "number") return app.days_since_applied;
  if (!app.applied_at) return 0;
  return Math.floor((Date.now() - new Date(app.applied_at).getTime()) / 86_400_000);
}
