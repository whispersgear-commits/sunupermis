"use client";

import { useEffect } from "react";
import { hasConsent } from "./cookie-consent";

/**
 * Mesure d'audience (PostHog, hébergé dans l'Union européenne).
 *
 * Ne se charge que si :
 * - une clé est configurée (NEXT_PUBLIC_POSTHOG_KEY dans Netlify) ;
 * - le visiteur a accepté la mesure d'audience dans le bandeau cookies.
 *
 * Réglages respectueux : aucun cookie (mémoire seulement), pas de capture
 * automatique des clics ni des textes affichés (noms d'élèves, montants),
 * pas d'enregistrement de session, adresse IP non conservée.
 */
export function Analytics() {
  useEffect(() => {
    const key = process.env.NEXT_PUBLIC_POSTHOG_KEY;
    if (!key) return;
    let started = false;
    const start = async () => {
      if (started || !hasConsent("audience")) return;
      started = true;
      const { default: posthog } = await import("posthog-js");
      posthog.init(key, {
        api_host: process.env.NEXT_PUBLIC_POSTHOG_HOST || "https://eu.i.posthog.com",
        persistence: "memory",
        autocapture: false,
        capture_pageview: "history_change",
        capture_pageleave: true,
        disable_session_recording: true,
        ip: false,
      });
    };
    start();
    window.addEventListener("sp:consent", start);
    return () => window.removeEventListener("sp:consent", start);
  }, []);
  return null;
}
