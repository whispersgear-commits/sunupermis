import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { verifyWaveSignature } from "@/lib/wave";

/**
 * Webhook Wave : confirmation d'un paiement d'abonnement.
 *
 * C'est le seul chemin qui prolonge un abonnement. La signature est vérifiée
 * sur le corps brut, puis le montant reçu est comparé à celui attendu : un
 * paiement de 100 FCFA ne doit pas ouvrir un an d'abonnement.
 */
export async function POST(request: Request) {
  const raw = await request.text();
  if (!verifyWaveSignature(raw, request.headers.get("wave-signature"))) {
    return NextResponse.json({ error: "signature invalide" }, { status: 401 });
  }

  let event: { type?: string; data?: { id?: string; amount?: string; currency?: string; payment_status?: string } };
  try {
    event = JSON.parse(raw);
  } catch {
    return NextResponse.json({ error: "corps illisible" }, { status: 400 });
  }

  if (event.type !== "checkout.session.completed" || event.data?.payment_status !== "succeeded" || !event.data.id) {
    // Autres événements : accusé de réception, rien à faire.
    return NextResponse.json({ received: true });
  }

  const db = createAdminClient();
  const { data: payment } = await db
    .from("subscription_payments")
    .select("id, amount, status")
    .eq("provider_ref", event.data.id)
    .maybeSingle();

  if (!payment) return NextResponse.json({ error: "paiement inconnu" }, { status: 404 });
  if (Number(event.data.amount) !== payment.amount || (event.data.currency && event.data.currency !== "XOF")) {
    await db.from("subscription_payments").update({ status: "failed" }).eq("id", payment.id);
    return NextResponse.json({ error: "montant inattendu" }, { status: 400 });
  }

  const { error } = await db.rpc("confirm_subscription_payment", { ref: event.data.id });
  if (error) return NextResponse.json({ error: "confirmation impossible" }, { status: 500 });
  return NextResponse.json({ received: true });
}
