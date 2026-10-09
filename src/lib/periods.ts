import { todayIso } from "./format";

/** Périodes proposées sur la page Paiements et pour l'export. */
export const PERIODS = [
  { key: "", label: "Ce mois" },
  { key: "mois-dernier", label: "Mois dernier" },
  { key: "3-mois", label: "3 derniers mois" },
  { key: "annee", label: "Cette année" },
  { key: "tout", label: "Tout" },
] as const;

/** Bornes [début, fin) d'une période, en dates AAAA-MM-JJ (UTC = heure de Dakar). */
export function periodRange(key: string | undefined): { from: string | null; to: string | null; label: string } {
  const today = todayIso();
  const y = Number(today.slice(0, 4));
  const m = Number(today.slice(5, 7));
  const first = (yy: number, mm: number) => {
    const d = new Date(Date.UTC(yy, mm - 1, 1));
    return d.toISOString().slice(0, 10);
  };
  const label = PERIODS.find((p) => p.key === (key ?? ""))?.label ?? "Ce mois";
  switch (key) {
    case "mois-dernier":
      return { from: first(y, m - 1), to: first(y, m), label };
    case "3-mois":
      return { from: first(y, m - 2), to: null, label };
    case "annee":
      return { from: `${y}-01-01`, to: null, label };
    case "tout":
      return { from: null, to: null, label };
    default:
      return { from: first(y, m), to: null, label: "Ce mois" };
  }
}
