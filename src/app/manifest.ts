import type { MetadataRoute } from "next";

/** Installable sur l'écran d'accueil du téléphone, comme une application. */
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "SunuPermis — gestion d'auto-école",
    short_name: "SunuPermis",
    description: "Élèves, paiements, planning et rappels WhatsApp pour les auto-écoles.",
    start_url: "/app",
    scope: "/",
    display: "standalone",
    background_color: "#ffffff",
    theme_color: "#0b8a5a",
    lang: "fr",
    icons: [
      { src: "/icon", sizes: "512x512", type: "image/png", purpose: "any" },
      { src: "/apple-icon", sizes: "180x180", type: "image/png" },
    ],
  };
}
