import type { MetadataRoute } from "next";
import { LEGAL } from "@/lib/legal";

/** Le site public est indexé ; l'espace des auto-écoles ne l'est pas. */
export default function robots(): MetadataRoute.Robots {
  return {
    rules: { userAgent: "*", allow: "/", disallow: ["/app", "/api", "/auth", "/bienvenue", "/rejoindre", "/recu", "/reinitialiser"] },
    sitemap: `${LEGAL.site}/sitemap.xml`,
  };
}
