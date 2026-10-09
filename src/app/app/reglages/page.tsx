import type { Metadata } from "next";
import { Card, CardTitle, PageHeader } from "@/components/app/ui";
import { SchoolForm } from "@/components/app/team-forms";
import { requireContext } from "@/lib/session";
import { shortDate } from "@/lib/format";
import { signOut } from "../../auth-actions";

export const metadata: Metadata = { title: "Réglages" };

const PLAN = { essentiel: "Essentiel · 15 000 FCFA / mois", pro: "Pro · 25 000 FCFA / mois", multi: "Multi-agences · 50 000 FCFA / mois" };

export default async function ReglagesPage() {
  const ctx = await requireContext();
  const trial = new Date(ctx.school.trial_ends_at).getTime() > Date.now();

  return (
    <>
      <PageHeader title="Réglages" description={ctx.email} />
      <div className="grid gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardTitle title="Votre auto-école" />
          <div className="p-5">
            {ctx.role === "owner" ? (
              <SchoolForm school={ctx.school} />
            ) : (
              <p className="text-sm text-muted">Seul le propriétaire peut modifier ces informations.</p>
            )}
          </div>
        </Card>
        <Card delay={0.05} className="h-fit">
          <CardTitle title="Abonnement" />
          <div className="space-y-3 p-5 text-sm">
            <p className="font-semibold">{PLAN[ctx.school.plan]}</p>
            <p className="text-muted">
              {trial ? `Essai gratuit jusqu'au ${shortDate(ctx.school.trial_ends_at)}.` : "Paiement mensuel par Wave ou Orange Money."}
            </p>
            <form action={signOut} className="pt-3 lg:hidden">
              <button className="font-semibold text-red-600">Se déconnecter</button>
            </form>
          </div>
        </Card>
      </div>
    </>
  );
}
