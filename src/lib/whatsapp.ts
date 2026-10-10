import { money, time, day } from "./format";

/**
 * Messages WhatsApp.
 *
 * Première version : liens wa.me pré-remplis. La secrétaire clique, WhatsApp
 * s'ouvre sur la conversation de l'élève avec le message prêt. Gratuit, sans
 * validation Meta, et le message part du numéro que l'élève connaît.
 */

export function waLink(phone: string, text: string): string {
  return `https://wa.me/${phone}?text=${encodeURIComponent(text)}`;
}

const first = (name: string) => name.trim().split(/\s+/)[0];

export function lessonReminder(student: string, school: string, startsAt: string, instructor?: string | null) {
  return (
    `Bonjour ${first(student)}, rappel de votre leçon de conduite ${day(startsAt)} à ${time(startsAt)}` +
    `${instructor ? ` avec ${instructor}` : ""}. Merci de prévenir en cas d'empêchement.\n— ${school}`
  );
}

export function paymentReminder(student: string, school: string, amount: number) {
  return (
    `Bonjour ${first(student)}, petit rappel : il reste ${money(amount)} à régler sur votre forfait. ` +
    `Vous pouvez payer par Wave, Orange Money ou à l'agence. Merci !\n— ${school}`
  );
}

export function welcomeMessage(student: string, school: string) {
  return `Bienvenue ${first(student)} ! Votre inscription chez ${school} est confirmée. Nous vous enverrons ici vos rappels de leçons et d'échéances.`;
}

export function receiptMessage(student: string, school: string, receipt: string, amount: number, method: string, balance: number, verifyUrl: string) {
  return (
    `Bonjour ${first(student)}, nous confirmons la réception de votre paiement de ${money(amount)} (${method}).\n` +
    `Reçu n° ${receipt}\n` +
    `${balance > 0 ? `Reste à payer : ${money(balance)}` : "Votre forfait est entièrement payé. Merci !"}\n` +
    `Vérifier le reçu : ${verifyUrl}\n— ${school}`
  );
}
