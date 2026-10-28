"use client";

import { m } from "motion/react";

/** Transition entre les pages de l'espace : un léger fondu vers le haut. */
export default function Template({ children }: { children: React.ReactNode }) {
  return (
    <m.div initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.18, ease: [0.22, 1, 0.36, 1] }}>
      {children}
    </m.div>
  );
}
