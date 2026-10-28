/**
 * Vérification serveur des pièges de <SpamTrap /> (voir ce composant).
 * `minMs` : délai minimal entre l'affichage et l'envoi ; 0 pour ne vérifier
 * que le champ invisible (connexion : un gestionnaire de mots de passe
 * remplit et envoie très vite).
 */
export function isSpam(fd: FormData, minMs = 2000): boolean {
  if (String(fd.get("website") ?? "").trim() !== "") return true;
  const shownAt = Number(fd.get("shown_at"));
  // Sans JavaScript, l'heure manque : on laisse passer (les autres contrôles restent).
  if (!shownAt || minMs === 0) return false;
  return Date.now() - shownAt < minMs;
}
