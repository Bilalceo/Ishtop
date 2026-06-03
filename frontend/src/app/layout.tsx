/**
 * =============================================================================
 * SMARTCAREER AI - Root Layout
 * =============================================================================
 */

import type { Metadata, Viewport } from "next";
import { Inter, Fira_Code, Fraunces, Poppins, Lora } from "next/font/google";
import { Providers } from "./providers";
import ServiceWorkerRegistrar from "@/components/pwa/ServiceWorkerRegistrar";
import InstallPrompt from "@/components/pwa/InstallPrompt";
import "./globals.css";

// Subsetted + preloaded display weights only — saves ~120KB on first paint.
const inter = Inter({
  subsets: ["latin", "latin-ext", "cyrillic"],
  variable: "--font-inter",
  display: "swap",
  preload: true,
  weight: ["400", "500", "600", "700"],
  fallback: ["system-ui", "-apple-system", "Segoe UI", "Roboto", "sans-serif"],
  adjustFontFallback: true,
});

// Mono only used in design system + code blocks — deferred load.
const firaCode = Fira_Code({
  subsets: ["latin"],
  variable: "--font-fira-code",
  display: "swap",
  preload: false,
  weight: ["400", "500"],
});

// Editorial serif — only used on /about. Variable font (no explicit weights so
// axes can be used). Deferred to keep landing critical path small.
const fraunces = Fraunces({
  subsets: ["latin", "latin-ext"],
  variable: "--font-fraunces",
  display: "swap",
  preload: false,
  style: ["normal", "italic"],
  axes: ["opsz", "SOFT"],
});

// Claude/Anthropic brand fonts — only used on /ai page. Deferred.
const poppins = Poppins({
  subsets: ["latin", "latin-ext"],
  variable: "--font-poppins",
  display: "swap",
  preload: false,
  weight: ["400", "500", "600", "700"],
});
const lora = Lora({
  subsets: ["latin", "latin-ext"],
  variable: "--font-lora",
  display: "swap",
  preload: false,
  style: ["normal", "italic"],
});

const frontendBaseUrl =
  process.env.NEXT_PUBLIC_FRONTEND_URL?.trim() || "http://localhost:3000";

export const metadata: Metadata = {
  metadataBase: new URL(frontendBaseUrl),
  title: {
    default: "IshTop - AI-Powered Career Platform",
    template: "%s | IshTop",
  },
  description:
    "Build stunning resumes with AI, find your dream job, and accelerate your career with IshTop.",
  keywords: [
    "AI resume builder",
    "job search",
    "career platform",
    "resume generator",
    "job matching",
    "career development",
  ],
  authors: [{ name: "IshTop Team" }],
  manifest: "/manifest.json",
  applicationName: "IshTop",
  appleWebApp: {
    capable: true,
    title: "IshTop",
    statusBarStyle: "default",
  },
  icons: {
    icon: [
      { url: "/favicon-32x32.png", sizes: "32x32", type: "image/png" },
      { url: "/favicon-16x16.png", sizes: "16x16", type: "image/png" },
    ],
    apple: "/apple-touch-icon.png",
  },
  openGraph: {
    type: "website",
    locale: "en_US",
    url: "https://ishtop.uz",
    siteName: "IshTop",
    title: "IshTop - AI-Powered Career Platform",
    description: "Build stunning resumes with AI and find your dream job.",
    images: [
      {
        url: "/og-image.png",
        width: 1200,
        height: 630,
        alt: "IshTop",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "IshTop",
    description: "Build stunning resumes with AI and find your dream job.",
    images: ["/og-image.png"],
  },
  robots: {
    index: true,
    follow: true,
  },
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#FAFBFE" },
    { media: "(prefers-color-scheme: dark)", color: "#0B1020" },
  ],
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="uz"
      suppressHydrationWarning
      className={`${inter.variable} ${firaCode.variable} ${fraunces.variable} ${poppins.variable} ${lora.variable}`}
    >
      <head>
        {/* Resource hints — speed up first request to API + fonts */}
        <link rel="dns-prefetch" href="https://fonts.gstatic.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        {process.env.NEXT_PUBLIC_API_URL && (
          <link rel="preconnect" href={process.env.NEXT_PUBLIC_API_URL} crossOrigin="anonymous" />
        )}
        {/* Color scheme hint — prevents FOUC + lets browser tint scrollbars */}
        <meta name="color-scheme" content="light dark" />
      </head>
      <body className="min-h-screen scroll-smooth bg-background text-foreground font-sans antialiased">
        <Providers>{children}</Providers>
        <ServiceWorkerRegistrar />
        <InstallPrompt />
      </body>
    </html>
  );
}


