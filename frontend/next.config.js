/** @type {import('next').NextConfig} */
// deploy-trigger: keep config in watched frontend path for CI/Railway sync.
const path = require("path");

const nextConfig = {
  // Standalone output for Docker production builds (reduces image size ~70%)
  output: "standalone",

  // Enable React Strict Mode for better development experience
  reactStrictMode: true,
  poweredByHeader: false,


  // Image optimization configuration
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "lh3.googleusercontent.com",
      },
      {
        protocol: "https",
        hostname: "avatars.githubusercontent.com",
      },
      {
        protocol: "http",
        hostname: "localhost",
      },
    ],
    dangerouslyAllowSVG: false,
  },

  // Environment variables available to the browser
  env: {
    NEXT_PUBLIC_APP_NAME: "IshTop",
    NEXT_PUBLIC_APP_VERSION: "1.0.0",
  },

  // Experimental features
  experimental: {
    // Enable server actions
    serverActions: {
      bodySizeLimit: "2mb",
    },
  },

  // Headers for security
  async headers() {
    // Derive the API origin from the public env var so both dev (localhost:8000)
    // and production URLs are allowed without hardcoding.
    let apiOrigin = "";
    try {
      const raw = process.env.NEXT_PUBLIC_API_URL || "";
      if (raw) apiOrigin = new URL(raw).origin;
    } catch {}

    const isDev = process.env.NODE_ENV !== "production";
    const scriptSrc = [
      "'self'",
      "'unsafe-inline'",
      ...(isDev ? ["'unsafe-eval'"] : []),
      "https://js.stripe.com",
    ].join(" ");

    const csp = [
      "default-src 'self'",
      // Next.js inline scripts + Stripe.js
      `script-src ${scriptSrc}`,
      // Styles: inline (Next.js) + Google Fonts
      "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
      // Fonts
      "font-src 'self' https://fonts.gstatic.com",
      // Images: self + Google user avatars + data URIs
      "img-src 'self' data: blob: https://lh3.googleusercontent.com https://avatars.githubusercontent.com",
      // API + Stripe + Google OAuth
      `connect-src 'self'${apiOrigin ? ` ${apiOrigin}` : ""} https://api.stripe.com https://accounts.google.com`,
      // Stripe payment iframe
      "frame-src https://js.stripe.com https://hooks.stripe.com",
      "worker-src 'self'",
      "manifest-src 'self'",
      "object-src 'none'",
      "base-uri 'self'",
      "form-action 'self'",
      "upgrade-insecure-requests",
    ].join("; ");

    return [
      {
        source: "/:path*",
        headers: [
          { key: "X-Frame-Options", value: "DENY" },
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
          {
            key: "Strict-Transport-Security",
            value: "max-age=63072000; includeSubDomains; preload",
          },
          { key: "Content-Security-Policy", value: csp },
        ],
      },
    ];
  },

  // Redirects
  async redirects() {
    return [
      {
        source: "/dashboard",
        destination: "/student/resumes",
        permanent: false,
      },
    ];
  },

  webpack: (config) => {
    // Ensure `@/...` imports resolve in all environments (CI/Linux included).
    config.resolve.alias = {
      ...(config.resolve.alias || {}),
      "@": path.resolve(__dirname, "src"),
    };
    return config;
  },
};

module.exports = nextConfig;
