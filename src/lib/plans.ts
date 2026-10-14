import type { School } from "./types";

/**
 * Formules d'abonnement. Les prix sont en FCFA par mois ; l'année se paie
 * 10 mois (2 mois offerts).
 *
 * Chaque formule ouvre des fonctions précises (`features`) : ce sont elles
 * que le serveur vérifie (`can`), pas seulement l'affichage.
 */
export const PLANS = {
  essentiel: {
    name: "Essentiel",
    price: 15000,
    users: 1,
    description: "1 ou 2 voitures",
    pitch: "Pour l'auto-école gérée par son propriétaire.",
    features: { autoReminders: false, export: false, cashByPerson: false, agencies: false, prioritySupport: false },
  },
  pro: {
    name: "Pro",
    price: 25000,
    users: 5,
    description: "3 à 6 voitures",
    pitch: "Pour travailler en équipe avec secrétaire et moniteurs.",
    features: { autoReminders: true, export: true, cashByPerson: true, agencies: false, prioritySupport: false },
  },
  multi: {
    name: "Multi-agences",
    price: 50000,
    users: null,
    description: "Plusieurs agences",
    pitch: "Pour les auto-écoles qui ont plusieurs agences.",
    features: { autoReminders: true, export: true, cashByPerson: true, agencies: true, prioritySupport: true },
  },
} as const;

export type Feature = keyof (typeof PLANS)["essentiel"]["features"];

/** Libellé de chaque fonction réservée, et la première formule qui l'ouvre. */
export const FEATURE_INFO: Record<Feature, { label: string; plan: PlanId }> = {
  autoReminders: { label: "Rappels WhatsApp automatiques et relances groupées", plan: "pro" },
  export: { label: "Export CSV des encaissements", plan: "pro" },
  cashByPerson: { label: "Caisse du jour par personne", plan: "pro" },
  agencies: { label: "Gestion de plusieurs agences", plan: "multi" },
  prioritySupport: { label: "Assistance prioritaire", plan: "multi" },
};

/**
 * Lignes affichées pour chaque formule (site, inscription, abonnement).
 * Une seule liste : les trois écrans disent la même chose.
 */
export const PLAN_HIGHLIGHTS: Record<PlanId, string[]> = {
  essentiel: [
    "1 compte : le propriétaire",
    "Élèves illimités",
    "Planning des leçons et des examens",
    "Paiements, échéanciers, reçus avec QR code",
    "Relance WhatsApp en un clic",
    "Caisse du jour, dépenses et résultat",
    "Import des élèves depuis Excel",
  ],
  pro: [
    "Tout l'Essentiel",
    "Jusqu'à 5 comptes : secrétaire, moniteurs",
    "Rappels WhatsApp automatiques chaque soir",
    "Caisse du jour par personne",
    "Export CSV pour la comptabilité",
  ],
  multi: [
    "Tout le Pro",
    "Comptes illimités",
    "Plusieurs agences : élèves, moniteurs, voitures, planning, paiements et dépenses par agence",
    "Assistance prioritaire",
  ],
};

/** Tableau comparatif : une ligne par fonction, une colonne par formule. */
export const PLAN_COMPARISON: { label: string; values: Record<PlanId, string | boolean> }[] = [
  { label: "Comptes de connexion", values: { essentiel: "1", pro: "5", multi: "Illimités" } },
  { label: "Élèves", values: { essentiel: "Illimités", pro: "Illimités", multi: "Illimités" } },
  { label: "Planning, examens, voitures", values: { essentiel: true, pro: true, multi: true } },
  { label: "Paiements, échéanciers, reçus QR", values: { essentiel: true, pro: true, multi: true } },
  { label: "Relance WhatsApp en un clic", values: { essentiel: true, pro: true, multi: true } },
  { label: "Caisse du jour", values: { essentiel: true, pro: true, multi: true } },
  { label: "Dépenses et résultat du mois", values: { essentiel: true, pro: true, multi: true } },
  { label: "Import des élèves depuis Excel", values: { essentiel: true, pro: true, multi: true } },
  { label: "Rappels automatiques chaque soir", values: { essentiel: false, pro: true, multi: true } },
  { label: "Caisse du jour par personne", values: { essentiel: false, pro: true, multi: true } },
  { label: "Export CSV (comptabilité)", values: { essentiel: false, pro: true, multi: true } },
  { label: "Plusieurs agences", values: { essentiel: false, pro: false, multi: true } },
  { label: "Assistance prioritaire", values: { essentiel: false, pro: false, multi: true } },
];

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

/**
 * L'école a-t-elle accès à cette fonction ? Pendant un accès offert, tout
 * est ouvert ; sinon, c'est la formule payée qui décide.
 */
export function can(school: Pick<School, "plan" | "trial_ends_at" | "paid_until">, feature: Feature): boolean {
  if (accessOf(school).trial) return true;
  return PLANS[school.plan].features[feature];
}

/** Nombre de comptes autorisés ; illimité pendant l'essai. */
export function userLimit(school: Pick<School, "plan" | "trial_ends_at" | "paid_until">): number | null {
  if (accessOf(school).trial) return null;
  return PLANS[school.plan].users;
}
