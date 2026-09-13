/**
 * Contact parsing and apply routing.
 *
 * Every case here is a bug that actually shipped. The listings on this platform
 * are scraped from other people's Telegram posts, so `contact_info` is whatever
 * a stranger typed — and getting it wrong sends a candidate to a dead end.
 */

import {
  formatPhone,
  jobApplyRoute,
  parseContact,
  telHref,
} from "@/lib/jobApply";
import type { Job } from "@/types/api";

const job = (over: Partial<Job> = {}): Job =>
  ({
    id: "j1",
    company_id: "c1",
    title: "Sotuv menejeri",
    description: "",
    requirements: [],
    location: "Toshkent",
    job_type: "full_time",
    experience_level: "junior",
    status: "active",
    applications_count: 0,
    views_count: 0,
    created_at: "2026-09-01T00:00:00Z",
    updated_at: "2026-09-01T00:00:00Z",
    ...over,
  }) as Job;

describe("parseContact", () => {
  it("pulls phones and handles out of a free-text line", () => {
    const c = parseContact("+998977998001, @HR_GijduvanPremium");
    expect(c.phones).toEqual(["+998977998001"]);
    expect(c.handles).toEqual(["HR_GijduvanPremium"]);
  });

  it("does NOT read an email's domain as a Telegram handle", () => {
    // Shipped: "shintree.uz@korshop.one" was offered to candidates as a chat
    // link to @korshop, an account that does not exist.
    const c = parseContact("Aleksey: +998 90 966 48 88 · shintree.uz@korshop.one");
    expect(c.handles).toEqual([]);
    expect(c.emails).toEqual(["shintree.uz@korshop.one"]);
    expect(c.phones).toEqual(["+998 90 966 48 88"]);
  });

  it("keeps a handle that starts the line", () => {
    expect(parseContact("@recruiterselfie").handles).toEqual(["recruiterselfie"]);
  });

  it("keeps the words around a contact when they say something", () => {
    const c = parseContact("+998 93 590 66 88 — Vadim (18:00 gacha)");
    expect(c.note).toContain("Vadim");
  });

  it("drops filler that says less than our own labels", () => {
    // "Batafsil: @ishmi_ish kanali" left the half-sentence "Batafsil: kanali".
    const c = parseContact("Murojaat uchun: +998901234567");
    expect(c.note.toLowerCase()).not.toContain("murojaat");
    expect(c.note.toLowerCase()).not.toContain("uchun");
  });

  it("survives an empty or missing value", () => {
    for (const v of [undefined, null, "", "   "]) {
      const c = parseContact(v as string | null | undefined);
      expect(c.phones).toEqual([]);
      expect(c.handles).toEqual([]);
    }
  });
});

describe("formatPhone / telHref", () => {
  it("formats a 998 number the way it is written here", () => {
    expect(formatPhone("+998935906688")).toBe("+998 93 590-66-88");
    expect(formatPhone("998935906688")).toBe("+998 93 590-66-88");
    expect(formatPhone("+998 93 590 66 88")).toBe("+998 93 590-66-88");
  });

  it("leaves something it cannot parse alone rather than mangling it", () => {
    expect(formatPhone("123")).toBe("123");
  });

  it("builds a dialable href", () => {
    expect(telHref("+998 93 590-66-88")).toBe("tel:+998935906688");
  });
});

describe("jobApplyRoute", () => {
  it("routes to the contact panel when the employer left one", () => {
    expect(jobApplyRoute(job({ contact_info: "+998901234567" })).kind).toBe("contact");
  });

  it("offers the in-app form only for an employer with a real account", () => {
    const real = job({ company: { name: "Nishon Group" } as Job["company"] });
    expect(jobApplyRoute(real).kind).toBe("internal");
  });

  it("does NOT offer the in-app form for the shared import account", () => {
    // Aggregated listings all sit under "Ish beruvchi"; nobody reads that
    // inbox, and ten applications sat there unanswered for up to 94 days.
    const imported = job({ company: { name: "Ish beruvchi" } as Job["company"] });
    expect(jobApplyRoute(imported).kind).toBe("none");
  });

  it("has no route back to the source we scraped it from", () => {
    // There used to be a `source` route pointing at cloz.uz — our competitor.
    const imported = job({ company: { name: "Ish beruvchi" } as Job["company"] });
    expect(["contact", "internal", "none"]).toContain(jobApplyRoute(imported).kind);
  });
});
