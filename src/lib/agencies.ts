import { can } from "./plans";
import type { School } from "./types";

/**
 * Filtre « agence » des listes (élèves, planning, paiements) : actif
 * seulement en formule Multi-agences, quand l'école a déclaré ses agences.
 */
export function agencyFilter(school: School, value: string | undefined) {
  const agencies = can(school, "agencies") ? school.agencies ?? [] : [];
  const selected = value && agencies.includes(value) ? value : null;
  return {
    enabled: agencies.length > 0,
    selected,
    options: [{ value: "", label: "Toutes les agences" }, ...agencies.map((a) => ({ value: a, label: a }))],
    /** L'élève passe-t-il le filtre ? */
    keep: (agency: string | null | undefined) => !selected || agency === selected,
  };
}
