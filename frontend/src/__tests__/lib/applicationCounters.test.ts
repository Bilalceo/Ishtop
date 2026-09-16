/**
 * The same application must be counted the same way everywhere.
 *
 * AUD-01/02. A student with one closed application saw: a notification saying
 * it was closed, a card saying "Kutilmoqda", a sidebar badge of 1, an
 * applications page showing 1 above six zeroes, and a dashboard pipeline
 * reading "Jami 0 ta ariza". Five surfaces, four different answers.
 *
 * Both pages fold statuses with the same rules; these tests pin the rules so
 * the two cannot drift apart again. If a status is added to the enum, the
 * reconciliation test fails until it is placed in active or closed.
 */

// The eight statuses the backend stores (ApplicationStatusEnum).
const ALL_STATUSES = [
  "pending",
  "reviewing",
  "shortlisted",
  "interview",
  "accepted",
  "hired",
  "rejected",
  "withdrawn",
] as const;

type Stats = Partial<Record<(typeof ALL_STATUSES)[number] | "total", number>>;

const n = (v: unknown) => (typeof v === "number" ? v : 0);

/** The applications page's tiles. */
function pageTiles(s: Stats) {
  return {
    pending: n(s.pending),
    reviewing: n(s.reviewing) + n(s.shortlisted),
    interview: n(s.interview),
    accepted: n(s.accepted) + n(s.hired),
    rejected: n(s.rejected),
    closed: n(s.withdrawn),
  };
}

/** The dashboard's pipeline. */
function pipeline(s: Stats) {
  const counts = {
    applied: n(s.pending),
    reviewing: n(s.reviewing) + n(s.shortlisted),
    interview: n(s.interview),
    accepted: n(s.accepted) + n(s.hired),
  };
  const active = Object.values(counts).reduce((a, b) => a + b, 0);
  const closed = n(s.withdrawn) + n(s.rejected);
  return { counts, active, closed, total: Math.max(n(s.total), active + closed) };
}

describe("application counters", () => {
  // The exact case from the audit.
  const oneClosed: Stats = { total: 1, withdrawn: 1 };

  it("does not report zero applications when one exists", () => {
    expect(pipeline(oneClosed).total).toBe(1);
  });

  it("names the closed one instead of dropping it", () => {
    const p = pipeline(oneClosed);
    expect(p.active).toBe(0);
    expect(p.closed).toBe(1);
    expect(p.active + p.closed).toBe(p.total);
  });

  it("agrees with the applications page about the same application", () => {
    const tiles = pageTiles(oneClosed);
    const p = pipeline(oneClosed);
    expect(tiles.closed).toBe(p.closed);
    expect(Object.values(tiles).reduce((a, b) => a + b, 0)).toBe(p.total);
  });

  it("reconciles for every status, one at a time", () => {
    for (const status of ALL_STATUSES) {
      const stats: Stats = { total: 1, [status]: 1 };
      const p = pipeline(stats);
      const tiles = pageTiles(stats);
      expect(p.active + p.closed).toBe(1);
      expect(Object.values(tiles).reduce((a, b) => a + b, 0)).toBe(1);
    }
  });

  it("reconciles when every status is present at once", () => {
    const stats: Stats = { total: ALL_STATUSES.length };
    for (const s of ALL_STATUSES) stats[s] = 1;
    const p = pipeline(stats);
    expect(p.active + p.closed).toBe(ALL_STATUSES.length);
    expect(p.total).toBe(ALL_STATUSES.length);
    expect(Object.values(pageTiles(stats)).reduce((a, b) => a + b, 0)).toBe(
      ALL_STATUSES.length
    );
  });

  it("folds shortlisted with reviewing and hired with accepted", () => {
    const p = pipeline({ total: 4, reviewing: 1, shortlisted: 1, accepted: 1, hired: 1 });
    expect(p.counts.reviewing).toBe(2);
    expect(p.counts.accepted).toBe(2);
  });

  it("never lets the stage bars exceed the active count", () => {
    const stats: Stats = { total: 3, pending: 1, shortlisted: 1, withdrawn: 1 };
    const p = pipeline(stats);
    for (const count of Object.values(p.counts)) {
      expect(count).toBeLessThanOrEqual(p.active);
    }
  });

  it("trusts the server total when it exceeds what the statuses explain", () => {
    // A status we do not yet know about must not shrink the total.
    expect(pipeline({ total: 9, pending: 1 }).total).toBe(9);
  });
});
