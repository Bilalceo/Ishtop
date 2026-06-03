/**
 * =============================================================================
 * useAuth Hook (REAL BACKEND)
 * =============================================================================
 *
 * Single source of truth: Zustand `useAuthStore`.
 * Pages/components use this hook for routing + convenience helpers.
 */

"use client";

import { useCallback, useEffect, useMemo } from "react";
import { useRouter } from "next/navigation";
import type { User } from "@/types/api";
import { useAuthStore } from "@/store/authStore";
import { getApiBaseUrl } from "@/lib/runtime-config";

const API_BASE_URL = getApiBaseUrl();

async function parseApiError(res: Response): Promise<string> {
  try {
    const data = await res.json();
    if (typeof data?.detail === "string") return data.detail;
    if (typeof data?.message === "string") return data.message;
    return `Request failed (${res.status})`;
  } catch {
    return `Request failed (${res.status})`;
  }
}

export function useRequireAuth(requiredRole?: "student" | "company" | "admin") {
  const router = useRouter();
  const { isAuthenticated, user, hasHydrated } = useAuthStore();

  // Lightweight client-side gate (server-side protection is still on API).
  useEffect(() => {
    if (!hasHydrated) return;
    if (!isAuthenticated) {
      router.replace("/login?session_expired=true");
      return;
    }
    if (requiredRole && user?.role && user.role !== requiredRole) {
      const roleRoot = user.role === "company" ? "/company" : user.role === "admin" ? "/admin" : "/student";
      router.replace(roleRoot);
    }
  }, [hasHydrated, isAuthenticated, requiredRole, router, user?.role]);

  return { isLoading: !hasHydrated, isAuthorized: hasHydrated && !!isAuthenticated };
}

export function useAuth() {
  const router = useRouter();

  const user = useAuthStore((s) => s.user);
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const isLoading = useAuthStore((s) => s.isLoading);
  const error = useAuthStore((s) => s.error);
  const clearError = useAuthStore((s) => s.clearError);

  const storeLogin = useAuthStore((s) => s.login);
  const storeRegister = useAuthStore((s) => s.register);
  const storeLogout = useAuthStore((s) => s.logout);
  const updateProfile = useAuthStore((s) => s.updateProfile);

  const login = useCallback(
    async (credentials: { email: string; password: string }, redirectTo?: string) => {
      await storeLogin(credentials.email, credentials.password);
      const role = useAuthStore.getState().user?.role;
      const roleRoot = role === "company" ? "/company" : role === "admin" ? "/admin" : "/student";
      router.push(redirectTo || roleRoot);
    },
    [router, storeLogin]
  );

  const register = useCallback(
    async (data: {
      email: string;
      password: string;
      full_name: string;
      phone?: string;
      role?: "student" | "company";
      company_name?: string;
    }) => {
      await storeRegister(data as any);
    },
    [storeRegister]
  );

  const logout = useCallback(async () => {
    await storeLogout();
    router.push("/login");
  }, [router, storeLogout]);

  const changePassword = useCallback(async (oldPassword: string, newPassword: string) => {
    // Cookie auth: credentials: include sends httpOnly access_token cookie.
    const res = await fetch(`${API_BASE_URL}/auth/change-password`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ current_password: oldPassword, new_password: newPassword }),
    });

    if (!res.ok) {
      throw new Error(await parseApiError(res));
    }
  }, []);

  const requestPasswordReset = useCallback(async (email: string) => {
    const res = await fetch(`${API_BASE_URL}/auth/forgot-password`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ email }),
    });

    if (!res.ok) {
      throw new Error(await parseApiError(res));
    }

    const data = await res.json();
    return {
      message: typeof data?.message === "string" ? data.message : "",
      debug_reset_url:
        typeof data?.debug_reset_url === "string" ? data.debug_reset_url : null,
    };
  }, []);

  const isStudent = user?.role === "student";
  const isCompany = user?.role === "company";
  const isAdmin = user?.role === "admin";

  return useMemo(
    () => ({
      user: user as User | null,
      isAuthenticated,
      isLoading,
      error,
      clearError,
      login,
      register,
      logout,
      updateUser: updateProfile,
      changePassword,
      requestPasswordReset,
      isStudent,
      isCompany,
      isAdmin,
    }),
    [
      user,
      isAuthenticated,
      isLoading,
      error,
      clearError,
      login,
      register,
      logout,
      updateProfile,
      changePassword,
      requestPasswordReset,
      isStudent,
      isCompany,
      isAdmin,
    ]
  );
}

export default useAuth;
