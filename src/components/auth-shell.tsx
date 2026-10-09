"use client";

import { motion } from "motion/react";
import { Logo } from "@/components/logo";
import { SunuAgenceBadge } from "@/components/sunu-agence-badge";

/** Écran partagé par la connexion et l'inscription : formulaire à gauche,
 *  panneau animé aux couleurs de la marque à droite. */
export function AuthShell({ title, subtitle, children, footer }: { title: string; subtitle: string; children: React.ReactNode; footer?: React.ReactNode }) {
  return (
    <div className="grid min-h-screen lg:grid-cols-2">
      <div className="flex flex-col justify-center px-6 py-12 sm:px-12">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
          className="mx-auto w-full max-w-md"
        >
          <Logo />
          <h1 className="mt-10 text-3xl font-extrabold tracking-tight">{title}</h1>
          <p className="mt-2 text-muted">{subtitle}</p>
          <div className="mt-8">{children}</div>
          {footer && <div className="mt-6 text-sm text-muted">{footer}</div>}
          <SunuAgenceBadge className="mt-12" />
        </motion.div>
      </div>

      <div className="relative hidden overflow-hidden bg-asphalt lg:block">
        <motion.div
          className="absolute -left-20 top-20 h-96 w-96 rounded-full bg-brand-600/40 blur-3xl"
          animate={{ x: [0, 40, 0], y: [0, 30, 0] }}
          transition={{ duration: 12, repeat: Infinity, ease: "easeInOut" }}
        />
        <div className="relative flex h-full flex-col justify-end p-14 text-white">
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4, duration: 0.7 }}
            className="max-w-md text-2xl font-bold leading-snug"
          >
            Le planning, les paiements et les rappels de votre auto-école, réunis sur votre téléphone.
          </motion.p>
          <p className="mt-4 text-sm text-slate-400">Fini le cahier, fini les impayés oubliés.</p>
          <div className="lane-dashes mt-12 h-1.5 w-full opacity-70" />
        </div>
      </div>
    </div>
  );
}
