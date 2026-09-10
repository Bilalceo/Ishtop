/**
 * Where does applying to a job actually go?
 *
 * Most listings are aggregated from other people's Telegram channels and sit
 * under one import account that nobody signs into, so the in-app form is a dead
 * end for them: the application lands on an account with no reader. (Five real
 * ones sat unread for two months.)
 *
 * The first fix sent those applicants to the source post — which quietly handed
 * our traffic to a competitor's channel and lost the candidate for good. So they
 * now go to our own bot instead, deep-linked to that exact vacancy:
 * t.me/<bot>?start=job_<id>. The bot shows the job, keeps the candidate inside
 * our ecosystem, and can take the application itself where the employer is on
 * the platform.
 */

import type { Job } from "@/types/api";

/** The bot that receives job deep links. Stable — it is the account name. */
export const APPLY_BOT = "ishtop_ariza_bot";

export type ApplyRoute =
  | { kind: "internal" }
  | { kind: "bot"; url: string }
  | { kind: "none" };

/** Deep link into the bot, opened on this exact vacancy. */
export function jobBotLink(jobId: string): string {
  return `https://t.me/${APPLY_BOT}?start=job_${jobId}`;
}

export function jobApplyRoute(job: Job): ApplyRoute {
  const hasExternalRoute =
    !!(job.external_apply_url || "").trim() ||
    !!(job.contact_info || "").trim();

  // Aggregated listing: hand it to our bot, not to the channel it came from.
  if (hasExternalRoute) return { kind: "bot", url: jobBotLink(job.id) };

  // No external route means the employer is a real account here, so the in-app
  // form reaches someone.
  if (job.company_id) return { kind: "internal" };
  return { kind: "none" };
}

/** True when applying leaves the site (i.e. goes through the bot). */
export function isExternalApply(job: Job): boolean {
  return jobApplyRoute(job).kind !== "internal";
}
