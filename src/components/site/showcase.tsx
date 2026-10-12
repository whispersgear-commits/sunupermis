"use client";

import Image from "next/image";
import { useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { CalendarDays, LayoutDashboard, Users, Wallet } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * Le vrai logiciel, pas une maquette : captures prises dans l'application,
 * avec les données de l'auto-école de démonstration.
 */

const DESKTOP = [
  { key: "accueil", label: "Accueil", icon: LayoutDashboard, src: "/screens/d-accueil.webp", alt: "Accueil : encaissements du mois, impayés, prochaine leçon, rappels de demain", url: "app/accueil" },
  { key: "planning", label: "Planning", icon: CalendarDays, src: "/screens/d-planning.webp", alt: "Planning de la semaine par jour, moniteur et élève", url: "app/planning" },
  { key: "paiements", label: "Paiements", icon: Wallet, src: "/screens/d-paiements.webp", alt: "Paiements : encaissements par jour, retards, répartition Wave / Orange Money / espèces", url: "app/paiements" },
  { key: "eleves", label: "Élèves", icon: Users, src: "/screens/d-eleves.webp", alt: "Liste des élèves avec statut, progression et reste à payer", url: "app/eleves" },
];

const PHONES = [
  { src: "/screens/m-planning.webp", title: "Le planning dans la poche", text: "Les 7 jours en un coup d'œil, la leçon marquée « Faite » d'un doigt." },
  { src: "/screens/m-eleve.webp", title: "La fiche de chaque élève", text: "Leçons faites, reste à payer, examens. Appel ou WhatsApp en un geste." },
  { src: "/screens/m-caisse.webp", title: "La caisse du soir", text: "Espèces à remettre, Wave, Orange Money : qui a encaissé quoi." },
  { src: "/screens/m-recu.webp", title: "Un vrai reçu, avec QR code", text: "Numéroté, envoyé sur WhatsApp, vérifiable par l'élève. Impossible à falsifier.", contain: true },
];

export function Showcase() {
  const [tab, setTab] = useState(DESKTOP[0].key);
  const current = DESKTOP.find((d) => d.key === tab)!;

  return (
    <section id="apercu" className="scroll-mt-20 bg-bg py-20 sm:py-24">
      <div className="mx-auto max-w-6xl px-4 sm:px-6">
        <div className="mx-auto max-w-2xl text-center">
          <p className="text-sm font-bold uppercase tracking-widest text-brand-600">Le logiciel en vrai</p>
          <h2 className="mt-2 text-3xl font-extrabold tracking-tight sm:text-5xl">Ce que vous verrez chaque matin</h2>
          <p className="mt-4 text-lg text-muted">Pas de maquette : ce sont de vraies captures de SunuPermis, sur ordinateur et sur téléphone.</p>
        </div>

        {/* Ordinateur */}
        <div className="mt-10 flex justify-center">
          <div className="inline-flex gap-1 overflow-x-auto rounded-2xl border border-line bg-surface p-1 [scrollbar-width:none]">
            {DESKTOP.map((d) => (
              <button
                key={d.key}
                type="button"
                onClick={() => setTab(d.key)}
                aria-pressed={tab === d.key}
                className={cn("relative flex items-center gap-2 whitespace-nowrap rounded-xl px-3.5 py-2 text-sm font-semibold transition", tab === d.key ? "text-white" : "text-muted hover:text-ink")}
              >
                {tab === d.key && <motion.span layoutId="showcase-tab" className="absolute inset-0 rounded-xl bg-asphalt" transition={{ type: "spring", stiffness: 420, damping: 34 }} />}
                <d.icon className="relative h-4 w-4" />
                <span className="relative">{d.label}</span>
              </button>
            ))}
          </div>
        </div>

        <motion.div
          initial={{ opacity: 0, y: 40 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-80px" }}
          transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
          className="mx-auto mt-6 max-w-5xl overflow-hidden rounded-2xl border border-line bg-surface shadow-2xl shadow-black/10"
        >
          <div className="flex items-center gap-2 border-b border-line bg-bg px-4 py-2.5">
            <span className="h-3 w-3 rounded-full bg-[#ff5f57]" />
            <span className="h-3 w-3 rounded-full bg-[#febc2e]" />
            <span className="h-3 w-3 rounded-full bg-[#28c840]" />
            <span className="ml-3 truncate rounded-lg bg-surface px-3 py-1 text-xs text-muted">sunupermis.com/{current.url}</span>
          </div>
          <div className="relative aspect-[16/10] bg-surface">
            <AnimatePresence mode="wait" initial={false}>
              <motion.div key={current.key} className="absolute inset-0" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.25 }}>
                <Image src={current.src} alt={current.alt} fill sizes="(max-width: 1024px) 100vw, 1024px" className="object-cover object-top" />
              </motion.div>
            </AnimatePresence>
          </div>
        </motion.div>

        {/* Téléphone */}
        <div className="-mx-4 mt-16 flex snap-x snap-mandatory gap-5 overflow-x-auto px-4 pb-4 [scrollbar-width:none] sm:mx-0 sm:grid sm:grid-cols-2 sm:overflow-visible sm:px-0 lg:grid-cols-4">
          {PHONES.map((p, i) => (
            <motion.figure
              key={p.src}
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-60px" }}
              transition={{ duration: 0.6, delay: i * 0.08, ease: [0.22, 1, 0.36, 1] }}
              className="w-[72%] shrink-0 snap-center sm:w-auto"
            >
              <div className="rounded-[2.2rem] bg-asphalt p-2 shadow-xl shadow-black/15">
                <div className="relative aspect-[390/700] overflow-hidden rounded-[1.8rem] bg-white">
                  <Image src={p.src} alt={p.title} fill sizes="(max-width: 640px) 72vw, 280px" className={p.contain ? "object-contain object-top p-1" : "object-cover object-top"} />
                </div>
              </div>
              <figcaption className="mt-4 px-1">
                <p className="font-bold">{p.title}</p>
                <p className="mt-1 text-sm text-muted">{p.text}</p>
              </figcaption>
            </motion.figure>
          ))}
        </div>
        <p className="mt-6 text-center text-xs text-muted">Captures réelles de l'application, avec les données de l'auto-école de démonstration.</p>
      </div>
    </section>
  );
}
