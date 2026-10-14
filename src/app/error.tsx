"use client";

import { useEffect } from "react";
import Link from "next/link";
import { RotateCcw } from "lucide-react";

/** Erreur sur une page publique : message simple, réessayer ou revenir à l'accueil. */
export default function RootError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    console.error(error);
  }, [error]);
  return (
    <div className="grid min-h-screen place-items-center px-6 text-center">
      <div>
        <p className="text-6xl">🛞</p>
        <h1 className="mt-4 text-2xl font-extrabold">Petite crevaison</h1>
        <p className="mt-2 max-w-sm text-muted">La page n'a pas pu se charger. Vérifiez votre connexion internet puis réessayez.</p>
        <div className="mt-6 flex flex-wrap justify-center gap-3">
          <button onClick={reset} className="inline-flex h-11 items-center gap-2 rounded-xl bg-brand-600 px-5 font-semibold text-white transition hover:bg-brand-700">
            <RotateCcw className="h-4 w-4" /> Réessayer
          </button>
          <Link href="/" className="inline-flex h-11 items-center rounded-xl border border-line px-5 font-semibold transition hover:border-brand-600">
            Accueil
          </Link>
        </div>
        {error.digest && <p className="mt-4 text-xs text-muted">Code : {error.digest}</p>}
      </div>
    </div>
  );
}
