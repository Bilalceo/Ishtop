/**
 * =============================================================================
 * APP PROVIDERS
 * =============================================================================
 * 
 * Client-side providers wrapper
 */

"use client";

import { useEffect } from "react";
import { ThemeProvider, useTheme } from "next-themes";
import { Toaster } from "sonner";
import { TranslationProvider } from "@/contexts/TranslationContext";
import { useAuthStore } from "@/store/authStore";

/**
 * Restore the session on every app load. The access cookie is short-lived
 * (10 min) but the refresh cookie lasts 7 days, so calling /auth/refresh once
 * on mount keeps returning visitors logged in instead of bouncing them to the
 * login page. Runs once; no-op if already authenticated.
 */
function SessionBootstrap() {
  const bootstrapSession = useAuthStore((s) => s.bootstrapSession);
  useEffect(() => {
    void bootstrapSession();
  }, [bootstrapSession]);
  return null;
}

function ThemedToaster() {
  const { resolvedTheme } = useTheme();
  return (
    <Toaster
      position="top-right"
      theme={resolvedTheme === "dark" ? "dark" : "light"}
      toastOptions={{ className: "font-sans" }}
    />
  );
}

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <ThemeProvider
      attribute="class"
      defaultTheme="system"
      enableSystem
      disableTransitionOnChange
    >
      <TranslationProvider>
        <SessionBootstrap />
        {children}
      </TranslationProvider>
      <ThemedToaster />
    </ThemeProvider>
  );
}

export default Providers;













