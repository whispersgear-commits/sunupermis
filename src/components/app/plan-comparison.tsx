import { Check, Minus } from "lucide-react";
import { cn } from "@/lib/utils";
import { money } from "@/lib/format";
import { PLAN_COMPARISON, PLANS, type PlanId } from "@/lib/plans";

/** Tableau comparatif des trois formules : ce qui change vraiment de l'une à l'autre. */
export function PlanComparison({ current, className, highlight = "pro" }: { current?: PlanId | null; className?: string; highlight?: PlanId }) {
  const ids = Object.keys(PLANS) as PlanId[];
  return (
    <div className={cn("overflow-hidden rounded-3xl border border-line bg-surface", className)}>
      <div className="border-b border-line px-5 py-4">
        <h2 className="font-bold">Comparer les formules</h2>
        <p className="text-xs text-muted">Toutes les formules : élèves illimités, sans engagement, sans renouvellement automatique.</p>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[540px] text-sm">
          <thead>
            <tr className="border-b border-line">
              <th className="px-5 py-3 text-left font-semibold text-muted">Fonction</th>
              {ids.map((id) => (
                <th key={id} className={cn("px-3 py-3 text-center", id === highlight && "bg-brand-50/60 dark:bg-brand-900/20")}>
                  <span className="block font-bold">{PLANS[id].name}</span>
                  <span className="block text-xs font-semibold text-muted">{money(PLANS[id].price)} / mois</span>
                  {current === id && <span className="mt-1 inline-block rounded-full bg-brand-600 px-2 py-0.5 text-[10px] font-bold text-white">Actuelle</span>}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-line">
            {PLAN_COMPARISON.map((row) => (
              <tr key={row.label}>
                <td className="px-5 py-3">{row.label}</td>
                {ids.map((id) => {
                  const v = row.values[id];
                  return (
                    <td key={id} className={cn("px-3 py-3 text-center", id === highlight && "bg-brand-50/60 dark:bg-brand-900/20")}>
                      {v === true ? (
                        <Check className="mx-auto h-5 w-5 text-brand-600" strokeWidth={3} aria-label="Inclus" />
                      ) : v === false ? (
                        <Minus className="mx-auto h-4 w-4 text-muted/50" aria-label="Non inclus" />
                      ) : (
                        <span className="font-semibold">{v}</span>
                      )}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
