import type { MetadataRoute } from "next";
import { loadFounders } from "@/lib/data";

const BASE = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3741";

export default function sitemap(): MetadataRoute.Sitemap {
  return [
    { url: `${BASE}/`, changeFrequency: "hourly", priority: 1 },
    { url: `${BASE}/methodology`, changeFrequency: "monthly", priority: 0.8 },
    { url: `${BASE}/about`, changeFrequency: "monthly", priority: 0.5 },
    ...Object.keys(loadFounders()).map((slug) => ({
      url: `${BASE}/founder/${slug}`,
      changeFrequency: "daily" as const,
      priority: 0.7,
    })),
  ];
}
