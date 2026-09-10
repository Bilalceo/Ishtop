/**
 * Where does applying to a job actually go?
 *
 * Most listings are aggregated from Telegram channels and sit under one import
 * account ("Ish beruvchi") that nobody ever signs into. Sending a candidate
 * through the in-app application form for those jobs is a dead end: the
 * application lands on an account with no reader, and the candidate waits for a
 * reply that cannot come. (Five real applications sat unread for two months.)
 *
 * The listings do carry a route to the employer — `external_apply_url` (the
 * source post) or `contact_info` (a channel handle) — so route the candidate
 * there instead, and only offer the in-app form when the employer is actually
 * on the platform to receive it.
 */

import type { Job } from "@/types/api";

export type ApplyRoute =
  | { kind: "internal" }
  | { kind: "external"; url: string }
  | { kind: "contact"; text: string; url?: string }
  | { kind: "none" };

/** Pull a usable link out of free-text contact info ("Batafsil: @ishmi_ish kanali"). */
function contactToUrl(text: string): string | undefined {
  const at = text.match(/@([A-Za-z0-9_]{4,32})/);
  if (at) return `https://t.me/${at[1]}`;
  const url = text.match(/https?:\/\/\S+/);
  if (url) return url[0].replace(/[.,;)]+$/, "");
  return undefined;
}

export function jobApplyRoute(job: Job): ApplyRoute {
  const external = (job.external_apply_url || "").trim();
  if (/^https?:\/\//i.test(external))
    return { kind: "external", url: external };

  const contact = (job.contact_info || "").trim();
  if (contact)
    return { kind: "contact", text: contact, url: contactToUrl(contact) };

  // No external route: the employer is a real account on the platform, so the
  // in-app form is the right destination.
  if (job.company_id) return { kind: "internal" };
  return { kind: "none" };
}

/** True when applying leaves IshTop — the CTA should say so. */
export function isExternalApply(job: Job): boolean {
  return jobApplyRoute(job).kind !== "internal";
}
