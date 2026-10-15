/**
 * Informations légales de l'éditeur, reprises par les pages Conditions,
 * Confidentialité et Mentions légales. Les champs laissés à `null`
 * n'apparaissent pas : les compléter dès qu'ils sont obtenus (NINEA, RCCM,
 * numéro de déclaration à la CDP).
 */
export const LEGAL = {
  product: "SunuPermis",
  editor: "Sunu Agence",
  status: "Entreprise (immatriculation NINEA et RCCM en cours)",
  director: "Banda Ndiaye",
  city: "Dakar, Sénégal",
  address: null as string | null,
  email: "bandandiaye418@gmail.com",
  phone: "+221 78 293 24 33",
  ninea: null as string | null,
  rccm: null as string | null,
  cdpDeclaration: null as string | null,
  site: "https://sunupermis.com",
  /** Date de la version en vigueur. À changer à chaque modification. */
  updated: "15 octobre 2026",
  version: "2026-10-15",
};

export const LEGAL_PAGES = [
  { href: "/conditions", label: "Conditions d'utilisation" },
  { href: "/confidentialite", label: "Confidentialité" },
  { href: "/mentions-legales", label: "Mentions légales" },
] as const;
