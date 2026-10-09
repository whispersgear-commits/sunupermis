"use client";

import { useState } from "react";
import { motion } from "motion/react";
import { Check } from "lucide-react";
import { ActionForm, Submit } from "@/components/ui/form";
import { cn } from "@/lib/utils";
import { money } from "@/lib/format";
import { PLANS, planPrice, type PlanId } from "@/lib/plans";
import { startSubscription } from "@/app/app/actions";

const FEATURES: Record<PlanId, string[]> = {
  essentiel: ["Élèves, paiements, planning", "Rappels WhatsApp", "1 compte"],
  pro: ["Tout l'Essentiel", "Jusqu'à 5 comptes (secrétaire, moniteurs)", "Rappels automatiques chaque soir"],
  multi: ["Tout le Pro", "Comptes illimités", "Plusieurs agences"],
};

/**
 * Choix de la formule et de la durée. Le paiement part chez Wave ; sans
 * Wave configuré, `canPay` est faux et on propose WhatsApp à la place.
 */
export function PlanPicker({ current, canPay, contactHref }: { current: PlanId; canPay: boolean; contactHref: string | null }) {
  const [months, setMonths] = useState<1 | 12>(1);

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
          const highlighted = id === "pro";
          return (
            <motion.div
              key={id}
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.45, delay: 0.05 * i }}
              whileHover={{ y: -4 }}
              className={cn(
                "flex flex-col rounded-3xl border p-5",
                highlighted ? "border-brand-600 bg-brand-600/5 shadow-xl shadow-brand-600/10" : "border-line bg-surface",
              )}
            >
              <div className="flex items-center justify-between">
                <p className="font-bold">{plan.name}</p>
                {id === current && <span className="rounded-full bg-brand-50 px-2.5 py-0.5 text-xs font-bold text-brand-700">Actuelle</span>}
              </div>
              <p className="mt-1 text-sm text-muted">{plan.description}</p>
              <motion.p key={months} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} className="mt-4 text-3xl font-extrabold tracking-tight">
                {money(planPrice(id, months))}
              </motion.p>
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
                {canPay ? (
                  <ActionForm action={startSubscription}>
                    <input type="hidden" name="plan" value={id} />
                    <input type="hidden" name="months" value={months} />
                    <Submit variant={highlighted ? "primary" : "secondary"} className="w-full">
                      Payer avec Wave
                    </Submit>
                  </ActionForm>
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
    </div>
  );
}
