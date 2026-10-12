import { NextResponse } from "next/server";
import { webhookSecretMatches } from "@/lib/bictorys";
import { settlePayment } from "@/lib/subscription";

/**
 * Webhook Bictorys : notification de paiement d'abonnement.
 *
 * Le secret de l'en-tête prouve que l'appel vient de Bictorys, mais pas que le
 * contenu est exact : on ne retient que notre référence de paiement, et le
 * statut comme le montant sont relus chez Bictorys (settlePayment).
 */
export async function POST(request: Request) {
  if (!webhookSecretMatches(request.headers.get("x-secret-key"))) {
    return NextResponse.json({ error: "secret invalide" }, { status: 401 });
  }
  const body = (await request.json().catch(() => null)) as { merchantReference?: string; paymentReference?: string } | null;
  const ref = body?.merchantReference ?? "";
  if (!/^[0-9a-f-]{36}$/.test(ref)) return NextResponse.json({ received: true });

  const result = await settlePayment(ref);
  // 200 dans tous les cas traités : Bictorys renvoie la notification tant
  // qu'il reçoit une erreur, et un paiement encore en attente sera revérifié
  // au retour du client.
  return NextResponse.json({ received: true, result });
}
