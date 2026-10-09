/**
 * Numéros sénégalais.
 *
 * Stockés au format international sans « + » (221771234567), celui
 * qu'attend un lien wa.me. On accepte les saisies courantes : « 77 123 45 67 »,
 * « +221 77 123 45 67 », « 00221771234567 ».
 */
export function normalizePhone(input: string): string | null {
  let digits = input.replace(/\D/g, "");
  if (digits.startsWith("00")) digits = digits.slice(2);
  if (digits.length === 9) digits = `221${digits}`;
  return /^[0-9]{8,15}$/.test(digits) ? digits : null;
}

/** 221771234567 ⟶ « 77 123 45 67 ». */
export function displayPhone(phone: string): string {
  if (phone.startsWith("221") && phone.length === 12) {
    const n = phone.slice(3);
    return `${n.slice(0, 2)} ${n.slice(2, 5)} ${n.slice(5, 7)} ${n.slice(7)}`;
  }
  return `+${phone}`;
}
