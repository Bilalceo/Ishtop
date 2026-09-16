/**
 * An expired session and a first visit must not look the same.
 *
 * useRequireAuth sent every visitor to "?session_expired=true", including
 * someone who had never signed in. The first fix read the persisted user from
 * the auth store — but logout() nulls that before the guard runs, so it
 * flipped the bug the other way: a browser that had been signed in all
 * session was sent to a bare /login with no explanation. Seen live.
 */

import { hasEverHadSession, rememberSessionEstablished } from "@/lib/sessionHistory";

describe("sessionHistory", () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  it("reports no history for a first-time visitor", () => {
    expect(hasEverHadSession()).toBe(false);
  });

  it("remembers once a session is established", () => {
    rememberSessionEstablished();
    expect(hasEverHadSession()).toBe(true);
  });

  it("survives the auth store being cleared by logout", () => {
    rememberSessionEstablished();
    // What logout() does: nulls the persisted user.
    window.localStorage.setItem(
      "auth-storage",
      JSON.stringify({ state: { user: null, isAuthenticated: false } })
    );
    expect(hasEverHadSession()).toBe(true);
  });

  it("stores a flag and no identity", () => {
    rememberSessionEstablished();
    const values = Object.keys(window.localStorage).map((k) =>
      window.localStorage.getItem(k)
    );
    expect(values).toEqual(["1"]);
  });

  it("does not throw when storage is unavailable", () => {
    const getItem = jest
      .spyOn(window.localStorage.__proto__, "getItem")
      .mockImplementation(() => {
        throw new Error("blocked");
      });
    const setItem = jest
      .spyOn(window.localStorage.__proto__, "setItem")
      .mockImplementation(() => {
        throw new Error("blocked");
      });

    expect(() => rememberSessionEstablished()).not.toThrow();
    expect(hasEverHadSession()).toBe(false); // falls back to "guest"

    getItem.mockRestore();
    setItem.mockRestore();
  });
});
