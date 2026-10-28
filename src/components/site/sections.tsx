"use client";

import Link from "next/link";
import { PLAN_HIGHLIGHTS, PLANS as PLAN_DEFS, type PlanId } from "@/lib/plans";
import { PlanComparison } from "@/components/app/plan-comparison";
import { LegalLinks } from "@/components/legal/legal-page";
import { useEffect, useRef, useState } from "react";
import { AnimatePresence, animate, m as mo, useInView, useMotionValueEvent, useScroll, useTransform } from "motion/react";
import {
  BarChart3,
  CalendarDays,
  Check,
  ChevronDown,
  FileCheck2,
  MessageCircle,
  QrCode,
  Smartphone,
  Users,
  Wallet,
} from "lucide-react";
import { Logo } from "@/components/logo";
import { cn } from "@/lib/utils";
import { groupDigits } from "@/lib/format";
import { SunuAgence } from "@/components/sunu-agence";

const ease = [0.22, 1, 0.36, 1] as const;

/** Apparition au défilement, réutilisée par toutes les sections. */
function Reveal({ children, delay = 0, className }: { children: React.ReactNode; delay?: number; className?: string }) {
  return (
    <mo.div
      className={className}
      initial={{ opacity: 0, y: 32 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-80px" }}
      transition={{ duration: 0.7, delay, ease }}
    >
      {children}
    </mo.div>
  );
}

// ---------------------------------------------------------------------------
// Barre de navigation : transparente sur l'en-tête, opaque au défilement
// ---------------------------------------------------------------------------

export function Nav() {
  const { scrollY } = useScroll();
  const [solid, setSolid] = useState(false);
  useMotionValueEvent(scrollY, "change", (y) => setSolid(y > 40));

  return (
    <mo.header
      className={cn(
        "fixed inset-x-0 top-0 z-50 transition-colors duration-300",
        solid ? "border-b border-white/10 bg-asphalt/85 backdrop-blur-xl" : "bg-transparent",
      )}
      initial={{ y: -80 }}
      animate={{ y: 0 }}
      transition={{ duration: 0.6, ease }}
    >
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4 sm:px-6">
        <Logo light />
        <nav className="flex items-center gap-1 text-sm font-semibold">
          <a href="#apercu" className="hidden rounded-lg px-3 py-2 text-slate-300 hover:text-white md:block">
            Aperçu
          </a>
          <a href="#fonctionnalites" className="hidden rounded-lg px-3 py-2 text-slate-300 hover:text-white md:block">
            Fonctionnalités
          </a>
          <a href="#tarifs" className="hidden rounded-lg px-3 py-2 text-slate-300 hover:text-white md:block">
            Tarifs
          </a>
          <Link href="/connexion" className="whitespace-nowrap rounded-lg px-2 py-2 text-slate-300 hover:text-white sm:px-3">
            Connexion
          </Link>
          <Link
            href="/inscription"
            className="ml-1 whitespace-nowrap rounded-xl bg-white px-3 py-2 text-asphalt transition hover:bg-brand-50 sm:px-4"
          >
            Essai gratuit
          </Link>
        </nav>
      </div>
    </mo.header>
  );
}

// ---------------------------------------------------------------------------
// Chiffres clés animés
// ---------------------------------------------------------------------------

function Counter({ to, suffix = "" }: { to: number; suffix?: string }) {
  const ref = useRef<HTMLSpanElement>(null);
  const inView = useInView(ref, { once: true });
  const [value, setValue] = useState(0);

  useEffect(() => {
    if (!inView) return;
    const controls = animate(0, to, { duration: 1.6, ease, onUpdate: (v) => setValue(Math.round(v)) });
    return () => controls.stop();
  }, [inView, to]);

  return (
    <span ref={ref}>
      {value}
      {suffix}
    </span>
  );
}

export function Stats() {
  const stats = [
    { value: 5, suffix: " min", label: "pour inscrire un élève et son échéancier" },
    { value: 0, suffix: "", label: "double réservation : la base les refuse" },
    { value: 3, suffix: " jours", label: "d'essai gratuit, toutes les fonctions" },
    { value: 1, suffix: " clic", label: "pour relancer un impayé sur WhatsApp" },
  ];
  return (
    <section className="border-b border-line bg-surface">
      <div className="mx-auto grid max-w-6xl grid-cols-2 gap-6 px-4 py-12 sm:px-6 lg:grid-cols-4">
        {stats.map((s, i) => (
          <Reveal key={s.label} delay={i * 0.08}>
            <p className="text-3xl font-extrabold tracking-tight text-brand-600 sm:text-4xl">
              <Counter to={s.value} suffix={s.suffix} />
            </p>
            <p className="mt-1 text-sm text-muted">{s.label}</p>
          </Reveal>
        ))}
      </div>
    </section>
  );
}

// ---------------------------------------------------------------------------
// Fonctionnalités : grille en mosaïque
// ---------------------------------------------------------------------------

const FEATURES = [
  {
    icon: CalendarDays,
    title: "Planning sans double réservation",
    text: "Chaque moniteur et chaque voiture a son calendrier. Impossible de mettre deux élèves sur le même créneau.",
    big: true,
  },
  {
    icon: Wallet,
    title: "Paiements en plusieurs fois",
    text: "Échéancier créé à l'inscription, encaissements Wave, Orange Money ou espèces, reçu automatique.",
  },
  {
    icon: MessageCircle,
    title: "Rappels WhatsApp",
    text: "La veille de la leçon, avant chaque échéance : un clic et le message part.",
  },
  {
    icon: Users,
    title: "Fiche élève complète",
    text: "Coordonnées, type de permis, heures faites, solde, examens : tout au même endroit.",
  },
  {
    icon: QrCode,
    title: "Reçus avec QR code",
    text: "Chaque paiement donne un reçu numéroté, envoyé sur WhatsApp et vérifiable par l'élève.",
  },
  {
    icon: BarChart3,
    title: "Le patron voit tout, de partout",
    text: "Encaissements, impayés, leçons de la semaine : votre tableau de bord sur votre téléphone, même en voyage.",
    big: true,
  },
  {
    icon: FileCheck2,
    title: "Examens suivis",
    text: "Dates du code et de la conduite, résultats, élèves prêts à présenter.",
  },
];

export function Features() {
  return (
    <section id="fonctionnalites" className="scroll-mt-20 py-24">
      <div className="mx-auto max-w-6xl px-4 sm:px-6">
        <Reveal className="max-w-2xl">
          <p className="text-sm font-bold uppercase tracking-widest text-brand-600">Fonctionnalités</p>
          <h2 className="mt-2 text-3xl font-extrabold tracking-tight sm:text-5xl">
            Tout ce qu'il faut. <span className="text-muted">Rien de plus.</span>
          </h2>
        </Reveal>

        <div className="mt-12 grid gap-4 md:grid-cols-3">
          {FEATURES.map((f, i) => (
            <mo.div
              key={f.title}
              className={cn(
                "group relative overflow-hidden rounded-3xl border border-line bg-surface p-7",
                f.big && "md:col-span-2",
              )}
              initial={{ opacity: 0, y: 40 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-60px" }}
              transition={{ duration: 0.7, delay: (i % 3) * 0.1, ease }}
              whileHover={{ y: -6 }}
            >
              <div className="absolute -right-16 -top-16 h-40 w-40 rounded-full bg-brand-500/0 blur-2xl transition duration-500 group-hover:bg-brand-500/20" />
              <span className="grid h-12 w-12 place-items-center rounded-2xl bg-brand-50 text-brand-700 transition group-hover:scale-110 group-hover:bg-brand-600 group-hover:text-white">
                <f.icon className="h-6 w-6" />
              </span>
              <h3 className="mt-5 text-lg font-bold">{f.title}</h3>
              <p className="mt-2 max-w-md text-muted">{f.text}</p>
            </mo.div>
          ))}
        </div>
      </div>
    </section>
  );
}

// ---------------------------------------------------------------------------
// Démonstration WhatsApp : la conversation s'écrit au défilement
// ---------------------------------------------------------------------------

export function WhatsAppDemo() {
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { once: true, margin: "-120px" });
  const messages = [
    { me: true, text: "Bonjour Awa, rappel de votre leçon de conduite demain à 10:00 avec M. Diop. Merci de prévenir en cas d'empêchement." },
    { me: false, text: "Merci ! Je serai là 👍" },
    { me: true, text: "Petit rappel : il reste 50 000 FCFA à régler sur votre forfait. Vous pouvez payer par Wave." },
    { me: false, text: "C'est envoyé par Wave 🙏" },
  ];

  return (
    <section className="overflow-hidden bg-brand-900 py-24 text-white">
      <div className="mx-auto grid max-w-6xl items-center gap-14 px-4 sm:px-6 lg:grid-cols-2">
        <Reveal>
          <p className="text-sm font-bold uppercase tracking-widest text-brand-200">Rappels WhatsApp</p>
          <h2 className="mt-2 text-3xl font-extrabold tracking-tight sm:text-5xl">
            Moins d'absences.
            <br />
            Moins d'impayés.
          </h2>
          <p className="mt-5 max-w-lg text-lg text-brand-100/80">
            Vos élèves vivent sur WhatsApp. SunuPermis y prépare chaque rappel : la secrétaire n'a plus qu'à appuyer
            sur « Envoyer ».
          </p>
          <ul className="mt-6 space-y-3">
            {["Rappel la veille de chaque leçon", "Relance avant et après chaque échéance", "Message de bienvenue à l'inscription"].map(
              (item) => (
                <li key={item} className="flex items-center gap-3">
                  <span className="grid h-6 w-6 place-items-center rounded-full bg-lane text-asphalt">
                    <Check className="h-3.5 w-3.5" strokeWidth={3} />
                  </span>
                  {item}
                </li>
              ),
            )}
          </ul>
        </Reveal>

        <div ref={ref} className="mx-auto w-full max-w-sm rounded-[2rem] border border-white/10 bg-[#0b141a] p-4 shadow-2xl">
          <div className="mb-4 flex items-center gap-3 border-b border-white/10 pb-3">
            <span className="grid h-10 w-10 place-items-center rounded-full bg-brand-600 font-bold">AT</span>
            <div>
              <p className="font-semibold">Auto-École Teranga</p>
              <p className="text-xs text-brand-200">en ligne</p>
            </div>
          </div>
          <div className="space-y-2.5">
            {messages.map((m, i) => (
              <mo.div
                key={i}
                initial={{ opacity: 0, y: 16, scale: 0.92 }}
                animate={inView ? { opacity: 1, y: 0, scale: 1 } : {}}
                transition={{ delay: 0.3 + i * 0.7, type: "spring", stiffness: 300, damping: 24 }}
                className={cn(
                  "max-w-[85%] rounded-2xl px-3.5 py-2 text-sm leading-snug",
                  m.me ? "ml-auto rounded-br-sm bg-[#005c4b]" : "rounded-bl-sm bg-[#202c33]",
                )}
              >
                {m.text}
              </mo.div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

// ---------------------------------------------------------------------------
// Comment ça marche : la route se trace au défilement
// ---------------------------------------------------------------------------

export function Steps() {
  const ref = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({ target: ref, offset: ["start 80%", "end 60%"] });
  const scaleY = useTransform(scrollYProgress, [0, 1], [0, 1]);

  const steps = [
    { icon: Smartphone, title: "Créez votre école en 2 minutes", text: "Nom, ville, téléphone. Ajoutez vos moniteurs et vos voitures." },
    { icon: Users, title: "Inscrivez vos élèves", text: "Forfait, échéancier en plusieurs fois, message de bienvenue sur WhatsApp." },
    { icon: CalendarDays, title: "Planifiez les leçons", text: "Le planning refuse les doubles réservations. Chaque moniteur voit sa journée." },
    { icon: Wallet, title: "Encaissez et relancez", text: "Paiements enregistrés, impayés repérés, rappels en un clic." },
  ];

  return (
    <section className="py-24">
      <div className="mx-auto max-w-3xl px-4 sm:px-6">
        <Reveal className="text-center">
          <p className="text-sm font-bold uppercase tracking-widest text-brand-600">Comment ça marche</p>
          <h2 className="mt-2 text-3xl font-extrabold tracking-tight sm:text-5xl">Prêt en une matinée</h2>
        </Reveal>

        <div ref={ref} className="relative mt-14">
          <div className="absolute bottom-0 left-6 top-0 w-1 rounded-full bg-line" />
          <mo.div className="absolute bottom-0 left-6 top-0 w-1 origin-top rounded-full bg-brand-500" style={{ scaleY }} />
          <ol className="space-y-10">
            {steps.map((s, i) => (
              <li key={s.title} className="relative">
                <Reveal delay={i * 0.05} className="relative flex gap-6">
                  <span className="relative z-10 grid h-13 w-13 shrink-0 place-items-center rounded-2xl border-4 border-bg bg-brand-600 text-white shadow-lg">
                    <s.icon className="h-5 w-5" />
                  </span>
                  <div className="pt-1.5">
                    <p className="text-xs font-bold text-brand-600">Étape {i + 1}</p>
                    <h3 className="text-xl font-bold">{s.title}</h3>
                    <p className="mt-1 text-muted">{s.text}</p>
                  </div>
                </Reveal>
              </li>
            ))}
          </ol>
        </div>
      </div>
    </section>
  );
}

// ---------------------------------------------------------------------------
// Tarifs
// ---------------------------------------------------------------------------

// Mêmes formules et mêmes lignes que l'inscription et la page Abonnement.
const PLANS = (Object.keys(PLAN_DEFS) as PlanId[]).map((id) => ({
  id,
  name: PLAN_DEFS[id].name,
  price: groupDigits(PLAN_DEFS[id].price),
  for: PLAN_DEFS[id].pitch,
  features: PLAN_HIGHLIGHTS[id],
  featured: id === "pro",
}));

export function Pricing() {
  const [annual, setAnnual] = useState(false);

  return (
    <section id="tarifs" className="scroll-mt-20 bg-surface py-24">
      <div className="mx-auto max-w-6xl px-4 sm:px-6">
        <Reveal className="text-center">
          <p className="text-sm font-bold uppercase tracking-widest text-brand-600">Tarifs</p>
          <h2 className="mt-2 text-3xl font-extrabold tracking-tight sm:text-5xl">Un impayé récupéré, et c'est remboursé</h2>
          <div className="mx-auto mt-8 inline-flex rounded-2xl border border-line bg-bg p-1 text-sm font-semibold">
            {[false, true].map((value) => (
              <button
                key={String(value)}
                onClick={() => setAnnual(value)}
                className="relative rounded-xl px-4 py-2"
              >
                {annual === value && (
                  <mo.span layoutId="billing" className="absolute inset-0 rounded-xl bg-brand-600" transition={{ type: "spring", stiffness: 400, damping: 30 }} />
                )}
                <span className={cn("relative", annual === value ? "text-white" : "text-muted")}>
                  {value ? "Annuel · 2 mois offerts" : "Mensuel"}
                </span>
              </button>
            ))}
          </div>
        </Reveal>

        <div className="mt-12 grid gap-5 md:grid-cols-3">
          {PLANS.map((p, i) => {
            const monthly = Number(p.price.replace(/\s/g, ""));
            const shown = annual ? Math.round((monthly * 10) / 12) : monthly;
            return (
              <Reveal key={p.name} delay={i * 0.1}>
                <mo.div
                  whileHover={{ y: -8 }}
                  className={cn(
                    "relative h-full rounded-3xl border p-7",
                    p.featured ? "border-brand-600 bg-asphalt text-white shadow-2xl shadow-brand-900/30" : "border-line bg-bg",
                  )}
                >
                  {p.featured && (
                    <span className="absolute -top-3 left-7 rounded-full bg-lane px-3 py-1 text-xs font-bold text-asphalt">Le plus choisi</span>
                  )}
                  <h3 className="text-lg font-bold">{p.name}</h3>
                  <p className={cn("text-sm", p.featured ? "text-slate-400" : "text-muted")}>{p.for}</p>
                  <p className="mt-5 flex items-baseline gap-1">
                    <AnimatePresence mode="popLayout" initial={false}>
                      <mo.span
                        key={shown}
                        initial={{ opacity: 0, y: 12 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -12 }}
                        className="text-4xl font-extrabold tracking-tight"
                      >
                        {groupDigits(shown)}
                      </mo.span>
                    </AnimatePresence>
                    <span className={p.featured ? "text-slate-400" : "text-muted"}>FCFA / mois</span>
                  </p>
                  <ul className="mt-6 space-y-2.5 text-sm">
                    {p.features.map((f) => (
                      <li key={f} className="flex items-start gap-2.5">
                        <Check className={cn("mt-0.5 h-4 w-4 shrink-0", p.featured ? "text-lane" : "text-brand-600")} strokeWidth={3} />
                        {f}
                      </li>
                    ))}
                  </ul>
                  <Link
                    href={`/inscription?plan=${p.id}&mois=${annual ? 12 : 1}`}
                    className={cn(
                      "mt-8 flex h-11 items-center justify-center rounded-xl font-semibold transition",
                      p.featured ? "bg-brand-600 text-white hover:bg-brand-700" : "border border-line hover:border-brand-600 hover:text-brand-700",
                    )}
                  >
                    Essayer 3 jours gratuits
                  </Link>
                </mo.div>
              </Reveal>
            );
          })}
        </div>
        <Reveal>
          <PlanComparison className="mx-auto mt-12 max-w-4xl" />
        </Reveal>
      </div>
    </section>
  );
}

// ---------------------------------------------------------------------------
// Questions fréquentes
// ---------------------------------------------------------------------------

const FAQ = [
  { q: "Faut-il installer quelque chose ?", a: "Non. SunuPermis s'ouvre dans le navigateur du téléphone ou de l'ordinateur. Vous pouvez l'ajouter à l'écran d'accueil comme une application." },
  { q: "Mes élèves doivent-ils télécharger une application ?", a: "Non. Ils reçoivent leurs rappels sur WhatsApp, qu'ils utilisent déjà." },
  { q: "Y a-t-il un essai gratuit ?", a: "Oui : 3 jours avec toutes les fonctions, sans moyen de paiement à donner. À la fin de l'essai, vous choisissez de continuer ou non ; vos données restent gardées." },
  { q: "Comment je paie l'abonnement ?", a: "En ligne, par Wave, Orange Money ou carte bancaire. Au mois ou à l'année (2 mois offerts), sans engagement ni renouvellement automatique." },
  { q: "Mes données sont-elles protégées ?", a: "Chaque auto-école ne voit que ses propres données : la séparation est garantie par la base elle-même, pas seulement par l'écran." },
  { q: "Et si ma connexion est lente ?", a: "Les pages sont légères et fonctionnent en 3G. Les données sont sauvegardées en ligne : rien n'est perdu si votre téléphone se casse." },
];

export function Faq() {
  const [open, setOpen] = useState<number | null>(0);
  return (
    <section className="py-24">
      <div className="mx-auto max-w-3xl px-4 sm:px-6">
        <Reveal className="text-center">
          <h2 className="text-3xl font-extrabold tracking-tight sm:text-4xl">Questions fréquentes</h2>
        </Reveal>
        <div className="mt-10 space-y-3">
          {FAQ.map((item, i) => (
            <Reveal key={item.q} delay={i * 0.05}>
              <div className="overflow-hidden rounded-2xl border border-line bg-surface">
                <button
                  onClick={() => setOpen(open === i ? null : i)}
                  className="flex w-full items-center justify-between gap-4 px-5 py-4 text-left font-semibold"
                  aria-expanded={open === i}
                >
                  {item.q}
                  <mo.span animate={{ rotate: open === i ? 180 : 0 }} transition={{ duration: 0.25 }}>
                    <ChevronDown className="h-5 w-5 text-muted" />
                  </mo.span>
                </button>
                <AnimatePresence initial={false}>
                  {open === i && (
                    <mo.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: "auto", opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.3, ease }}
                    >
                      <p className="px-5 pb-5 text-muted">{item.a}</p>
                    </mo.div>
                  )}
                </AnimatePresence>
              </div>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}

// ---------------------------------------------------------------------------
// Appel final et pied de page
// ---------------------------------------------------------------------------

export function FinalCta() {
  return (
    <section className="px-4 pb-24 sm:px-6">
      <Reveal>
        <div className="relative mx-auto max-w-6xl overflow-hidden rounded-[2.5rem] bg-brand-600 px-6 py-16 text-center text-white sm:px-12">
          <div className="lane-dashes absolute inset-x-0 bottom-8 h-1.5 opacity-60" />
          <h2 className="relative text-3xl font-extrabold tracking-tight sm:text-5xl">Votre auto-école mérite mieux qu'un cahier.</h2>
          <p className="relative mx-auto mt-4 max-w-xl text-lg text-brand-50/90">
            Essayez gratuitement pendant 3 jours. Prête en 2 minutes, sans moyen de paiement.
          </p>
          <mo.div className="relative mt-8 inline-block" whileHover={{ scale: 1.04 }} whileTap={{ scale: 0.97 }}>
            <Link href="/inscription" className="inline-flex h-12 items-center rounded-2xl bg-white px-7 font-bold text-brand-800 shadow-xl">
              Commencer l'essai gratuit
            </Link>
          </mo.div>
        </div>
      </Reveal>
    </section>
  );
}

export function Footer() {
  return (
    <footer className="border-t border-line">
      <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-4 px-4 py-8 text-sm text-muted sm:flex-row sm:px-6">
        <Logo />
        <LegalLinks className="justify-center text-sm" />
        <p>© {new Date().getFullYear()} SunuPermis · Dakar, Sénégal</p>
      </div>
      <div className="flex justify-center border-t border-line px-4 py-4">
        <SunuAgence />
      </div>
    </footer>
  );
}
