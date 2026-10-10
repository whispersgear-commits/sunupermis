"use client";

import { Printer } from "lucide-react";

/** Ouvre l'impression du navigateur : « Enregistrer en PDF » y est proposé. */
export function PrintButton({ label = "Imprimer / PDF" }: { label?: string }) {
  return (
    <button
      type="button"
      onClick={() => window.print()}
      className="inline-flex h-10 items-center gap-2 rounded-xl border border-line bg-surface px-4 text-sm font-semibold transition hover:border-brand-600 hover:text-brand-700"
    >
      <Printer className="h-4 w-4" /> {label}
    </button>
  );
}
