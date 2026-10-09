import type { School } from "./types";

/**
 * Formules d'abonnement. Les prix sont en FCFA par mois ; l'année se paie
 * 10 mois (2 mois offerts).
 */
export const PLANS = {
  essentiel: { name: "Essentiel", price: 15000, users: 1, description: "1 ou 2 voitures" },
  pro: { name: "Pro", price: 25000, users: 5, description: "3 à 6 voitures" },
  multi: { name: "Multi-agences", price: 50000, users: null, description: "Plusieurs agences" },
} as const;

export type PlanId = keyof typeof PLANS;

export function planPrice(plan: PlanId, months: 1 | 12): number {
  return PLANS[plan].price * (months === 12 ? 10 : 1);
}

export interface Access {
  /** L'école peut utiliser le logiciel (essai en cours ou abonnement payé). */
  active: boolean;
  trial: boolean;
  /** Jours restants d'essai ou d'abonnement. */
  daysLeft: number;
  until: Date;
}

export function accessOf(school: Pick<School, "trial_ends_at" | "paid_until">, now = Date.now()): Access {
  const trialEnd = new Date(school.trial_ends_at).getTime();
  const paidEnd = school.paid_until ? new Date(school.paid_until).getTime() : 0;
  const end = Math.max(trialEnd, paidEnd);
  return {
    active: end > now,
    trial: trialEnd > now && paidEnd <= trialEnd,
    daysLeft: Math.max(0, Math.ceil((end - now) / 86_400_000)),
    until: new Date(end),
  };
}

/** Nombre de comptes autorisés ; illimité pendant l'essai. */
export function userLimit(school: Pick<School, "plan" | "trial_ends_at" | "paid_until">): number | null {
  if (accessOf(school).trial) return null;
  return PLANS[school.plan].users;
}
