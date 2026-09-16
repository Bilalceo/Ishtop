/**
 * Has this browser ever held a signed-in session?
 *
 * Needed to tell a guest apart from someone whose session expired. The
 * obvious signal — a persisted user in the auth store — does not work:
 * logout() sets user to null before the route guard runs, so an expired
 * session looked exactly like a first-time visitor. Observed live: a browser
 * that had been signed in all session was redirected to a bare /login with no
 * explanation of why it had been signed out.
 *
 * This marker is written when a session is established and deliberately NOT
 * cleared on logout, so "your session ended" stays distinguishable from "you
 * have never signed in". It records no identity — one flag, nothing else.
 */

const KEY = "ishtop.had_session";

export function rememberSessionEstablished(): void {
  try {
    window.localStorage.setItem(KEY, "1");
  } catch {
    // Private windows and blocked site data: we simply lose the distinction.
  }
}

export function hasEverHadSession(): boolean {
  try {
    return window.localStorage.getItem(KEY) === "1";
  } catch {
    return false;
  }
}
