import "server-only";
import { randomUUID } from "crypto";
import { createClient as createAnonClient } from "@supabase/supabase-js";
import { createClient } from "./supabase/server";
import { createCharge, fetchTransaction } from "./bictorys";
import { PLANS, planPrice, type PlanId } from "./plans";
import type { Context } from "./session";

/**
 * Abonnement : ouverture d'un paiement Bictorys et validation.
 *
 * La validation passe par des fonctions de la base protégées par un secret
 * du serveur (PAYMENTS_SERVER_SECRET) : pas besoin de la clé de service
 * Supabase, et aucun utilisateur ne peut s'offrir un abonnement.
 */

export function parsePlan(plan: string | null | undefined): PlanId | null {
  return plan && plan in PLANS ? (plan as PlanId) : null;
}

export async function openCheckout(ctx: Context, plan: PlanId, months: 1 | 12, origin: string) {
  const id = randomUUID();
  const amount = planPrice(plan, months);
  const charge = await createCharge({
    amount,
    merchantReference: id,
    label: `SunuPermis ${PLANS[plan].name} · ${months === 12 ? "1 an" : "1 mois"} · ${ctx.school.name}`.slice(0, 120),
    successRedirectUrl: `${origin}/app/abonnement?paiement=ok&ref=${id}`,
    errorRedirectUrl: `${origin}/app/abonnement?paiement=erreur&ref=${id}`,
    customer: { name: ctx.fullName || ctx.school.name, email: ctx.email, phone: ctx.school.phone },
  });
  if (!charge.ok) return charge;

  // La ligne « en attente » garde la référence Bictorys : c'est par elle, et
  // seulement par elle, que le paiement sera validé.
  const supabase = await createClient();
  const { error } = await supabase.from("subscription_payments").insert({
    id,
    school_id: ctx.school.id,
    plan,
    months,
    amount,
    provider: "bictorys",
    provider_ref: charge.ref,
    created_by: ctx.userId,
  });
  if (error) return { ok: false as const, error: "Paiement non enregistré. Réessayez." };
  return { ok: true as const, url: charge.url };
}

/** Client sans session : les fonctions appelées vérifient le secret du serveur. */
function serverDb() {
  return createAnonClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

/**
 * Vérifie un paiement auprès de Bictorys et le valide s'il est réussi.
 * Appelée par le webhook et au retour du client sur la page Abonnement.
 */
export async function settlePayment(paymentId: string): Promise<"paid" | "failed" | "pending" | "unknown"> {
  const secret = process.env.PAYMENTS_SERVER_SECRET;
  if (!secret || !/^[0-9a-f-]{36}$/.test(paymentId)) return "unknown";
  const db = serverDb();
  const { data } = await db.rpc("server_subscription_payment", { p_payment: paymentId, p_secret: secret });
  const row = ((data ?? []) as { provider_ref: string | null; amount: number; status: string }[])[0];
  if (!row?.provider_ref) return "unknown";
  if (row.status === "paid") return "paid";

  const tx = await fetchTransaction(row.provider_ref);
  if (!tx) return "pending";
  if (tx.merchantReference && tx.merchantReference !== paymentId) return "unknown";
  if (tx.outcome === "failed") {
    await db.rpc("fail_subscription_payment", { p_payment: paymentId, p_ref: row.provider_ref, p_secret: secret });
    return "failed";
  }
  if (tx.outcome !== "succeeded") return "pending";

  // Le montant de la charge est fixé par notre serveur. Bictorys peut le
  // rendre net de frais : un écart de quelques pourcents est normal, un écart
  // plus grand est laissé de côté pour vérification manuelle.
  if (tx.amount !== null && tx.amount < row.amount * 0.9) {
    console.error("bictorys montant inattendu", paymentId, tx.amount, row.amount);
    return "unknown";
  }
  const { data: ok } = await db.rpc("settle_subscription_payment", {
    p_payment: paymentId,
    p_ref: row.provider_ref,
    p_amount: row.amount,
    p_secret: secret,
  });
  return ok ? "paid" : "failed";
}
