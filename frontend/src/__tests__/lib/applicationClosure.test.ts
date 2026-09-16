/**
 * One closure, one explanation, on every surface.
 *
 * AUD-01's acceptance criterion: the notification, the card, the detail page
 * and the timeline must show the same closing reason and time. The card used
 * to assert the listing had been taken down even when the student withdrew the
 * application themselves, the detail page hedged between both causes, and
 * neither showed a date.
 */

import { closureOf, closureText, CLOSED_STATUSES } from "@/lib/applicationClosure";
import type { Application } from "@/types/api";

const app = (over: Partial<Application> = {}): Application =>
  ({
    id: "a1",
    job_id: "j1",
    user_id: "u1",
    resume_id: "r1",
    status: "withdrawn",
    applied_at: "2026-09-10T00:00:00Z",
    updated_at: "2026-09-11T10:00:00Z",
    ...over,
  }) as Application;

describe("closureOf", () => {
  it("returns nothing for an application still in progress", () => {
    for (const status of ["pending", "reviewing", "interview", "accepted"]) {
      expect(closureOf(app({ status: status as Application["status"] }))).toBeNull();
    }
  });

  it("blames the listing when the listing is closed", () => {
    const c = closureOf(app({ job: { status: "closed" } as never }))!;
    expect(c.cause).toBe("listing_removed");
  });

  it("blames the listing when it carries a close reason", () => {
    const c = closureOf(
      app({ job: { status: "active", close_reason_code: "hired" } as never })
    )!;
    expect(c.cause).toBe("listing_removed");
  });

  it("does not blame a listing that is still open", () => {
    const c = closureOf(app({ job: { status: "active" } as never }))!;
    expect(c.cause).toBe("withdrawn_by_user");
  });

  it("says unknown rather than guessing when the job is missing", () => {
    expect(closureOf(app())!.cause).toBe("unknown");
  });

  it("carries the closing time, preferring a recorded decision", () => {
    expect(closureOf(app())!.at).toBe("2026-09-11T10:00:00Z");
    expect(closureOf(app({ decided_at: "2026-09-12T00:00:00Z" }))!.at).toBe(
      "2026-09-12T00:00:00Z"
    );
  });
});

describe("closureText", () => {
  it("never offers two causes at once", () => {
    for (const cause of ["listing_removed", "withdrawn_by_user", "unknown"] as const) {
      for (const isRu of [false, true]) {
        const text = closureText({ cause, at: null }, isRu);
        expect(text).toBeTruthy();
        expect(text).not.toMatch(/yoki|или/);
      }
    }
  });

  it("does not tell a closed application to expect a reply", () => {
    for (const cause of ["listing_removed", "withdrawn_by_user", "unknown"] as const) {
      expect(closureText({ cause, at: null }, false)).not.toMatch(/kutilmoqda/i);
    }
  });

  it("has wording in both languages for every cause", () => {
    for (const cause of ["listing_removed", "withdrawn_by_user", "unknown"] as const) {
      expect(closureText({ cause, at: null }, false)).not.toBe(
        closureText({ cause, at: null }, true)
      );
    }
  });
});

describe("CLOSED_STATUSES", () => {
  it("covers the statuses that end an application", () => {
    expect(CLOSED_STATUSES.has("withdrawn")).toBe(true);
    expect(CLOSED_STATUSES.has("rejected")).toBe(true);
    expect(CLOSED_STATUSES.has("pending")).toBe(false);
  });
});
