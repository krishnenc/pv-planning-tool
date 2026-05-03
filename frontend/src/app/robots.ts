import type { MetadataRoute } from "next"

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || "https://solarmoris.mu"

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: ["/results", "/report", "/settings"],
    },
    sitemap: `${SITE_URL}/sitemap.xml`,
  }
}
