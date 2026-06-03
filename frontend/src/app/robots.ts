import type { MetadataRoute } from "next";

const siteUrl = process.env.NEXT_PUBLIC_FRONTEND_URL?.trim() || "http://localhost:3000";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: ["/admin", "/student", "/company"],
    },
    sitemap: `${siteUrl}/sitemap.xml`,
    host: siteUrl,
  };
}
