import type { Metadata } from "next";
import { LegalLinks } from "@/components/legal/legal-page";
import { PendingButton } from "@/components/ui/pending-button";
import { Building2, Check, MessageCircle, X } from "lucide-react";
import { Badge, ButtonLink, Card, CardTitle, PageHeader } from "@/components/app/ui";
import { AgencyForm, SchoolForm } from "@/components/app/team-forms";
import { PlanLock } from "@/components/app/plan-lock";
import { requireContext } from "@/lib/session";
import { shortDate } from "@/lib/format";
import { accessOf, can, PLAN_HIGHLIGHTS, PLANS } from "@/lib/plans";
import { whatsappConfigured } from "@/lib/whatsapp-api";
import { removeAgency, setWhatsappAuto } from "../actions";
import { signOut } from "../../auth-actions";

export const metadata: Metadata = { title: "Réglages" };

export default async function ReglagesPage() {
  const ctx = await requireContext();
  const access = accessOf(ctx.school);
  const isOwner = ctx.role === "owner";
  const waReady = whatsappConfigured();
  const autoAllowed = can(ctx.school, "autoReminders");
  const auto = ctx.school.whatsapp_auto && autoAllowed;
  const agenciesAllowed = can(ctx.school, "agencies");
  const agencies = ctx.school.agencies ?? [];

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

          {ctx.role !== "instructor" && (
            <Card delay={0.05}>
              <CardTitle
                title={
                  <span className="flex items-center gap-2">
                    <MessageCircle className="h-4 w-4 text-[#25D366]" /> Rappels WhatsApp automatiques
                  </span>
                }
                action={!autoAllowed ? <PlanLock feature="autoReminders" compact /> : waReady ? <Badge tone="good">Connecté</Badge> : <Badge tone="warn">Non configuré</Badge>}
              />
              <div className="space-y-4 p-5 text-sm">
                <p className="text-muted">
                  Chaque soir à 18 h, chaque élève qui a une leçon le lendemain reçoit un rappel (date, heure, moniteur). Les élèves en retard de paiement
                  reçoivent une relance, au plus une fois par semaine.
                </p>
                {!autoAllowed ? (
                  <PlanLock feature="autoReminders" text="Avec l'Essentiel, les boutons « Rappeler » et « Relancer » ouvrent WhatsApp avec le message prêt, un élève à la fois." />
                ) : !waReady ? (
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
          )}

          {isOwner && (
            <Card delay={0.08}>
              <CardTitle
                title={
                  <span className="flex items-center gap-2">
                    <Building2 className="h-4 w-4 text-brand-600" /> Agences
                  </span>
                }
                action={agenciesAllowed ? <Badge tone="info">{agencies.length} / 20</Badge> : <PlanLock feature="agencies" compact />}
              />
              <div className="space-y-4 p-5 text-sm">
                <p className="text-muted">
                  Chaque élève est rattaché à une agence. Les listes d'élèves, le planning, les paiements et l'export se filtrent ensuite par agence.
                </p>
                {!agenciesAllowed ? (
                  <PlanLock feature="agencies" text="Gérez plusieurs agences depuis un seul compte, avec un suivi séparé de chacune." />
                ) : (
                  <>
                    {agencies.length > 0 && (
                      <ul className="divide-y divide-line rounded-2xl border border-line">
                        {agencies.map((a) => (
                          <li key={a} className="flex items-center justify-between gap-3 px-4 py-3">
                            <span className="font-semibold">{a}</span>
                            <form action={removeAgency}>
                              <input type="hidden" name="name" value={a} />
                              <PendingButton
                                confirm={`Retirer l'agence « ${a} » ? Ses élèves restent enregistrés, mais sans agence.`}
                                aria-label={`Retirer ${a}`} className="grid h-8 w-8 place-items-center rounded-lg text-muted transition hover:bg-red-50 hover:text-red-600">
                                <X className="h-4 w-4" />
                              </PendingButton>
                            </form>
                          </li>
                        ))}
                      </ul>
                    )}
                    <AgencyForm first={agencies.length === 0} />
                  </>
                )}
              </div>
            </Card>
          )}
        </div>

        <Card delay={0.1} className="h-fit">
          <CardTitle title="Abonnement" />
          <div className="space-y-3 p-5 text-sm">
            <p className="font-semibold">{access.trial ? "Accès offert · toutes les fonctions" : `Formule ${PLANS[ctx.school.plan].name}`}</p>
            <p className="text-muted">
              {!access.active
                ? "Abonnement expiré."
                : access.trial
                  ? `Accès offert jusqu'au ${shortDate(access.until)}.`
                  : `Payé jusqu'au ${shortDate(access.until)}.`}
            </p>
            {!access.trial && isOwner && (
              <ul className="space-y-1.5 border-t border-line pt-3">
                {PLAN_HIGHLIGHTS[ctx.school.plan].map((f) => (
                  <li key={f} className="flex gap-2 text-muted">
                    <Check className="mt-0.5 h-4 w-4 shrink-0 text-brand-600" strokeWidth={3} />
                    {f}
                  </li>
                ))}
              </ul>
            )}
            {isOwner && (
              <ButtonLink href="/app/abonnement" variant="secondary" className="w-full justify-center">
                Gérer l'abonnement
              </ButtonLink>
            )}
            <LegalLinks className="border-t border-line pt-4" />
            <form action={signOut} className="pt-3 lg:hidden">
              <PendingButton className="font-semibold text-red-600">Se déconnecter</PendingButton>
            </form>
          </div>
        </Card>
      </div>
    </>
  );
}
