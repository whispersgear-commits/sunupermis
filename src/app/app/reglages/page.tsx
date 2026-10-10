import type { Metadata } from "next";
import { PendingButton } from "@/components/ui/pending-button";
import { MessageCircle } from "lucide-react";
import { Badge, ButtonLink, Card, CardTitle, PageHeader } from "@/components/app/ui";
import { SchoolForm } from "@/components/app/team-forms";
import { requireContext } from "@/lib/session";
import { shortDate } from "@/lib/format";
import { accessOf, PLANS } from "@/lib/plans";
import { whatsappConfigured } from "@/lib/whatsapp-api";
import { setWhatsappAuto } from "../actions";
import { signOut } from "../../auth-actions";

export const metadata: Metadata = { title: "Réglages" };

export default async function ReglagesPage() {
  const ctx = await requireContext();
  const access = accessOf(ctx.school);
  const isOwner = ctx.role === "owner";
  const waReady = whatsappConfigured();
  const auto = ctx.school.whatsapp_auto;

  return (
    <>
      <PageHeader title="Réglages" description={ctx.email} />
      <div className="grid gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          <Card>
            <CardTitle title="Votre auto-école" />
            <div className="p-5">
              {isOwner ? <SchoolForm school={ctx.school} /> : <p className="text-sm text-muted">Seul le propriétaire peut modifier ces informations.</p>}
            </div>
          </Card>

          <Card delay={0.05}>
            <CardTitle
              title={
                <span className="flex items-center gap-2">
                  <MessageCircle className="h-4 w-4 text-[#25D366]" /> Rappels WhatsApp automatiques
                </span>
              }
              action={waReady ? <Badge tone="good">Connecté</Badge> : <Badge tone="warn">Non configuré</Badge>}
            />
            <div className="space-y-4 p-5 text-sm">
              <p className="text-muted">
                Chaque soir à 18 h, chaque élève qui a une leçon le lendemain reçoit un rappel (date, heure, moniteur). Les élèves en retard de paiement
                reçoivent une relance, au plus une fois par semaine.
              </p>
              {!waReady ? (
                <p className="rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-amber-900 dark:border-amber-900 dark:bg-amber-900/30 dark:text-amber-100">
                  Le numéro WhatsApp Business de SunuPermis n'est pas encore relié. En attendant, les boutons « Rappeler » et « Relancer » ouvrent
                  WhatsApp avec le message prêt.
                </p>
              ) : isOwner ? (
                <form action={setWhatsappAuto} className="flex flex-wrap items-center justify-between gap-3">
                  <input type="hidden" name="on" value={auto ? "0" : "1"} />
                  <span className="font-semibold">{auto ? "Envoi automatique activé" : "Envoi automatique désactivé"}</span>
                  <PendingButton
                    role="switch"
                    aria-checked={auto}
                    aria-label="Activer l'envoi automatique"
                    className={`relative h-7 w-12 rounded-full transition ${auto ? "bg-brand-600" : "bg-line"}`}
                  >
                    <span className={`absolute top-1 h-5 w-5 rounded-full bg-white shadow transition-all ${auto ? "left-6" : "left-1"}`} />
                  </PendingButton>
                </form>
              ) : (
                <p className="font-semibold">{auto ? "Envoi automatique activé." : "Envoi automatique désactivé (réglé par le propriétaire)."}</p>
              )}
            </div>
          </Card>
        </div>

        <Card delay={0.1} className="h-fit">
          <CardTitle title="Abonnement" />
          <div className="space-y-3 p-5 text-sm">
            <p className="font-semibold">{PLANS[ctx.school.plan].name}</p>
            <p className="text-muted">
              {!access.active
                ? "Abonnement expiré."
                : access.trial
                  ? `Essai gratuit jusqu'au ${shortDate(access.until)}.`
                  : `Payé jusqu'au ${shortDate(access.until)}.`}
            </p>
            {isOwner && (
              <ButtonLink href="/app/abonnement" variant="secondary" className="w-full justify-center">
                Gérer l'abonnement
              </ButtonLink>
            )}
            <form action={signOut} className="pt-3 lg:hidden">
              <PendingButton className="font-semibold text-red-600">Se déconnecter</PendingButton>
            </form>
          </div>
        </Card>
      </div>
    </>
  );
}
