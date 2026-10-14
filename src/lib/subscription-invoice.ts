/** Numéro de facture d'abonnement : SP-2026-0007 (continu, toutes écoles confondues). */
export function subscriptionInvoiceLabel(no: number | null, paidAt: string | null): string {
  if (!no) return "—";
  return `SP-${(paidAt ?? new Date().toISOString()).slice(0, 4)}-${String(no).padStart(4, "0")}`;
}
