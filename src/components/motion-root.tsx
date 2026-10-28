"use client";

import { LazyMotion, MotionConfig } from "motion/react";

const loadFeatures = () => import("./motion-features").then((mod) => mod.default);

/**
 * Animations : les composants `m.*` sont légers ; le moteur se charge après
 * l'affichage (LazyMotion), ce qui accélère le premier rendu sur téléphone.
 * Respecte aussi le réglage « réduire les animations » du visiteur.
 */
export function MotionRoot({ children }: { children: React.ReactNode }) {
  return (
    <LazyMotion features={loadFeatures}>
      <MotionConfig reducedMotion="user">{children}</MotionConfig>
    </LazyMotion>
  );
}
