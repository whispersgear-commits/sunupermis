"use client";

import { MotionConfig } from "motion/react";

/** Respecte le réglage « réduire les animations » du système du visiteur. */
export function MotionRoot({ children }: { children: React.ReactNode }) {
  return <MotionConfig reducedMotion="user">{children}</MotionConfig>;
}
