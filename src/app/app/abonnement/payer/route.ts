import { NextResponse } from "next/server";
import { requireOwner, siteOrigin } from "@/lib/session";
import { bictorysConfigured } from "@/lib/bictorys";
import { openCheckout, parsePlan } from "@/lib/subscription";

export const dynamic = "force-dynamic";

/**
 * /app/abonnement/payer?plan=pro&mois=12 : ouvre la page de paiement
 * Bictorys pour la formule choisie (bouton « Payer » et fin d'inscription).
 */
export async function GET(request: Request) {
  const ctx = await requireOwner();
  const url = new URL(request.url);
  const origin = await siteOrigin();
  const plan = parsePlan(url.searchParams.get("plan")) ?? ctx.school.plan;
  const months = url.searchParams.get("mois") === "12" ? 12 : 1;
  const back = (q: string) => NextResponse.redirect(`${origin}/app/abonnement?${q}&plan=${plan}&mois=${months}`, 303);

  if (!bictorysConfigured()) return back("paiement=indisponible");
  const checkout = await openCheckout(ctx, plan, months, origin);
  if (!checkout.ok) return back("paiement=erreur");
  return NextResponse.redirect(checkout.url, 303);
}
