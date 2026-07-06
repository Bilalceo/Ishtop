/**
 * =============================================================================
 * AUTH STORE - Zustand State Management
 * =============================================================================
 *
 * Handles authentication state:
 * - User data
 * - Tokens (access + refresh)
 * - Login/Logout actions
 * - Auth status
 */

import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import { immer } from "zustand/middleware/immer";
import type { User } from "@/types/api";
import { getApiBaseUrl } from "@/lib/runtime-config";

// =============================================================================
// API CONFIG
// =============================================================================

const API_BASE_URL = getApiBaseUrl();

async function parseApiError(res: Response): Promise<string> {
  try {
    const data = await res.json();
    if (typeof data?.detail === "string") return data.detail;
    if (typeof data?.message === "string") return data.message;
    if (typeof data?.error?.message === "string") return data.error.message;
    return `Request failed (${res.status})`;
  } catch {
    return `Request failed (${res.status})`;
  }
}

type UnknownRecord = Record<string, unknown>;

function isRecord(value: unknown): value is UnknownRecord {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isUserLike(value: unknown): value is User {
  if (!isRecord(value)) {
    return false;
  }

  const hasEmail = typeof value.email === "string";
  const hasIdentity =
    typeof value.full_name === "string" ||
    typeof value.role === "string" ||
    typeof value.id === "string";

  return hasEmail && hasIdentity;
}

function unwrapPayload(payload: unknown): UnknownRecord {
  if (!isRecord(payload)) {
    return {};
  }

  const nested = isRecord(payload.data) ? payload.data : null;
  return nested ?? payload;
}

function extractUser(payload: unknown): User | null {
  const root = unwrapPayload(payload);
  const nestedUser = isUserLike(root.user) ? root.user : null;
  if (nestedUser) {
    return nestedUser;
  }

  if (isUserLike(payload)) {
    return payload;
  }

  if (isRecord(payload) && isUserLike(payload.user)) {
    return payload.user;
  }

  return null;
}

function sanitizeUserForClient(user: User | null): User | null {
  if (!user) return null;
  return {
    id: user.id,
    full_name: user.full_name,
    role: user.role,
    email: user.email,
    phone: user.phone ?? null,
    avatar_url: user.avatar_url ?? null,
    company_name: user.company_name ?? null,
    company_website: user.company_website ?? null,
    company_cover_photo_url: user.company_cover_photo_url ?? null,
    company_gallery_images: Array.isArray(user.company_gallery_images) ? user.company_gallery_images : [],
    company_culture: user.company_culture ?? null,
    company_linkedin_url: user.company_linkedin_url ?? null,
    company_telegram_url: user.company_telegram_url ?? null,
    company_instagram_url: user.company_instagram_url ?? null,
    company_facebook_url: user.company_facebook_url ?? null,
    company_founded_year: user.company_founded_year ?? null,
    company_video_url: user.company_video_url ?? null,
    verification_state: user.verification_state ?? null,
    bio: user.bio ?? null,
    location: user.location ?? null,
    created_at: user.created_at,
    updated_at: user.updated_at ?? null,
    is_active: user.is_active ?? true,
    is_verified: user.is_verified ?? false,
  } as User;
}

function applyAuthResponse(
  set: (updater: (state: AuthState) => void) => void,
  payload: unknown,
) {
  // Stage 2 cookie-only auth: we intentionally IGNORE any access_token /
  // refresh_token returned in the JSON body. The browser session is anchored
  // exclusively by httpOnly cookies set by the backend; surfacing tokens to
  // JS would defeat the XSS protection these cookies provide. Mobile / API
  // clients can still read the JSON tokens — we just don't store them here.
  const user = extractUser(payload);

  set((state) => {
    state.user = sanitizeUserForClient(user);
    state.isAuthenticated = !!user;
    state.isLoading = false;
  });

  return { user: sanitizeUserForClient(user) };
}

function extractMeUser(payload: unknown): User | null {
  return extractUser(payload);
}

// =============================================================================
// TYPES
// =============================================================================

interface AuthState {
  // State — cookie-only browser auth: NO tokens here, not in memory, not
  // persisted. Backend httpOnly cookies are the single source of truth.
  user: User | null;
  isAuthenticated: boolean;
  hasHydrated: boolean;
  isLoading: boolean;
  error: string | null;

  // Actions
  setUser: (user: User | null) => void;
  setHasHydrated: (value: boolean) => void;
  login: (email: string, password: string) => Promise<void>;
  register: (data: RegisterData) => Promise<void>;
  logout: () => Promise<void>;
  /**
   * Calls /auth/refresh using the httpOnly refresh cookie. Returns true if
   * the session was renewed, false if the user must re-authenticate.
   */
  refreshAccessToken: () => Promise<boolean>;
  updateProfile: (data: Partial<User>) => Promise<void>;
  clearError: () => void;
  bootstrapSession: () => Promise<void>;
}

interface RegisterData {
  email: string;
  password: string;
  full_name: string;
  phone?: string;
  role?: "student" | "company";
  company_name?: string;
  company_website?: string;
}

// =============================================================================
// STORE
// =============================================================================

export const useAuthStore = create<AuthState>()(
  persist(
    immer((set, get) => ({
      // Initial state
      user: null,
      isAuthenticated: false,
      hasHydrated: false,
      isLoading: false,
      error: null,

      // Set user
      setUser: (user) =>
        set((state) => {
          state.user = sanitizeUserForClient(user);
          state.isAuthenticated = !!user;
        }),

      // Persist hydration gate (prevents redirect-to-login flashes on refresh).
      setHasHydrated: (value) =>
        set((state) => {
          state.hasHydrated = value;
        }),

      // Login
      login: async (email, password) => {
        set((state) => {
          state.isLoading = true;
          state.error = null;
        });

        try {
          const res = await fetch(`${API_BASE_URL}/auth/login`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            credentials: "include",
            body: JSON.stringify({ email, password }),
          });

          if (!res.ok) {
            const msg = await parseApiError(res);
            throw new Error(msg);
          }

          const data = await res.json();
          applyAuthResponse(set, data);
        } catch (error: any) {
          set((state) => {
            state.isLoading = false;
            state.error = error.message || "Login failed";
          });
          throw error;
        }
      },

      // Register
      register: async (data) => {
        set((state) => {
          state.isLoading = true;
          state.error = null;
        });

        try {
          const res = await fetch(`${API_BASE_URL}/auth/register`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            credentials: "include",
            body: JSON.stringify(data),
          });

          if (!res.ok) {
            const msg = await parseApiError(res);
            throw new Error(msg);
          }

          const resp = await res.json();
          applyAuthResponse(set, resp);
        } catch (error: any) {
          set((state) => {
            state.isLoading = false;
            state.error = error.message || "Registration failed";
          });
          throw error;
        }
      },

      // Logout — clears httpOnly cookies on the server, then clears the
      // in-memory user. No token reading because there is none.
      logout: async () => {
        set((state) => {
          state.isLoading = true;
          state.error = null;
        });

        try {
          await fetch(`${API_BASE_URL}/auth/logout`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            credentials: "include",
            body: "{}",
          });
        } catch {
          // ignore — local state still gets cleared
        } finally {
          set((state) => {
            state.user = null;
            state.isAuthenticated = false;
            state.isLoading = false;
            state.error = null;
          });
        }
      },

      // Refresh access token via the httpOnly refresh cookie. Returns true on
      // success (cookie was renewed by the server), false on failure. No
      // token value flows through JavaScript.
      refreshAccessToken: async () => {
        try {
          const res = await fetch(`${API_BASE_URL}/auth/refresh`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            credentials: "include",
            body: "{}",
          });

          if (!res.ok) {
            throw new Error(await parseApiError(res));
          }

          const data = await res.json();
          applyAuthResponse(set, data);
          return true;
        } catch {
          // If refresh fails, logout
          await get().logout();
          return false;
        }
      },

      // Update profile — cookie auth via credentials: include. No Bearer.
      updateProfile: async (data) => {
        set((state) => {
          state.isLoading = true;
          state.error = null;
        });

        try {
          const res = await fetch(`${API_BASE_URL}/users/me`, {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            credentials: "include",
            body: JSON.stringify(data),
          });

          if (!res.ok) {
            const msg = await parseApiError(res);
            throw new Error(msg);
          }

          const updated = await res.json();
          const user = sanitizeUserForClient(
            (extractMeUser(updated) ?? extractUser(updated) ?? updated) as User
          );

          set((state) => {
            state.user = user;
            state.isLoading = false;
          });
        } catch (error: any) {
          set((state) => {
            state.isLoading = false;
            state.error = error.message || "Update failed";
          });
          throw error;
        }
      },

      // Clear error
      clearError: () =>
        set((state) => {
          state.error = null;
        }),

      bootstrapSession: async () => {
        // Always refresh on app load: a persisted `isAuthenticated` from
        // localStorage doesn't guarantee a valid (10-min) access cookie, so
        // we exchange the 7-day refresh cookie for a fresh access cookie and
        // authoritative user. On failure we leave state as-is (no logout) so
        // a transient network error doesn't bounce the user.
        try {
          const res = await fetch(`${API_BASE_URL}/auth/refresh`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            credentials: "include",
            body: "{}",
          });
          if (!res.ok) return;
          const data = await res.json();
          applyAuthResponse(set, data);
        } catch {
          // ignore bootstrap failures
        }
      },
    })),
    {
      name: "auth-storage",
      storage: createJSONStorage(() => localStorage),
      version: 3,
      // SECURITY INVARIANT (Stage 2 — cookie-only auth):
      // Tokens MUST NEVER appear in localStorage, sessionStorage, in-memory
      // state, JS-readable cookies, or Authorization headers from the
      // browser. Cookies set by the backend (AUTH_ACCESS_COOKIE_NAME /
      // AUTH_REFRESH_COOKIE_NAME, both httpOnly) are the single source of
      // truth for browser auth. Mobile / API clients can still pass Bearer
      // tokens — the backend supports both paths via get_current_user.
      // Only `user` and `isAuthenticated` are persisted, and only to avoid
      // a flash of logged-out chrome on hard refresh.
      partialize: (state) => ({
        user: sanitizeUserForClient(state.user),
        isAuthenticated: state.isAuthenticated,
      }),
      migrate: (persistedState: unknown, version: number) => {
        // Defensive: strip any legacy persisted tokens from pre-v2 stores so
        // a returning visitor whose laptop has an old auth-storage payload
        // immediately stops leaking tokens via localStorage.
        if (isRecord(persistedState)) {
          if ("accessToken" in persistedState) delete (persistedState as Record<string, unknown>).accessToken;
          if ("refreshToken" in persistedState) delete (persistedState as Record<string, unknown>).refreshToken;
          if ("tokens" in persistedState) delete (persistedState as Record<string, unknown>).tokens;
        }
        void version;
        return persistedState as AuthState;
      },
      onRehydrateStorage: () => (state) => {
        const finalizeHydration = async () => {
          // Attempt silent cookie-based session restore before auth-gated redirects run.
          await state?.bootstrapSession();
          state?.setHasHydrated(true);
        };
        void finalizeHydration();
      },
    }
  )
);

// =============================================================================
// SELECTORS
// =============================================================================

export const selectUser = (state: AuthState) => state.user;
export const selectIsAuthenticated = (state: AuthState) => state.isAuthenticated;
export const selectIsLoading = (state: AuthState) => state.isLoading;
export const selectError = (state: AuthState) => state.error;
// Stage 2: browser auth is cookie-only. Kept as a stable export so any legacy
// import sites continue to type-check; always returns null because there is
// no JS-accessible access token by design.
export const selectAccessToken = (_state: AuthState): null => null;
