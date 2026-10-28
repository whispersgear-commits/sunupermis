"use client";

import Image from "next/image";
import Link from "next/link";
import { m, useReducedMotion } from "motion/react";
import { ArrowRight, CalendarCheck, MessageCircle, Wallet } from "lucide-react";

/**
 * En-tête de la vitrine.
 *
 * Le mouvement raconte le produit : une route qui défile, une voiture d'auto-
 * école qui avance, et autour d'elle les trois choses que le logiciel règle
 * (planning, paiements, rappels) qui apparaissent comme des notifications.
 */

const words = ["Gérez", "votre", "auto-école", "depuis", "votre", "téléphone."];

export function Hero() {
  const reduce = useReducedMotion();

  return (
    <section className="relative overflow-hidden bg-asphalt text-white">
      {/* Halo de couleur en fond */}
      <div className="pointer-events-none absolute inset-0">
        <m.div
          className="absolute -left-40 -top-40 h-[520px] w-[520px] rounded-full bg-brand-600/30 blur-3xl"
          animate={reduce ? undefined : { x: [0, 60, 0], y: [0, 40, 0] }}
          transition={{ duration: 14, repeat: Infinity, ease: "easeInOut" }}
        />
        <m.div
          className="absolute -right-32 top-20 h-[420px] w-[420px] rounded-full bg-lane/15 blur-3xl"
          animate={reduce ? undefined : { x: [0, -50, 0], y: [0, 50, 0] }}
          transition={{ duration: 18, repeat: Infinity, ease: "easeInOut" }}
        />
      </div>

      <div className="relative mx-auto grid max-w-6xl items-center gap-12 px-4 pb-24 pt-28 sm:px-6 lg:grid-cols-[1.1fr_1fr] lg:pt-32">
        <div>
          <m.span
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/5 px-3 py-1 text-xs font-semibold text-brand-200"
          >
            <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-lane" />
            Conçu au Sénégal, pour les auto-écoles d'Afrique
          </m.span>

          <h1 className="mt-6 text-4xl font-extrabold leading-[1.08] tracking-tight sm:text-6xl">
            {words.map((word, i) => (
              <m.span
                key={i}
                className="mr-[0.25em] inline-block"
                // Le titre est visible dès le premier affichage (il compte pour la
                // vitesse perçue) ; seul un léger glissement l'anime.
                initial={{ y: 18 }}
                animate={{ y: 0 }}
                transition={{ duration: 0.6, delay: 0.15 + i * 0.08, ease: [0.22, 1, 0.36, 1] }}
              >
                {word === "auto-école" ? <span className="text-brand-400">{word}</span> : word}
              </m.span>
            ))}
          </h1>

          <m.p
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.75 }}
            className="mt-6 max-w-xl text-lg text-slate-300"
          >
            Élèves, planning des leçons, paiements en plusieurs fois, reçus et rappels WhatsApp. Fini le
            cahier, fini les impayés oubliés.
          </m.p>

          <m.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.9 }}
            className="mt-9 flex flex-wrap gap-3"
          >
            <Link
              href="/inscription"
              className="group inline-flex h-12 items-center gap-2 rounded-2xl bg-brand-600 px-6 font-semibold text-white shadow-lg shadow-brand-600/30 transition hover:bg-brand-700"
            >
              Essayer 3 jours gratuits
              <ArrowRight className="h-4 w-4 transition group-hover:translate-x-1" />
            </Link>
            <a
              href="#apercu"
              className="inline-flex h-12 items-center rounded-2xl border border-white/20 px-6 font-semibold text-white transition hover:bg-white/10"
            >
              Voir le logiciel
            </a>
          </m.div>
          <m.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 1.1 }}
            className="mt-4 text-sm text-slate-400"
          >
            3 jours gratuits · Sans moyen de paiement · Sans engagement
          </m.p>
        </div>

        <HeroVisual reduce={!!reduce} />
      </div>

      {/* La route */}
      <div className="relative h-20 bg-asphalt-2">
        <div className="lane-dashes absolute inset-x-0 top-1/2 h-1.5 -translate-y-1/2 opacity-80" />
        <m.div
          className="absolute top-1/2 -translate-y-[85%]"
          initial={{ x: "-20vw" }}
          animate={reduce ? { x: "10vw" } : { x: ["-20vw", "110vw"] }}
          transition={{ duration: 9, repeat: Infinity, ease: "linear", repeatDelay: 1 }}
        >
          <Car />
        </m.div>
      </div>
    </section>
  );
}

function HeroVisual({ reduce }: { reduce: boolean }) {
  const cards = [
    { icon: CalendarCheck, title: "Leçon faite", text: "Fatou · 08:00 avec Modou Diouf", tone: "bg-brand-500" },
    { icon: Wallet, title: "Reçu REC-2026-0019", text: "50 000 FCFA par Wave", tone: "bg-lane text-asphalt" },
    { icon: MessageCircle, title: "Rappels de demain", text: "8 élèves prévenus sur WhatsApp", tone: "bg-[#25D366]" },
  ];

  return (
    <div className="relative mx-auto w-full max-w-sm">
      {/* Téléphone */}
      <m.div
        initial={{ opacity: 0, y: 40, rotate: -4 }}
        animate={{ opacity: 1, y: 0, rotate: -2 }}
        transition={{ duration: 0.9, delay: 0.3, ease: [0.22, 1, 0.36, 1] }}
        className="relative rounded-[2.5rem] border border-white/15 bg-white/5 p-3 shadow-2xl backdrop-blur"
      >
        {/* Vraie capture du tableau de bord, données de démonstration. */}
        <div className="relative aspect-[390/640] overflow-hidden rounded-[2rem] bg-white">
          <Image
            src="/screens/m-accueil.webp"
            alt="Tableau de bord SunuPermis sur téléphone : encaissé ce mois, impayés en retard, leçons du jour, prochaine leçon"
            fill
            priority
            sizes="(max-width: 640px) 85vw, 360px"
            className="object-cover object-top"
          />
        </div>
      </m.div>

      {/* Notifications flottantes */}
      {cards.map((card, i) => (
        <m.div
          key={card.title}
          initial={{ opacity: 0, scale: 0.8, x: i % 2 ? 30 : -30 }}
          animate={
            reduce
              ? { opacity: 1, scale: 1, x: 0 }
              : { opacity: 1, scale: 1, x: 0, y: [0, -8, 0] }
          }
          transition={{
            opacity: { delay: 1.4 + i * 0.35 },
            scale: { delay: 1.4 + i * 0.35, type: "spring", stiffness: 260, damping: 18 },
            x: { delay: 1.4 + i * 0.35 },
            y: { duration: 4 + i, repeat: Infinity, ease: "easeInOut", delay: 2 + i },
          }}
          className={`absolute hidden w-56 items-center gap-3 rounded-2xl border border-white/10 bg-asphalt-2/95 p-3 shadow-xl backdrop-blur sm:flex ${
            ["-left-24 -top-8", "-right-20 top-[46%]", "-left-24 -bottom-6"][i]
          }`}
        >
          <span className={`grid h-9 w-9 shrink-0 place-items-center rounded-xl text-white ${card.tone}`}>
            <card.icon className="h-4 w-4" />
          </span>
          <span className="min-w-0">
            <span className="block text-sm font-semibold">{card.title}</span>
            <span className="block truncate text-xs text-slate-400">{card.text}</span>
          </span>
        </m.div>
      ))}
    </div>
  );
}

function Car() {
  return (
    <svg width="120" height="52" viewBox="0 0 120 52" aria-hidden>
      <path d="M8 34c0-6 4-9 10-10l14-12c3-3 7-4 11-4h28c5 0 9 2 12 5l10 11c8 1 13 4 13 10v6H8z" fill="#ffffff" />
      <path d="M38 13h16v12H26zM59 13h14c3 0 5 1 7 3l8 9H59z" fill="#93c5fd" opacity=".9" />
      <rect x="44" y="0" width="34" height="9" rx="3" fill="#facc15" />
      <text x="61" y="7.2" textAnchor="middle" fontSize="6.5" fontWeight="800" fill="#0f172a">AUTO-ÉCOLE</text>
      <rect x="8" y="30" width="108" height="5" fill="#0b8a5a" />
      <circle cx="32" cy="42" r="8" fill="#0f172a" />
      <circle cx="32" cy="42" r="3.5" fill="#cbd5e1" />
      <circle cx="94" cy="42" r="8" fill="#0f172a" />
      <circle cx="94" cy="42" r="3.5" fill="#cbd5e1" />
    </svg>
  );
}
