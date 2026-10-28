"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { AnimatePresence, m } from "motion/react";
import { Cookie, Lock, X } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * Consentement aux cookies.
 *
 * SunuPermis n'utilise aujourd'hui que des cookies strictement nécessaires
 * (connexion, sécurité, ce choix lui-même). Le choix « mesure d'audience »
 * est enregistré pour être respecté si un tel outil est ajouté un jour :
 * tout script de ce type devra vérifier `hasConsent("audience")` avant de
 * se charger.
 *
 * Le choix est gardé 6 mois dans le cookie `sp_consent`, lisible aussi par
 * le serveur. Un événement `sp:cookies` rouvre les réglages.
 */

const COOKIE = "sp_consent";
const VERSION = 1;
const MAX_AGE = 60 * 60 * 24 * 182;

type Choice = { v: number; audience: boolean; at: string };

function read(): Choice | null {
  const raw = document.cookie.split("; ").find((c) => c.startsWith(`${COOKIE}=`));
  if (!raw) return null;
  try {
    const c = JSON.parse(decodeURIComponent(raw.slice(COOKIE.length + 1))) as Choice;
    return c.v === VERSION ? c : null;
  } catch {
    return null;
  }
}

function save(audience: boolean) {
  const value: Choice = { v: VERSION, audience, at: new Date().toISOString() };
  const secure = location.protocol === "https:" ? "; Secure" : "";
  document.cookie = `${COOKIE}=${encodeURIComponent(JSON.stringify(value))}; Max-Age=${MAX_AGE}; Path=/; SameSite=Lax${secure}`;
}

export function hasConsent(kind: "audience"): boolean {
  if (typeof document === "undefined") return false;
  return read()?.[kind] === true;
}

export function openCookieSettings() {
  window.dispatchEvent(new Event("sp:cookies"));
}

export function CookieConsent() {
  const [banner, setBanner] = useState(false);
  const [settings, setSettings] = useState(false);
  const [audience, setAudience] = useState(false);

  useEffect(() => {
    const c = read();
    if (!c) {
      setBanner(true);
      return;
    }
    setAudience(c.audience);
  }, []);

  useEffect(() => {
    const open = () => {
      setAudience(read()?.audience ?? false);
      setSettings(true);
    };
    window.addEventListener("sp:cookies", open);
    return () => window.removeEventListener("sp:cookies", open);
  }, []);

  function decide(value: boolean) {
    save(value);
    window.dispatchEvent(new Event("sp:consent"));
    setAudience(value);
    setBanner(false);
    setSettings(false);
  }

  return (
    <>
      <AnimatePresence>
        {banner && !settings && (
          <m.div
            role="region"
            aria-label="Cookies"
            initial={{ opacity: 0, y: 40 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 40 }}
            transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
            className="fixed inset-x-3 bottom-3 z-[60] mx-auto max-w-3xl rounded-3xl border border-line bg-surface p-5 shadow-2xl shadow-black/20 sm:inset-x-6 sm:bottom-6 sm:p-6"
          >
            <div className="flex gap-4">
              <span className="hidden h-11 w-11 shrink-0 place-items-center rounded-2xl bg-brand-50 text-brand-700 sm:grid dark:bg-brand-900/40 dark:text-brand-200">
                <Cookie className="h-5 w-5" />
              </span>
              <div className="min-w-0">
                <p className="font-bold">Nous respectons votre vie privée</p>
                <p className="mt-1 text-sm text-muted">
                  Cookies nécessaires au site, et mesure d'audience anonyme seulement avec votre accord.{" "}
                  <Link href="/confidentialite#cookies" className="font-semibold text-brand-700 hover:underline">
                    En savoir plus
                  </Link>
                </p>
              </div>
            </div>
            <div className="mt-4 flex flex-col-reverse gap-2 sm:flex-row sm:items-center sm:justify-end">
              <button
                type="button"
                onClick={() => setSettings(true)}
                className="h-11 rounded-xl px-4 text-sm font-semibold text-muted transition hover:text-ink sm:mr-auto"
              >
                Personnaliser
              </button>
              <button type="button" onClick={() => decide(false)} className="h-11 rounded-xl border border-line px-5 text-sm font-semibold transition hover:border-brand-600 hover:text-brand-700">
                Refuser
              </button>
              <button
                type="button"
                onClick={() => decide(true)}
                className="h-11 rounded-xl bg-brand-600 px-5 text-sm font-semibold text-white shadow-lg shadow-brand-600/25 transition hover:bg-brand-700"
              >
                Tout accepter
              </button>
            </div>
          </m.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {settings && (
          <m.div className="fixed inset-0 z-[70] grid place-items-end bg-black/50 p-3 backdrop-blur-sm sm:place-items-center" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            <m.div
              role="dialog"
              aria-modal="true"
              aria-labelledby="cookie-title"
              initial={{ opacity: 0, y: 30, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 30 }}
              transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
              className="w-full max-w-lg rounded-3xl border border-line bg-surface p-6 shadow-2xl"
            >
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p id="cookie-title" className="text-lg font-bold">
                    Préférences de cookies
                  </p>
                  <p className="mt-1 text-sm text-muted">Choisissez ce que vous acceptez. Vous pouvez changer d'avis à tout moment, en bas de chaque page.</p>
                </div>
                <button type="button" onClick={() => setSettings(false)} aria-label="Fermer" className="grid h-9 w-9 shrink-0 place-items-center rounded-xl text-muted hover:bg-bg hover:text-ink">
                  <X className="h-5 w-5" />
                </button>
              </div>

              <div className="mt-5 space-y-3">
                <Category title="Strictement nécessaires" text="Connexion à votre espace, sécurité, mémorisation de ce choix. Indispensables : ils ne peuvent pas être désactivés.">
                  <span className="inline-flex shrink-0 items-center gap-1.5 whitespace-nowrap rounded-full bg-brand-50 px-3 py-1 text-xs font-semibold text-brand-700 dark:bg-brand-900/40 dark:text-brand-200">
                    <Lock className="h-3.5 w-3.5" /> Toujours actifs
                  </span>
                </Category>
                <Category
                  title="Mesure d'audience"
                  text={
                    process.env.NEXT_PUBLIC_POSTHOG_KEY
                      ? "Statistiques de visite anonymes (PostHog, hébergé dans l'Union européenne), pour savoir quelles pages sont utiles. Sans cookie, adresse IP non conservée, aucun texte saisi n'est enregistré."
                      : "Statistiques de visite anonymes, pour savoir quelles pages sont utiles. Aucun outil de ce type n'est actif aujourd'hui : votre choix sera respecté si nous en ajoutons un."
                  }
                >
                  <Toggle checked={audience} onChange={setAudience} label="Mesure d'audience" />
                </Category>
                <Category title="Publicité" text="SunuPermis n'affiche aucune publicité et n'utilise aucun traceur publicitaire ni de réseau social.">
                  <span className="text-xs font-semibold text-muted">Jamais utilisés</span>
                </Category>
              </div>

              <div className="mt-6 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
                <button type="button" onClick={() => decide(false)} className="h-11 rounded-xl border border-line px-5 text-sm font-semibold transition hover:border-brand-600 hover:text-brand-700">
                  Tout refuser
                </button>
                <button
                  type="button"
                  onClick={() => decide(audience)}
                  className="h-11 rounded-xl bg-brand-600 px-5 text-sm font-semibold text-white shadow-lg shadow-brand-600/25 transition hover:bg-brand-700"
                >
                  Enregistrer mes choix
                </button>
              </div>
            </m.div>
          </m.div>
        )}
      </AnimatePresence>
    </>
  );
}

function Category({ title, text, children }: { title: string; text: string; children: React.ReactNode }) {
  return (
    <div className="rounded-2xl border border-line bg-bg p-4">
      <div className="flex items-center justify-between gap-4">
        <p className="font-semibold">{title}</p>
        {children}
      </div>
      <p className="mt-1.5 text-sm text-muted">{text}</p>
    </div>
  );
}

function Toggle({ checked, onChange, label }: { checked: boolean; onChange: (v: boolean) => void; label: string }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      onClick={() => onChange(!checked)}
      className={cn("relative h-7 w-12 shrink-0 rounded-full transition", checked ? "bg-brand-600" : "bg-line")}
    >
      <span className={cn("absolute top-1 h-5 w-5 rounded-full bg-white shadow transition-all", checked ? "left-6" : "left-1")} />
    </button>
  );
}

/** Lien « Gérer les cookies », dans les liens légaux de chaque page. */
export function CookieSettingsLink({ className }: { className?: string }) {
  return (
    <button type="button" onClick={openCookieSettings} className={cn("hover:text-ink hover:underline", className)}>
      Gérer les cookies
    </button>
  );
}
