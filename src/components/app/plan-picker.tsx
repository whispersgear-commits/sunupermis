"use client";

import { useState } from "react";
import { motion } from "motion/react";
import { Check, Loader2, Lock } from "lucide-react";
import { cn } from "@/lib/utils";
import { money } from "@/lib/format";
import { PLAN_HIGHLIGHTS as FEATURES, PLANS, planPrice, type PlanId } from "@/lib/plans";

/**
 * Choix de la formule et de la durée, puis paiement sur la page sécurisée
 * Bictorys (Wave, Orange Money, carte). Sans Bictorys configuré, `canPay`
 * est faux et on propose WhatsApp.
 */
export function PlanPicker({
  current,
  selected,
  defaultMonths = 1,
  canPay,
  contactHref,
  memberCount = 1,
}: {
  /** Formule payée en cours, s'il y en a une. */
  current: PlanId | null;
  /** Formule mise en avant (choix d'inscription, fonction demandée…). */
  selected: PlanId;
  defaultMonths?: 1 | 12;
  canPay: boolean;
  contactHref: string | null;
  memberCount?: number;
}) {
  const [months, setMonths] = useState<1 | 12>(defaultMonths);
  const [going, setGoing] = useState<PlanId | null>(null);

  return (
    <div>
      <div className="mb-6 inline-flex rounded-2xl border border-line bg-surface p-1 text-sm font-semibold">
        {([1, 12] as const).map((m) => (
          <button
            key={m}
            type="button"
            onClick={() => setMonths(m)}
            className={cn("relative rounded-xl px-4 py-2 transition", months === m ? "text-white" : "text-muted hover:text-ink")}
          >
            {months === m && (
              <motion.span layoutId="months-pill" className="absolute inset-0 rounded-xl bg-brand-600" transition={{ type: "spring", stiffness: 400, damping: 32 }} />
            )}
            <span className="relative">{m === 1 ? "Mensuel" : "Annuel · 2 mois offerts"}</span>
          </button>
        ))}
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        {(Object.keys(PLANS) as PlanId[]).map((id, i) => {
          const plan = PLANS[id];
          const highlighted = id === selected;
          // Formule trop petite pour l'équipe actuelle.
          const tooSmall = plan.users !== null && memberCount > plan.users;
          return (
            <motion.div
              key={id}
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.35, delay: 0.04 * i }}
              className={cn(
                "flex flex-col rounded-3xl border p-5",
                highlighted ? "border-brand-600 bg-brand-600/5 shadow-xl shadow-brand-600/10" : "border-line bg-surface",
              )}
            >
              <div className="flex items-center justify-between">
                <p className="font-bold">{plan.name}</p>
                {id === current ? (
                  <span className="rounded-full bg-brand-600 px-2.5 py-0.5 text-xs font-bold text-white">Formule actuelle</span>
                ) : id === "pro" ? (
                  <span className="rounded-full bg-lane px-2.5 py-0.5 text-xs font-bold text-asphalt">Recommandé</span>
                ) : null}
              </div>
              <p className="mt-1 text-sm text-muted">{plan.pitch}</p>
              <p className="mt-4 text-3xl font-extrabold tracking-tight">{money(planPrice(id, months))}</p>
              <p className="text-xs text-muted">{months === 1 ? "par mois" : `par an, soit ${money(Math.round(planPrice(id, 12) / 12))} / mois`}</p>
              <ul className="my-5 space-y-2 text-sm">
                {FEATURES[id].map((f) => (
                  <li key={f} className="flex gap-2">
                    <Check className="mt-0.5 h-4 w-4 shrink-0 text-brand-600" />
                    {f}
                  </li>
                ))}
              </ul>
              <div className="mt-auto">
                {tooSmall ? (
                  <p className="rounded-xl bg-bg px-3 py-2.5 text-center text-xs text-muted">
                    Votre équipe compte {memberCount} comptes : cette formule en permet {plan.users}.
                  </p>
                ) : canPay ? (
                  <a
                    href={`/app/abonnement/payer?plan=${id}&mois=${months}`}
                    rel="nofollow"
                    onClick={() => setGoing(id)}
                    aria-busy={going === id || undefined}
                    className={cn(
                      "inline-flex h-11 w-full items-center justify-center gap-2 rounded-xl px-5 text-sm font-semibold transition",
                      highlighted ? "bg-brand-600 text-white shadow-lg shadow-brand-600/25 hover:bg-brand-700" : "border border-line bg-surface hover:border-brand-600 hover:text-brand-700",
                      going && "pointer-events-none opacity-70",
                    )}
                  >
                    {going === id ? <Loader2 className="h-4 w-4 animate-spin" /> : <Lock className="h-4 w-4" />}
                    {!current ? "Payer" : id === current ? "Prolonger ·" : `Passer à ${plan.name} ·`} {money(planPrice(id, months))}
                  </a>
                ) : contactHref ? (
                  <a
                    href={`${contactHref}?text=${encodeURIComponent(`Bonjour, je souhaite activer la formule ${plan.name} (${months === 1 ? "mensuelle" : "annuelle"}) de SunuPermis.`)}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex h-11 w-full items-center justify-center rounded-xl bg-[#25D366] px-5 text-sm font-semibold text-white hover:brightness-95"
                  >
                    Activer via WhatsApp
                  </a>
                ) : (
                  <p className="text-center text-sm text-muted">Paiement en ligne bientôt disponible.</p>
                )}
              </div>
            </motion.div>
          );
        })}
      </div>
      {canPay && (
        <p className="mt-4 flex items-center gap-2 text-xs text-muted">
          <Lock className="h-3.5 w-3.5" /> Paiement sécurisé par Bictorys : Wave, Orange Money ou carte bancaire.
        </p>
      )}
    </div>
  );
}
