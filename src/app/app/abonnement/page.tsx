import type { Metadata } from "next";
import { CheckCircle2, Clock, XCircle } from "lucide-react";
import { Badge, Card, CardTitle, Empty, PageHeader } from "@/components/app/ui";
import { PlanPicker } from "@/components/app/plan-picker";
import { requireContext } from "@/lib/session";
import { createClient } from "@/lib/supabase/server";
import { accessOf, PLANS, type PlanId } from "@/lib/plans";
import { money, shortDate } from "@/lib/format";
import { waveConfigured } from "@/lib/wave";
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
}

const STATUS = {
  paid: { label: "Payé", tone: "good" },
  pending: { label: "En attente", tone: "warn" },
  failed: { label: "Échoué", tone: "bad" },
} as const;

export default async function AbonnementPage({ searchParams }: { searchParams: Promise<{ expire?: string; paiement?: string }> }) {
  const ctx = await requireContext();
  const params = await searchParams;
  const access = accessOf(ctx.school);
  const isOwner = ctx.role === "owner";

  let payments: SubscriptionPayment[] = [];
  if (isOwner) {
    const supabase = await createClient();
    const { data } = await supabase
      .from("subscription_payments")
      .select("id, plan, months, amount, status, created_at, paid_at")
      .eq("school_id", ctx.school.id)
      .order("created_at", { ascending: false })
      .limit(24);
    payments = (data ?? []) as SubscriptionPayment[];
  }

  const support = normalizePhone(process.env.SUPPORT_WHATSAPP || "221782932433");
  const contactHref = support ? `https://wa.me/${support.replace(/^\+/, "")}` : null;

  return (
    <>
      <PageHeader title="Abonnement" description={`${PLANS[ctx.school.plan].name} · ${ctx.school.name}`} />

      {params.paiement === "ok" && (
        <Notice tone="good" icon={<CheckCircle2 className="h-5 w-5" />}>
          Paiement reçu par Wave. L'abonnement est prolongé dès la confirmation (quelques secondes) ; actualisez la page si la date n'a pas changé.
        </Notice>
      )}
      {params.paiement === "erreur" && (
        <Notice tone="bad" icon={<XCircle className="h-5 w-5" />}>
          Le paiement n'a pas abouti. Aucun montant n'a été prélevé ; vous pouvez réessayer.
        </Notice>
      )}
      {!access.active && (
        <Notice tone="bad" icon={<Clock className="h-5 w-5" />}>
          {access.trial || !ctx.school.paid_until ? "Votre essai gratuit est terminé." : "Votre abonnement est arrivé à échéance."} Vos données sont
          conservées : {isOwner ? "renouvelez pour retrouver l'accès." : "demandez au propriétaire de renouveler l'abonnement."}
        </Notice>
      )}

      <Card className="mb-8 p-5">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <p className="text-sm font-semibold text-muted">Statut</p>
            <p className="mt-1 text-xl font-extrabold">
              {!access.active ? "Expiré" : access.trial ? "Essai gratuit" : `Abonnement ${PLANS[ctx.school.plan].name}`}
            </p>
          </div>
          {access.active && (
            <div className="text-right">
              <p className="text-sm font-semibold text-muted">{access.trial ? "Fin de l'essai" : "Payé jusqu'au"}</p>
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
          <PlanPicker current={ctx.school.plan} canPay={waveConfigured()} contactHref={contactHref} />
          <p className="mt-4 text-xs text-muted">
            Le temps payé s'ajoute à la date de fin actuelle : rien n'est perdu en payant avant l'échéance.
          </p>

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
