import Link from "next/link";
import { ArrowRight, Lock } from "lucide-react";
import { cn } from "@/lib/utils";
import { FEATURE_INFO, PLANS, type Feature } from "@/lib/plans";

/**
 * Fonction non incluse dans la formule : ce qu'elle apporte, la formule qui
 * l'ouvre, et le chemin vers l'abonnement.
 */
export function PlanLock({ feature, text, className, compact = false }: { feature: Feature; text?: string; className?: string; compact?: boolean }) {
  const plan = PLANS[FEATURE_INFO[feature].plan];
  if (compact) {
    return (
      <Link
        href={`/app/abonnement?fonction=${feature}`}
        className={cn("inline-flex items-center gap-1.5 rounded-full bg-lane-soft px-2.5 py-1 text-xs font-bold text-amber-900 transition hover:brightness-95 dark:bg-amber-900/40 dark:text-amber-100", className)}
      >
        <Lock className="h-3 w-3" /> {plan.name}
      </Link>
    );
  }
  return (
    <div className={cn("rounded-2xl border border-dashed border-amber-300 bg-lane-soft/60 p-4 dark:border-amber-800 dark:bg-amber-900/20", className)}>
      <p className="flex items-center gap-2 text-sm font-bold text-amber-900 dark:text-amber-100">
        <Lock className="h-4 w-4" /> Disponible avec la formule {plan.name}
      </p>
      {text && <p className="mt-1 text-sm text-amber-900/80 dark:text-amber-100/80">{text}</p>}
      <Link href={`/app/abonnement?fonction=${feature}`} className="mt-3 inline-flex items-center gap-1.5 text-sm font-semibold text-brand-700 hover:underline dark:text-brand-200">
        Voir les formules <ArrowRight className="h-4 w-4" />
      </Link>
    </div>
  );
}
