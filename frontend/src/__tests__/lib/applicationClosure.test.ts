/**
 * A closed application may only be described from recorded evidence.
 *
 * The first version of this helper inferred the cause from the listing's
 * CURRENT state and used `updated_at` as the closing date. Both were wrong,
 * and production proved it: three withdrawn applications sit against listings
 * that are still active (they were not withdrawn by the students), and 15 of
 * the 16 withdrawn rows have no `decided_at` at all — so `updated_at` was a
 * bulk maintenance timestamp being shown as the day the application closed.
 *
 * These tests fail on any attempt to infer either one again.
 */

import {
  CLOSED_STATUSES,
  closureLine,
  closureOf,
  closureText,
} from "@/lib/applicationClosure";
import type { Application } from "@/types/api";

const app = (over: Record<string, unknown> = {}): Application =>
  ({
    id: "a1",
    job_id: "j1",
    user_id: "u1",
    resume_id: "r1",
    status: "withdrawn",
    applied_at: "2026-09-10T00:00:00Z",
    updated_at: "2026-09-11T14:32:19Z", // the bulk-write timestamp
    ...over,
  }) as Application;

const fmt = (iso: string) => iso.slice(0, 10);

describe("closureOf", () => {
  it("applies only to a withdrawn application", () => {
    for (const status of ["pending", "reviewing", "interview", "accepted", "hired"]) {
      expect(closureOf(app({ status }))).toBeNull();
    }
    expect(closureOf(app({ status: "withdrawn" }))).not.toBeNull();
  });

  it("leaves a rejection its own explanation", () => {
    // Rejection records its cause in the status itself.
    expect(closureOf(app({ status: "rejected" }))).toBeNull();
  });

  it("never uses updated_at as the closing date", () => {
    const c = closureOf(app())!;
    expect(c.at).toBeNull();
    expect(closureLine(c, false, fmt)).not.toContain("2026-09-11");
  });

  it("uses decided_at when it is recorded", () => {
    const c = closureOf(app({ decided_at: "2026-08-20T04:29:47Z" }))!;
    expect(c.at).toBe("2026-08-20T04:29:47Z");
    expect(closureLine(c, false, fmt)).toContain("2026-08-20");
  });

  describe("does not infer a cause from the listing", () => {
    it("says nothing about a student who may not have withdrawn it", () => {
      // Production case: withdrawn application, listing still active.
      const c = closureOf(app({ job: { status: "active" } as never }))!;
      expect(c.reason).toBeNull();
      const line = closureText(c, false);
      expect(line).not.toMatch(/qaytarib oldingiz/i);
      expect(closureText(c, true)).not.toMatch(/отозвали/i);
    });

    it("does not blame a listing that merely happens to be closed now", () => {
      const c = closureOf(
        app({ job: { status: "closed", close_reason_code: "other" } as never })
      )!;
      expect(c.reason).toBeNull();
      expect(closureText(c, false)).not.toMatch(/olib tashlangan/i);
      expect(closureText(c, true)).not.toMatch(/снята/i);
    });
  });

  it("uses a reason that was actually recorded against the application", () => {
    const c = closureOf(app({ closure_reason: "Nomzod o'zi qaytarib oldi" }))!;
    expect(c.reason).toBe("Nomzod o'zi qaytarib oldi");
    expect(closureText(c, false)).toContain("Nomzod o'zi qaytarib oldi");
  });

  it("ignores a blank recorded reason", () => {
    expect(closureOf(app({ closure_reason: "   " }))!.reason).toBeNull();
  });
});

describe("closureText", () => {
  it("says the cause was not recorded when it was not", () => {
    const c = { reason: null, at: null };
    expect(closureText(c, false)).toBe("Ariza yopilgan; sababi qayd etilmagan.");
    expect(closureText(c, true)).toBe("Заявка закрыта; причина не зафиксирована.");
  });

  it("never offers two possible causes at once", () => {
    for (const reason of [null, "E'lon olib tashlandi"]) {
      for (const isRu of [false, true]) {
        expect(closureText({ reason, at: null }, isRu)).not.toMatch(/yoki|или/);
      }
    }
  });

  it("never tells a closed application to expect a reply", () => {
    expect(closureText({ reason: null, at: null }, false)).not.toMatch(/kutilmoqda/i);
    expect(closureText({ reason: null, at: null }, true)).not.toMatch(/ожида/i);
  });
});

describe("closureLine", () => {
  it("omits the date entirely when none is recorded", () => {
    expect(closureLine({ reason: null, at: null }, false, fmt)).toBe(
      "Ariza yopilgan; sababi qayd etilmagan."
    );
  });

  it("appends only a recorded date", () => {
    expect(closureLine({ reason: null, at: "2026-08-20T00:00:00Z" }, false, fmt)).toBe(
      "Ariza yopilgan; sababi qayd etilmagan. · 2026-08-20"
    );
  });
});

describe("CLOSED_STATUSES", () => {
  it("covers the statuses that end an application", () => {
    expect(CLOSED_STATUSES.has("withdrawn")).toBe(true);
    expect(CLOSED_STATUSES.has("rejected")).toBe(true);
    expect(CLOSED_STATUSES.has("pending")).toBe(false);
  });
});
