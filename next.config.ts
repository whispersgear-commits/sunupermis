import type { NextConfig } from "next";

// Origine de Supabase (appels du navigateur) et de l'outil de mesure d'audience.
const supabase = process.env.NEXT_PUBLIC_SUPABASE_URL ? new URL(process.env.NEXT_PUBLIC_SUPABASE_URL).origin : "";
const analytics = "https://eu.i.posthog.com https://eu-assets.i.posthog.com";

/**
 * En-têtes de sécurité, sur toutes les pages :
 * - HTTPS imposé pendant 2 ans, sous-domaines compris (HSTS) ;
 * - le site ne peut pas être affiché dans un cadre d'un autre site ;
 * - une politique de contenu qui n'autorise que nos propres scripts,
 *   Supabase et l'outil d'audience.
 */
const csp = [
  "default-src 'self'",
  `script-src 'self' 'unsafe-inline' ${analytics}`,
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data: blob:",
  "font-src 'self' data:",
  `connect-src 'self' ${supabase} ${supabase.replace("https://", "wss://")} ${analytics}`,
  "frame-ancestors 'none'",
  "base-uri 'self'",
  "form-action 'self'",
  "object-src 'none'",
  // En production (HTTPS) seulement : en local, le site tourne en HTTP.
  ...((process.env.NEXT_PUBLIC_SITE_URL ?? "").startsWith("https://") ? ["upgrade-insecure-requests"] : []),
].join("; ");

const securityHeaders = [
  { key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains; preload" },
  { key: "Content-Security-Policy", value: csp },
  { key: "X-Frame-Options", value: "DENY" },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=(), payment=(), usb=()" },
];

const nextConfig: NextConfig = {
  poweredByHeader: false,
  // Titre et description dans le <head> pour tous les visiteurs, pas
  // seulement pour les robots connus (aperçus de liens, outils d'audit).
  htmlLimitedBots: /.*/,
  async headers() {
    return [{ source: "/:path*", headers: securityHeaders }];
  },
  experimental: {
    // Une page déjà ouverte se réaffiche instantanément au retour (30 s),
    // au lieu de repasser par le serveur. Toute modification (action
    // serveur + revalidatePath) vide ce cache : rien de périmé après un clic.
    staleTimes: { dynamic: 30, static: 300 },
    // Charge seulement les icônes et fonctions utilisées.
    optimizePackageImports: ["lucide-react", "date-fns", "motion"],
  },
};

export default nextConfig;
