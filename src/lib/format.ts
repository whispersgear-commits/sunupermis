import { format, formatDistanceToNowStrict } from "date-fns";
import { fr } from "date-fns/locale";

/**
 * Formats d'affichage.
 *
 * Le Sénégal vit à UTC+0 toute l'année, sans heure d'été : le serveur
 * (en UTC) et le navigateur d'un utilisateur au Sénégal affichent la même
 * heure. Les montants sont des FCFA entiers.
 */

export function money(amount: number): string {
  const digits = Math.abs(Math.round(amount)).toString();
  let out = "";
  for (let i = 0; i < digits.length; i += 1) {
    if (i > 0 && (digits.length - i) % 3 === 0) out += " ";
    out += digits[i];
  }
  return `${amount < 0 ? "-" : ""}${out} FCFA`;
}

export function day(value: string | Date): string {
  return format(new Date(value), "EEEE d MMMM", { locale: fr });
}

export function shortDate(value: string | Date): string {
  return format(new Date(value), "d MMM yyyy", { locale: fr });
}

export function time(value: string | Date): string {
  return format(new Date(value), "HH:mm");
}

export function fromNow(value: string | Date): string {
  return formatDistanceToNowStrict(new Date(value), { locale: fr, addSuffix: true });
}

/** Lit un entier saisi (« 150 000 », « 150000 ») ; 0 si illisible. */
export function parseAmount(input: FormDataEntryValue | null): number {
  const n = Number(String(input ?? "").replace(/[^\d]/g, ""));
  return Number.isFinite(n) ? n : 0;
}

/** Date du jour au format AAAA-MM-JJ, en UTC (= heure du Sénégal). */
export function todayIso(): string {
  return new Date().toISOString().slice(0, 10);
}

const MONTHS = ["janvier", "février", "mars", "avril", "mai", "juin", "juillet", "août", "septembre", "octobre", "novembre", "décembre"];

/** « 2026-11-09 » ⟶ « 9 novembre », identique sur le serveur et le
 *  navigateur (pas de dépendance aux données de langue du système). */
export function dayMonth(iso: string): string {
  return `${Number(iso.slice(8, 10))} ${MONTHS[Number(iso.slice(5, 7)) - 1]}`;
}

/** 150000 ⟶ « 150 000 ». */
export function groupDigits(n: number): string {
  return money(n).replace(" FCFA", "");
}

const MONTHS_SHORT = ["janv.", "févr.", "mars", "avr.", "mai", "juin", "juil.", "août", "sept.", "oct.", "nov.", "déc."];
const WEEKDAYS = ["dimanche", "lundi", "mardi", "mercredi", "jeudi", "vendredi", "samedi"];

/** « 2026-10-09 » ⟶ « 9 oct. ». */
export function dayShort(iso: string): string {
  return `${Number(iso.slice(8, 10))} ${MONTHS_SHORT[Number(iso.slice(5, 7)) - 1]}`;
}

/** « 2026-10-09 » ⟶ « jeudi ». Calculé en UTC (= heure du Sénégal). */
export function weekday(iso: string): string {
  return WEEKDAYS[new Date(`${iso.slice(0, 10)}T00:00:00Z`).getUTCDay()];
}

/** « 2026-10-09 » ⟶ « jeudi 9 octobre ». */
export function longDay(iso: string): string {
  return `${weekday(iso)} ${dayMonth(iso)}`;
}

/** Décale une date AAAA-MM-JJ de `n` jours. */
export function addDaysIso(iso: string, n: number): string {
  const d = new Date(`${iso.slice(0, 10)}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
}

/** Lundi de la semaine d'une date AAAA-MM-JJ. */
export function mondayOf(iso: string): string {
  const dow = new Date(`${iso.slice(0, 10)}T00:00:00Z`).getUTCDay();
  return addDaysIso(iso, dow === 0 ? -6 : 1 - dow);
}
