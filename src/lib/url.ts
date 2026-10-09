/**
 * Lien vers la même page avec certains paramètres changés : `null` ou ""
 * retire le paramètre. Sert aux onglets et filtres rendus côté serveur.
 */
export function withParams(path: string, current: Record<string, string | undefined>, changes: Record<string, string | null | undefined>): string {
  const next = new URLSearchParams();
  for (const [k, v] of Object.entries({ ...current, ...changes })) {
    if (v !== null && v !== undefined && v !== "") next.set(k, v);
  }
  const qs = next.toString();
  return qs ? `${path}?${qs}` : path;
}

/** Comparaison sans accents ni majuscules, pour la recherche par nom. */
export function fold(text: string): string {
  return text.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();
}
