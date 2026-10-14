import type { MetadataRoute } from "next";
import { LEGAL } from "@/lib/legal";

export default function sitemap(): MetadataRoute.Sitemap {
  const pages = [
    { path: "", priority: 1 },
    { path: "/inscription", priority: 0.8 },
    { path: "/connexion", priority: 0.5 },
    { path: "/conditions", priority: 0.3 },
    { path: "/confidentialite", priority: 0.3 },
    { path: "/mentions-legales", priority: 0.3 },
  ];
  return pages.map((p) => ({ url: `${LEGAL.site}${p.path}`, changeFrequency: "monthly", priority: p.priority }));
}
