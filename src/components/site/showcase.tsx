"use client";

import Image from "next/image";
import { m } from "motion/react";
import { CalendarDays, QrCode } from "lucide-react";

/**
 * Le vrai logiciel, pas une maquette : deux captures seulement, les plus
 * parlantes (le planning sur ordinateur, le reçu sur téléphone).
 */
export function Showcase() {
  return (
    <section id="apercu" className="scroll-mt-20 bg-bg py-20 sm:py-24">
      <div className="mx-auto max-w-6xl px-4 sm:px-6">
        <div className="mx-auto max-w-2xl text-center">
          <p className="text-sm font-bold uppercase tracking-widest text-brand-600">Le logiciel en vrai</p>
          <h2 className="mt-2 text-3xl font-extrabold tracking-tight sm:text-5xl">Simple, clair, sur tous les écrans</h2>
          <p className="mt-4 text-lg text-muted">De vraies captures de SunuPermis, pas des maquettes.</p>
        </div>

        <div className="relative mx-auto mt-12 max-w-5xl lg:pr-24">
          {/* Ordinateur : le planning de la semaine */}
          <m.div
            initial={{ opacity: 0, y: 40 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-80px" }}
            transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
            className="overflow-hidden rounded-2xl border border-line bg-surface shadow-2xl shadow-black/10"
          >
            <div className="flex items-center gap-2 border-b border-line bg-bg px-4 py-2.5">
              <span className="h-3 w-3 rounded-full bg-[#ff5f57]" />
              <span className="h-3 w-3 rounded-full bg-[#febc2e]" />
              <span className="h-3 w-3 rounded-full bg-[#28c840]" />
              <span className="ml-3 truncate rounded-lg bg-surface px-3 py-1 text-xs text-muted">sunupermis.com/app/planning</span>
            </div>
            <div className="relative aspect-[16/10]">
              <Image
                src="/screens/d-planning-v2.webp"
                alt="Planning de la semaine : chaque jour, les leçons avec l'heure, l'élève et le moniteur"
                fill
                sizes="(max-width: 1024px) 100vw, 900px"
                className="object-cover object-top"
              />
            </div>
          </m.div>

          {/* Le reçu avec QR code, posé sur le coin de l'écran comme une feuille */}
          <m.div
            initial={{ opacity: 0, y: 40, rotate: 0 }}
            whileInView={{ opacity: 1, y: 0, rotate: 3 }}
            viewport={{ once: true, margin: "-80px" }}
            transition={{ duration: 0.7, delay: 0.15, ease: [0.22, 1, 0.36, 1] }}
            className="mx-auto mt-8 w-52 overflow-hidden rounded-2xl border border-line bg-white shadow-2xl shadow-black/25 sm:w-56 lg:absolute lg:-bottom-16 lg:right-0 lg:mt-0"
          >
            <Image
              src="/screens/recu-qr.webp"
              alt="Reçu de paiement numéroté, avec montant en lettres et QR code de vérification"
              width={780}
              height={2061}
              sizes="224px"
              className="h-auto w-full"
            />
          </m.div>
        </div>

        <div className="mx-auto mt-14 grid max-w-3xl gap-6 sm:grid-cols-2 lg:mt-28 lg:pr-24">
          <div className="flex gap-4">
            <span className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-brand-50 text-brand-700 dark:bg-brand-900/50 dark:text-brand-200">
              <CalendarDays className="h-5 w-5" />
            </span>
            <div>
              <p className="font-bold">Toute la semaine d'un coup d'œil</p>
              <p className="mt-1 text-sm text-muted">Chaque leçon avec son élève et son moniteur. Aucun créneau en double.</p>
            </div>
          </div>
          <div className="flex gap-4">
            <span className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-amber-50 text-amber-800 dark:bg-amber-900/40 dark:text-amber-200">
              <QrCode className="h-5 w-5" />
            </span>
            <div>
              <p className="font-bold">Un vrai reçu, impossible à falsifier</p>
              <p className="mt-1 text-sm text-muted">Numéroté, envoyé sur WhatsApp, vérifiable par l'élève avec le QR code.</p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
