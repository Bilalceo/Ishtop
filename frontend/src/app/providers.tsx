/**
 * =============================================================================
 * APP PROVIDERS
 * =============================================================================
 * 
 * Client-side providers wrapper
 */

"use client";

import { ThemeProvider, useTheme } from "next-themes";
import { Toaster } from "sonner";
import { TranslationProvider } from "@/contexts/TranslationContext";

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
        {children}
      </TranslationProvider>
      <ThemedToaster />
    </ThemeProvider>
  );
}

export default Providers;













