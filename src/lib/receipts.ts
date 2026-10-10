/**
 * Reçus et factures : numérotation et montant en toutes lettres.
 */

/** 42, 2026 ⟶ « REC-2026-0042 ». */
export function receiptLabel(no: number | null, paidAt: string): string {
  return `REC-${paidAt.slice(0, 4)}-${String(no ?? 0).padStart(4, "0")}`;
}

/** Dossier 7 ⟶ « FAC-0007 ». */
export function invoiceLabel(fileNo: number | null): string {
  return `FAC-${String(fileNo ?? 0).padStart(4, "0")}`;
}

/** Dossier 7 ⟶ « N° 0007 ». */
export function fileLabel(fileNo: number | null): string {
  return `N° ${String(fileNo ?? 0).padStart(4, "0")}`;
}

const UNITS = [
  "zéro", "un", "deux", "trois", "quatre", "cinq", "six", "sept", "huit", "neuf",
  "dix", "onze", "douze", "treize", "quatorze", "quinze", "seize", "dix-sept", "dix-huit", "dix-neuf",
];
const TENS = ["", "", "vingt", "trente", "quarante", "cinquante", "soixante", "soixante", "quatre-vingt", "quatre-vingt"];

/** 0 à 99, orthographe rectifiée de 1990 (traits d'union partout). */
function below100(n: number): string {
  if (n < 20) return UNITS[n];
  const t = Math.floor(n / 10);
  let u = n % 10;
  if (n === 71) return "soixante-et-onze";
  if (t === 7 || t === 9) u += 10; // soixante-dix, quatre-vingt-dix…
  if (u === 0) return t === 8 ? "quatre-vingts" : TENS[t];
  if (u === 1 && t !== 8 && t !== 9) return `${TENS[t]}-et-${UNITS[u]}`;
  return `${TENS[t]}-${UNITS[u]}`;
}

/** 0 à 999. `final` : « cents » ne prend un s qu'en fin de nombre. */
function below1000(n: number, final: boolean): string {
  const h = Math.floor(n / 100);
  const r = n % 100;
  const parts: string[] = [];
  if (h > 0) parts.push(h === 1 ? "cent" : `${UNITS[h]}-cent${r === 0 && final ? "s" : ""}`);
  if (r > 0 || h === 0) {
    const w = below100(r);
    // « quatre-vingts » perd son s devant « mille ».
    parts.push(!final && w === "quatre-vingts" ? "quatre-vingt" : w);
  }
  return parts.join("-");
}

/**
 * Montant en toutes lettres, comme sur un reçu manuscrit :
 * 250000 ⟶ « deux-cent-cinquante-mille ». Les FCFA n'ont pas de centimes.
 */
export function amountInWords(amount: number): string {
  const n = Math.floor(Math.abs(amount));
  if (n === 0) return "zéro";
  const billions = Math.floor(n / 1e9);
  const millions = Math.floor((n % 1e9) / 1e6);
  const thousands = Math.floor((n % 1e6) / 1e3);
  const rest = n % 1e3;
  const out: string[] = [];
  if (billions) out.push(`${below1000(billions, false)}-milliard${billions > 1 ? "s" : ""}`);
  if (millions) out.push(`${below1000(millions, false)}-million${millions > 1 ? "s" : ""}`);
  if (thousands) out.push(thousands === 1 ? "mille" : `${below1000(thousands, false)}-mille`);
  if (rest) out.push(below1000(rest, true));
  return out.join("-");
}
