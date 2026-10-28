"use client";

import { useEffect, useState } from "react";

/**
 * Anti-spam sans captcha, à placer dans un formulaire public :
 * - un champ « site web » invisible, que seuls les robots remplissent ;
 * - l'heure d'affichage du formulaire : un envoi trop rapide (moins de
 *   2 secondes) ne peut pas venir d'une personne.
 * Le serveur vérifie les deux avec `isSpam` (lib/spam.ts).
 */
export function SpamTrap() {
  const [shownAt, setShownAt] = useState("");
  useEffect(() => setShownAt(String(Date.now())), []);
  return (
    <div aria-hidden="true" style={{ position: "absolute", left: "-10000px", width: 1, height: 1, overflow: "hidden" }}>
      <label>
        Site web
        <input type="text" name="website" tabIndex={-1} autoComplete="off" defaultValue="" />
      </label>
      <input type="hidden" name="shown_at" value={shownAt} />
    </div>
  );
}
