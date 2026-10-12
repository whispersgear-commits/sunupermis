import "server-only";
import { timingSafeEqual } from "crypto";

/**
 * Paiement de l'abonnement par Bictorys (Wave, Orange Money, carte).
 *
 * 1. Le serveur crée une « charge » ; Bictorys rend l'adresse de sa page de
 *    paiement (`link`), où le client choisit son moyen de paiement.
 * 2. Bictorys appelle notre webhook. L'en-tête `X-Secret-Key` porte le secret
 *    du webhook en clair ; ce n'est pas une signature du contenu, donc le
 *    corps n'est jamais cru tel quel : la transaction est relue chez Bictorys
 *    (statut, montant) avant de valider quoi que ce soit.
 *
 * Variables : BICTORYS_API_KEY (clé publique), BICTORYS_WEBHOOK_SECRET,
 * BICTORYS_MODE (« live » pour la production, sinon bac à sable).
 */

function baseUrl() {
  return process.env.BICTORYS_MODE === "live" ? "https://api.bictorys.com/pay/v1" : "https://api.test.bictorys.com/pay/v1";
}

function headers() {
  return { "Content-Type": "application/json", "X-API-Key": process.env.BICTORYS_API_KEY ?? "" };
}

export function bictorysConfigured(): boolean {
  return Boolean(process.env.BICTORYS_API_KEY && process.env.BICTORYS_WEBHOOK_SECRET && process.env.PAYMENTS_SERVER_SECRET);
}

export async function createCharge(input: {
  amount: number;
  /** Notre identifiant de paiement : il revient dans le webhook. */
  merchantReference: string;
  label: string;
  successRedirectUrl: string;
  errorRedirectUrl: string;
  customer: { name: string; email?: string; phone?: string | null };
}): Promise<{ ok: true; ref: string; url: string } | { ok: false; error: string }> {
  try {
    const res = await fetch(`${baseUrl()}/charges`, {
      method: "POST",
      headers: headers(),
      body: JSON.stringify({
        amount: input.amount,
        currency: "XOF",
        country: "SN",
        paymentReference: input.label,
        merchantReference: input.merchantReference,
        successRedirectUrl: input.successRedirectUrl,
        errorRedirectUrl: input.errorRedirectUrl,
        customerObject: {
          name: input.customer.name,
          ...(input.customer.email ? { email: input.customer.email } : {}),
          ...(input.customer.phone ? { phone: `+${input.customer.phone}` } : {}),
          country: "SN",
          locale: "fr-FR",
        },
      }),
      cache: "no-store",
    });
    const body = (await res.json().catch(() => ({}))) as { link?: string; chargeId?: string; transactionId?: string; id?: string; message?: string };
    const ref = body.chargeId ?? body.transactionId ?? body.id;
    if (!res.ok || !body.link || !ref) {
      console.error("bictorys charge", res.status, JSON.stringify(body).slice(0, 500));
      return { ok: false, error: body.message ?? `Bictorys a répondu ${res.status}` };
    }
    return { ok: true, ref, url: body.link };
  } catch (e) {
    console.error("bictorys charge", e);
    return { ok: false, error: "Bictorys est injoignable pour le moment." };
  }
}

export type BictorysOutcome = "succeeded" | "failed" | "pending";

/**
 * Relit une transaction chez Bictorys. « succeeded » est le seul succès ;
 * « authorized » (montant réservé, pas encaissé) reste en attente.
 */
export async function fetchTransaction(ref: string): Promise<{ outcome: BictorysOutcome; amount: number | null; merchantReference: string | null } | null> {
  const read = async (path: string) => {
    const res = await fetch(`${baseUrl()}${path}`, { headers: headers(), cache: "no-store" });
    if (!res.ok) return null;
    return (await res.json().catch(() => null)) as Record<string, unknown> | null;
  };
  const tx = (await read(`/transactions/${encodeURIComponent(ref)}`)) ?? (await read(`/transactions/${encodeURIComponent(ref)}/status`));
  if (!tx || typeof tx.status !== "string") return null;
  const status = tx.status.trim().toLowerCase();
  const outcome: BictorysOutcome = status === "succeeded" ? "succeeded" : ["failed", "cancelled", "reversed"].includes(status) ? "failed" : "pending";
  // `amount` est indiqué net des frais : on rajoute les frais pour retrouver
  // ce que le client a payé.
  const amount = typeof tx.amount === "number" ? tx.amount + (typeof tx.merchantFees === "number" ? tx.merchantFees : 0) : null;
  return { outcome, amount, merchantReference: typeof tx.merchantReference === "string" ? tx.merchantReference : null };
}

/** Compare l'en-tête `X-Secret-Key` au secret du webhook, en temps constant. */
export function webhookSecretMatches(header: string | null): boolean {
  const secret = process.env.BICTORYS_WEBHOOK_SECRET;
  if (!secret || !header) return false;
  const a = Buffer.from(header);
  const b = Buffer.from(secret);
  return a.length === b.length && timingSafeEqual(a, b);
}
