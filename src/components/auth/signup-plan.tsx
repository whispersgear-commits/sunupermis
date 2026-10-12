"use client";

import { useState } from "react";
import { Check } from "lucide-react";
import { cn } from "@/lib/utils";
import { money } from "@/lib/format";
import { PLANS, planPrice, type PlanId } from "@/lib/plans";

/**
 * Choix de la formule à l'inscription. Le paiement suit immédiatement la
 * création du compte : l'accès au logiciel commence avec l'abonnement.
 */
export function SignupPlan({ defaultPlan = "pro", defaultMonths = 1 }: { defaultPlan?: PlanId; defaultMonths?: 1 | 12 }) {
  const [plan, setPlan] = useState<PlanId>(defaultPlan);
  const [months, setMonths] = useState<1 | 12>(defaultMonths);

  return (
    <fieldset className="space-y-3">
      <legend className="mb-2 text-sm font-semibold">Votre formule</legend>
      <input type="hidden" name="plan" value={plan} />
      <input type="hidden" name="months" value={months} />

      <div className="grid grid-cols-2 rounded-xl border border-line bg-bg p-1 text-sm font-semibold">
        {([1, 12] as const).map((m) => (
          <button
            key={m}
            type="button"
            onClick={() => setMonths(m)}
            className={cn("rounded-lg py-2 transition", months === m ? "bg-brand-600 text-white shadow" : "text-muted hover:text-ink")}
          >
            {m === 1 ? "Mensuel" : "Annuel · 2 mois offerts"}
          </button>
        ))}
      </div>

      <div className="grid gap-2">
        {(Object.keys(PLANS) as PlanId[]).map((id) => {
          const selected = plan === id;
          return (
            <button
              key={id}
              type="button"
              onClick={() => setPlan(id)}
              aria-pressed={selected}
              className={cn(
                "flex items-center gap-3 rounded-xl border p-3 text-left transition",
                selected ? "border-brand-600 bg-brand-600/5 ring-1 ring-brand-600" : "border-line bg-surface hover:border-brand-600/50",
              )}
            >
              <span className={cn("grid h-5 w-5 shrink-0 place-items-center rounded-full border", selected ? "border-brand-600 bg-brand-600 text-white" : "border-line")}>
                {selected && <Check className="h-3 w-3" />}
              </span>
              <span className="min-w-0 flex-1">
                <span className="block font-semibold">{PLANS[id].name}</span>
                <span className="block truncate text-xs text-muted">{PLANS[id].description}</span>
              </span>
              <span className="text-right">
                <span className="block font-bold">{money(planPrice(id, months))}</span>
                <span className="block text-xs text-muted">{months === 1 ? "/ mois" : "/ an"}</span>
              </span>
            </button>
          );
        })}
      </div>
      <p className="text-xs text-muted">Paiement sécurisé juste après : Wave, Orange Money ou carte bancaire.</p>
    </fieldset>
  );
}
