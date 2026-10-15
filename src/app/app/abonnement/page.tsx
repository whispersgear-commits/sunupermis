import type { Metadata } from "next";
import { redirect } from "next/navigation";
import Link from "next/link";
import { CheckCircle2, Clock, FileText, Loader2, Lock, XCircle } from "lucide-react";
import { subscriptionInvoiceLabel } from "@/lib/subscription-invoice";
import { Badge, Card, CardTitle, Empty, PageHeader } from "@/components/app/ui";
import { PlanPicker } from "@/components/app/plan-picker";
import { AutoRefresh } from "@/components/app/auto-refresh";
import { requireContext } from "@/lib/session";
import { createClient } from "@/lib/supabase/server";
import { accessOf, FEATURE_INFO, PLANS, type Feature, type PlanId } from "@/lib/plans";
import { PlanComparison } from "@/components/app/plan-comparison";
import { money, shortDate } from "@/lib/format";
import { bictorysConfigured } from "@/lib/bictorys";
import { parsePlan, settlePayment } from "@/lib/subscription";
import { normalizePhone } from "@/lib/phone";

export const metadata: Metadata = { title: "Abonnement" };

interface SubscriptionPayment {
  id: string;
  plan: PlanId;
  months: number;
  amount: number;
  status: "pending" | "paid" | "failed";
  created_at: string;
  paid_at: string | null;
  invoice_no: number | null;
}

const STATUS = {
  paid: { label: "Payé", tone: "good" },
  pending: { label: "En attente", tone: "warn" },
  failed: { label: "Échoué", tone: "bad" },
} as const;

type Params = { fonction?: string; expire?: string; paiement?: string; ref?: string; plan?: string; mois?: string; bienvenue?: string };

export default async function AbonnementPage({ searchParams }: { searchParams: Promise<Params> }) {
  const ctx = await requireContext();
  const params = await searchParams;
  const isOwner = ctx.role === "owner";
  const supabase = await createClient();

  // Retour de la page de paiement Bictorys : on vérifie tout de suite la
  // transaction, sans attendre le webhook.
  let settled: Awaited<ReturnType<typeof settlePayment>> | null = null;
  if (isOwner && params.paiement === "ok" && params.ref) {
    settled = await settlePayment(params.ref);
    if (settled === "paid") {
      const { data: fresh } = await supabase.from("schools").select("trial_ends_at, paid_until").eq("id", ctx.school.id).single();
      // Premier abonnement : accueil sur le tableau de bord.
      if (fresh && accessOf(fresh).active) redirect(ctx.school.paid_until ? "/app" : "/app?bienvenue=1");
    }
  }

  const access = accessOf(ctx.school);
  const neverPaid = !ctx.school.paid_until && !access.trial;
  let payments: SubscriptionPayment[] = [];
  if (isOwner) {
    const { data } = await supabase
      .from("subscription_payments")
      .select("id, plan, months, amount, status, created_at, paid_at, invoice_no")
      .eq("school_id", ctx.school.id)
      .order("created_at", { ascending: false })
      .limit(24);
    payments = (data ?? []) as SubscriptionPayment[];
  }

  // Nombre de comptes : une formule trop petite pour l'équipe n'est pas proposée.
  const { count: memberCount } = isOwner
    ? await supabase.from("memberships").select("user_id", { count: "exact", head: true }).eq("school_id", ctx.school.id)
    : { count: 1 };
  // Arrivée depuis une fonction réservée (« Export CSV : formule Pro »).
  const feature = params.fonction && params.fonction in FEATURE_INFO ? (params.fonction as Feature) : null;

  const support = normalizePhone(process.env.SUPPORT_WHATSAPP || "221782932433");
  const contactHref = support ? `https://wa.me/${support.replace(/^\+/, "")}` : null;
  // Avant le premier paiement, on reprend la formule choisie à l'inscription.
  let signupChoice: { plan?: string; plan_months?: number } = {};
  if (neverPaid && !params.plan) {
    const { data } = await supabase.auth.getUser();
    signupChoice = (data.user?.user_metadata ?? {}) as typeof signupChoice;
  }
  const chosenPlan = parsePlan(params.plan) ?? (feature ? FEATURE_INFO[feature].plan : null) ?? parsePlan(signupChoice.plan) ?? ctx.school.plan;
  const chosenMonths = (params.mois ?? String(signupChoice.plan_months ?? "")) === "12" ? 12 : 1;

  return (
    <>
      <PageHeader
        title={neverPaid && !access.active ? "Votre essai gratuit est terminé" : "Abonnement"}
        description={
          neverPaid && !access.active
            ? "Choisissez votre formule pour continuer. Vos élèves, leçons et paiements sont conservés."
            : `${PLANS[ctx.school.plan].name} · ${ctx.school.name}`
        }
      />

      {access.active && access.trial && (
        <Notice tone="good" icon={<Clock className="h-5 w-5" />}>
          Essai gratuit : {access.daysLeft <= 1 ? "dernier jour" : `encore ${access.daysLeft} jours`}, jusqu'au {shortDate(access.until)}. Toutes les fonctions sont
          ouvertes. {isOwner ? "Choisissez votre formule maintenant pour continuer sans interruption : le temps payé commence après l'essai." : ""}
        </Notice>
      )}

      {params.paiement === "ok" && settled === "paid" && (
        <Notice tone="good" icon={<CheckCircle2 className="h-5 w-5" />}>
          Paiement confirmé. Merci ! Votre abonnement est prolongé.
        </Notice>
      )}
      {params.paiement === "ok" && settled !== "paid" && settled !== "failed" && (
        <Notice tone="good" icon={<Loader2 className="h-5 w-5 animate-spin" />}>
          Paiement reçu, confirmation en cours auprès de Bictorys… Cette page se met à jour toute seule.
          <AutoRefresh />
        </Notice>
      )}
      {params.paiement === "ok" && settled === "failed" && (
        <Notice tone="bad" icon={<XCircle className="h-5 w-5" />}>
          Bictorys indique que ce paiement n'a pas abouti. Aucun abonnement n'a été activé ; vous pouvez réessayer.
        </Notice>
      )}
      {feature && (
        <Notice tone="good" icon={<Lock className="h-5 w-5" />}>
          {FEATURE_INFO[feature].label} : disponible avec la formule {PLANS[FEATURE_INFO[feature].plan].name}
          {FEATURE_INFO[feature].plan === "pro" ? " et Multi-agences" : ""}. Votre formule actuelle : {PLANS[ctx.school.plan].name}.
        </Notice>
      )}
      {params.paiement === "trop-de-comptes" && (
        <Notice tone="bad" icon={<XCircle className="h-5 w-5" />}>
          Votre équipe compte {memberCount} comptes : cette formule n'en permet pas autant. Retirez d'abord des comptes dans Équipe, ou choisissez une formule
          plus grande.
        </Notice>
      )}
      {params.paiement === "indisponible" && (
        <Notice tone="bad" icon={<Lock className="h-5 w-5" />}>
          Le paiement en ligne n'est pas encore activé. Contactez-nous sur WhatsApp pour activer votre abonnement.
        </Notice>
      )}
      {params.paiement === "erreur" && (
        <Notice tone="bad" icon={<XCircle className="h-5 w-5" />}>
          Le paiement n'a pas abouti. Aucun montant n'a été prélevé ; vous pouvez réessayer.
        </Notice>
      )}
      {!access.active && !neverPaid && (
        <Notice tone="bad" icon={<Clock className="h-5 w-5" />}>
          Votre abonnement est arrivé à échéance. Vos données sont conservées :{" "}
          {isOwner ? "renouvelez pour retrouver l'accès." : "demandez au propriétaire de renouveler l'abonnement."}
        </Notice>
      )}
      {!access.active && neverPaid && !isOwner && (
        <Notice tone="bad" icon={<Clock className="h-5 w-5" />}>
          L'essai gratuit de l'auto-école est terminé. Le propriétaire doit choisir une formule pour rouvrir l'accès ; rien n'est perdu.
        </Notice>
      )}

      <Card className="mb-8 p-5">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <p className="text-sm font-semibold text-muted">Statut</p>
            <p className="mt-1 text-xl font-extrabold">
              {!access.active ? (neverPaid ? "Essai gratuit terminé" : "Abonnement expiré") : access.trial ? "Essai gratuit en cours" : `Abonnement ${PLANS[ctx.school.plan].name}`}
            </p>
          </div>
          {access.active && (
            <div className="sm:text-right">
              <p className="text-sm font-semibold text-muted">{access.trial ? "Accès jusqu'au" : "Payé jusqu'au"}</p>
              <p className="mt-1 text-xl font-extrabold">
                {shortDate(access.until)} <span className="text-sm font-semibold text-muted">· {access.daysLeft} j</span>
              </p>
            </div>
          )}
        </div>
      </Card>

      {isOwner ? (
        <>
          <h2 className="mb-4 text-lg font-bold">{access.active && !access.trial ? "Prolonger ou changer de formule" : "Choisir une formule"}</h2>
          <PlanPicker
            current={access.active && !access.trial ? ctx.school.plan : null}
            selected={chosenPlan}
            defaultMonths={chosenMonths}
            canPay={bictorysConfigured()}
            contactHref={contactHref}
            memberCount={memberCount ?? 1}
          />
          <p className="mt-4 text-xs text-muted">
            Le temps payé s'ajoute à la date de fin actuelle : rien n'est perdu en payant avant l'échéance.
          </p>
          <PlanComparison className="mt-8" current={access.active && !access.trial ? ctx.school.plan : null} />

          <Card className="mt-8" delay={0.1}>
            <CardTitle title="Historique des paiements" />
            {payments.length === 0 ? (
              <Empty title="Aucun paiement pour l'instant" />
            ) : (
              <ul className="divide-y divide-line">
                {payments.map((p) => (
                  <li key={p.id} className="flex flex-wrap items-center justify-between gap-3 px-5 py-3 text-sm">
                    <div>
                      <p className="font-semibold">
                        {PLANS[p.plan].name} · {p.months === 12 ? "1 an" : "1 mois"}
                      </p>
                      <p className="text-xs text-muted">{shortDate(p.paid_at ?? p.created_at)}</p>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="font-bold">{money(p.amount)}</span>
                      <Badge tone={STATUS[p.status].tone}>{STATUS[p.status].label}</Badge>
                      {p.status === "paid" && (
                        <Link
                          href={`/app/abonnement/facture/${p.id}`}
                          className="inline-flex items-center gap-1.5 rounded-lg border border-line px-2.5 py-1 text-xs font-semibold transition hover:border-brand-600 hover:text-brand-700"
                        >
                          <FileText className="h-3.5 w-3.5" /> Facture {subscriptionInvoiceLabel(p.invoice_no, p.paid_at)}
                        </Link>
                      )}
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </Card>
        </>
      ) : (
        <p className="text-sm text-muted">Seul le propriétaire de l'auto-école gère l'abonnement.</p>
      )}
    </>
  );
}

function Notice({ tone, icon, children }: { tone: "good" | "bad"; icon: React.ReactNode; children: React.ReactNode }) {
  return (
    <div
      role="status"
      className={
        tone === "good"
          ? "mb-6 flex gap-3 rounded-2xl border border-brand-200 bg-brand-50 p-4 text-sm text-brand-900 dark:border-brand-800 dark:bg-brand-900/40 dark:text-brand-100"
          : "mb-6 flex gap-3 rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-900 dark:border-red-900 dark:bg-red-900/30 dark:text-red-100"
      }
    >
      <span className="shrink-0">{icon}</span>
      <p>{children}</p>
    </div>
  );
}
