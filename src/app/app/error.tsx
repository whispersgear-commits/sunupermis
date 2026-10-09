"use client";

import { useEffect } from "react";
import { RotateCcw } from "lucide-react";

/** Une page a planté : on le dit simplement et on propose de réessayer. */
export default function AppError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="grid place-items-center py-24 text-center">
      <div>
        <p className="text-5xl">🛞</p>
        <h1 className="mt-4 text-2xl font-extrabold">Petite crevaison</h1>
        <p className="mt-2 max-w-sm text-muted">La page n'a pas pu se charger. Vérifiez votre connexion internet puis réessayez.</p>
        <button
          onClick={reset}
          className="mt-6 inline-flex h-11 items-center gap-2 rounded-xl bg-brand-600 px-5 font-semibold text-white transition hover:bg-brand-700"
        >
          <RotateCcw className="h-4 w-4" /> Réessayer
        </button>
        {error.digest && <p className="mt-4 text-xs text-muted">Code : {error.digest}</p>}
      </div>
    </div>
  );
}
