"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

/** Relit la page toutes les `seconds` secondes, `times` fois au plus (paiement en cours de confirmation). */
export function AutoRefresh({ seconds = 4, times = 15 }: { seconds?: number; times?: number }) {
  const router = useRouter();
  useEffect(() => {
    let n = 0;
    const t = setInterval(() => {
      n += 1;
      if (n > times) clearInterval(t);
      else router.refresh();
    }, seconds * 1000);
    return () => clearInterval(t);
  }, [router, seconds, times]);
  return null;
}
