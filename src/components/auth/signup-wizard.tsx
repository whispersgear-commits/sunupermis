"use client";

import { useRef, useState } from "react";
import { SpamTrap } from "@/components/ui/spam-trap";
import Link from "next/link";
import { AnimatePresence, m as mo } from "motion/react";
import { ArrowLeft, ArrowRight, Building2, Check, Eye, EyeOff, Gift, ShieldCheck, Sparkles, UserRound } from "lucide-react";
import { cn } from "@/lib/utils";
import { money } from "@/lib/format";
import { PLAN_HIGHLIGHTS, PLANS, planPrice, type PlanId } from "@/lib/plans";
import { PlanComparison } from "@/components/app/plan-comparison";
import { ActionForm, Submit } from "@/components/ui/form";
import { Field, Input } from "@/components/ui/fields";
import { TermsCheckbox } from "@/components/legal/terms-checkbox";
import { signUp } from "@/app/auth-actions";

const FEATURES = PLAN_HIGHLIGHTS;

const STEPS = [
  { id: "formule", label: "Formule", icon: Sparkles },
  { id: "ecole", label: "Auto-école", icon: Building2 },
  { id: "compte", label: "Compte", icon: UserRound },
  { id: "essai", label: "Essai gratuit", icon: Gift },
] as const;

const accounts = (id: PlanId) => {
  const n = PLANS[id].users;
  return n === null ? "Comptes illimités" : `${n} compte${n > 1 ? "s" : ""}`;
};

/**
 * Inscription en quatre étapes. Tous les champs restent dans un seul
 * formulaire (les étapes masquées gardent leurs saisies) : l'action serveur
 * `signUp` reçoit tout d'un coup, à la dernière étape.
 */
export function SignupWizard({ defaultPlan, defaultMonths }: { defaultPlan: PlanId; defaultMonths: 1 | 12 }) {
  const [step, setStep] = useState(0);
  const [dir, setDir] = useState(1);
  const [plan, setPlan] = useState<PlanId>(defaultPlan);
  const [months, setMonths] = useState<1 | 12>(defaultMonths);
  const [showPwd, setShowPwd] = useState(false);
  const [values, setValues] = useState({ school: "", city: "", phone: "", name: "", email: "", password: "" });
  const panels = useRef<(HTMLDivElement | null)[]>([]);

  const total = planPrice(plan, months);
  const set = (k: keyof typeof values) => (e: React.ChangeEvent<HTMLInputElement>) => setValues((v) => ({ ...v, [k]: e.target.value }));

  function go(to: number) {
    // On n'avance qu'avec une étape valide (champs requis, e-mail…).
    if (to > step) {
      const inputs = panels.current[step]?.querySelectorAll("input") ?? [];
      for (const input of Array.from(inputs)) {
        if (!input.checkValidity()) {
          input.reportValidity();
          return;
        }
      }
    }
    setDir(to > step ? 1 : -1);
    setStep(to);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  const next = (e: React.KeyboardEvent) => {
    // Entrée passe à l'étape suivante au lieu d'envoyer le formulaire.
    if (e.key === "Enter" && step < 3 && (e.target as HTMLElement).tagName === "INPUT") {
      e.preventDefault();
      go(step + 1);
    }
  };

  return (
    <div className="mx-auto w-full max-w-5xl">
      <Stepper step={step} onGo={(i) => i < step && go(i)} />

      <div className="mt-8 grid gap-8 lg:grid-cols-[1fr_320px]">
        <ActionForm action={signUp} className="min-w-0">
          <div onKeyDown={next}>
            <SpamTrap />
            <input type="hidden" name="plan" value={plan} />
            <input type="hidden" name="months" value={months} />

            {/* Étape 1 : formule */}
            <Panel index={0} step={step} dir={dir} panels={panels}>
              <StepTitle n={1} title="Choisissez votre formule" text="3 jours d'essai gratuit avec toutes les fonctions, sans moyen de paiement. Vous pourrez changer de formule plus tard." />
              <div className="mb-5 inline-flex rounded-2xl border border-line bg-surface p-1 text-sm font-semibold">
                {([1, 12] as const).map((m) => (
                  <button
                    key={m}
                    type="button"
                    onClick={() => setMonths(m)}
                    className={cn("relative rounded-xl px-4 py-2 transition", months === m ? "text-white" : "text-muted hover:text-ink")}
                  >
                    {months === m && <mo.span layoutId="signup-months" className="absolute inset-0 rounded-xl bg-brand-600" transition={{ type: "spring", stiffness: 400, damping: 32 }} />}
                    <span className="relative">
                      {m === 1 ? "Mensuel" : "Annuel"}
                      {m === 12 && <span className={cn("ml-2 rounded-full px-2 py-0.5 text-[11px]", months === 12 ? "bg-white/20" : "bg-lane-soft text-amber-800")}>2 mois offerts</span>}
                    </span>
                  </button>
                ))}
              </div>
              <div className="grid gap-4 md:grid-cols-3">
                {(Object.keys(PLANS) as PlanId[]).map((id) => {
                  const selected = plan === id;
                  return (
                    <button
                      key={id}
                      type="button"
                      onClick={() => setPlan(id)}
                      aria-pressed={selected}
                      className={cn(
                        "relative flex flex-col rounded-3xl border bg-surface p-5 text-left transition",
                        selected ? "border-brand-600 shadow-xl shadow-brand-600/10 ring-2 ring-brand-600" : "border-line hover:border-brand-600/40 hover:shadow-lg",
                      )}
                    >
                      {id === "pro" && (
                        <span className="absolute -top-3 left-5 rounded-full bg-lane px-3 py-1 text-xs font-bold text-asphalt">Recommandé</span>
                      )}
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <p className="text-lg font-bold">{PLANS[id].name}</p>
                          <p className="text-sm text-muted">{PLANS[id].pitch}</p>
                        </div>
                        <span
                          className={cn(
                            "grid h-6 w-6 shrink-0 place-items-center rounded-full border-2 transition",
                            selected ? "border-brand-600 bg-brand-600 text-white" : "border-line",
                          )}
                        >
                          {selected && <Check className="h-3.5 w-3.5" strokeWidth={3} />}
                        </span>
                      </div>
                      <p className="mt-5 text-3xl font-extrabold tracking-tight">{money(months === 12 ? Math.round(planPrice(id, 12) / 12) : planPrice(id, 1))}</p>
                      <p className="text-xs text-muted">{months === 1 ? "par mois" : `par mois, soit ${money(planPrice(id, 12))} par an`}</p>
                      <p className="mt-4 inline-flex w-fit items-center gap-1.5 rounded-full bg-brand-50 px-2.5 py-1 text-xs font-semibold text-brand-700 dark:bg-brand-900/40 dark:text-brand-200">
                        <UserRound className="h-3.5 w-3.5" />
                        {accounts(id)}
                      </p>
                      <ul className="mt-4 space-y-2 border-t border-line pt-4 text-sm">
                        {FEATURES[id].map((f) => (
                          <li key={f} className="flex gap-2">
                            <Check className="mt-0.5 h-4 w-4 shrink-0 text-brand-600" strokeWidth={3} />
                            <span>{f}</span>
                          </li>
                        ))}
                      </ul>
                    </button>
                  );
                })}
              </div>
              <details className="group mt-5">
                <summary className="inline-flex cursor-pointer list-none items-center gap-1.5 text-sm font-semibold text-brand-700 hover:underline">
                  Comparer les formules en détail
                  <ArrowRight className="h-4 w-4 transition group-open:rotate-90" />
                </summary>
                <PlanComparison className="mt-4" highlight={plan} />
              </details>
              <Nav onNext={() => go(1)} nextLabel={`Continuer avec ${PLANS[plan].name}`} />
            </Panel>

            {/* Étape 2 : auto-école */}
            <Panel index={1} step={step} dir={dir} panels={panels}>
              <StepTitle n={2} title="Votre auto-école" text="Ces informations apparaissent sur vos reçus et vos factures." />
              <div className="space-y-4 rounded-3xl border border-line bg-surface p-5 sm:p-6">
                <Field label="Nom de l'auto-école">
                  <Input name="school" required minLength={2} placeholder="Auto-École Teranga" value={values.school} onChange={set("school")} />
                </Field>
                <div className="grid gap-4 sm:grid-cols-2">
                  <Field label="Ville">
                    <Input name="city" placeholder="Thiès" value={values.city} onChange={set("city")} />
                  </Field>
                  <Field label="Téléphone" hint="Numéro sénégalais, ex. 77 123 45 67.">
                    <div className="relative">
                      <span className="pointer-events-none absolute inset-y-0 left-3.5 grid place-items-center text-sm font-semibold text-muted">+221</span>
                      <Input
                        name="phone"
                        type="tel"
                        required
                        inputMode="tel"
                        pattern="[0-9 +().-]{9,}"
                        placeholder="77 123 45 67"
                        className="pl-14"
                        value={values.phone}
                        onChange={set("phone")}
                      />
                    </div>
                  </Field>
                </div>
              </div>
              <Nav onBack={() => go(0)} onNext={() => go(2)} />
            </Panel>

            {/* Étape 3 : compte */}
            <Panel index={2} step={step} dir={dir} panels={panels}>
              <StepTitle n={3} title="Votre compte" text="Vous serez le propriétaire de l'espace : vous inviterez ensuite votre équipe." />
              <div className="space-y-4 rounded-3xl border border-line bg-surface p-5 sm:p-6">
                <Field label="Votre nom complet">
                  <Input name="name" required minLength={2} autoComplete="name" placeholder="Banda Ndiaye" value={values.name} onChange={set("name")} />
                </Field>
                <Field label="Adresse e-mail" hint="Pour vous connecter et recevoir vos factures.">
                  <Input name="email" type="email" required autoComplete="email" placeholder="vous@exemple.sn" value={values.email} onChange={set("email")} />
                </Field>
                <Field label="Mot de passe" hint="8 caractères minimum.">
                  <div className="relative">
                    <Input name="password" type={showPwd ? "text" : "password"} required minLength={8} autoComplete="new-password" className="pr-12" value={values.password} onChange={set("password")} />
                    <button
                      type="button"
                      onClick={() => setShowPwd((s) => !s)}
                      aria-label={showPwd ? "Masquer le mot de passe" : "Afficher le mot de passe"}
                      className="absolute inset-y-0 right-2 grid w-9 place-items-center text-muted hover:text-ink"
                    >
                      {showPwd ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                </Field>
              </div>
              <Nav onBack={() => go(1)} onNext={() => go(3)} nextLabel="Vérifier et terminer" />
            </Panel>

            {/* Étape 4 : récapitulatif et paiement */}
            <Panel index={3} step={step} dir={dir} panels={panels}>
              <StepTitle n={4} title="Récapitulatif" text="Vérifiez vos informations : votre espace s'ouvre tout de suite, gratuitement pendant 3 jours." />
              <div className="divide-y divide-line overflow-hidden rounded-3xl border border-line bg-surface">
                <Recap title="Formule" onEdit={() => go(0)}>
                  {PLANS[plan].name} · {months === 1 ? "mensuel" : "annuel"} · {accounts(plan).toLowerCase()}
                </Recap>
                <Recap title="Auto-école" onEdit={() => go(1)}>
                  {values.school || "—"}
                  {values.city && ` · ${values.city}`}
                  {values.phone && ` · ${values.phone}`}
                </Recap>
                <Recap title="Propriétaire" onEdit={() => go(2)}>
                  {values.name || "—"} · {values.email || "—"}
                </Recap>
              </div>

              <div className="mt-5 rounded-3xl border border-line bg-surface p-5 sm:p-6">
                <div className="flex items-baseline justify-between gap-4">
                  <span className="font-semibold">À payer aujourd'hui</span>
                  <span className="whitespace-nowrap text-2xl font-extrabold tracking-tight text-brand-700 dark:text-brand-200">0 FCFA</span>
                </div>
                <p className="mt-1 text-sm text-muted">
                  3 jours d'essai gratuit, toutes les fonctions incluses. Ensuite, pour continuer : <b className="text-ink">{money(total)}</b>{" "}
                  {months === 1 ? "par mois" : `pour 12 mois (${money(planPrice(plan, 1) * 2)} d'économie)`}. Sans engagement : sans paiement, l'accès se met
                  simplement en pause et vos données sont gardées.
                </p>
              </div>

              <div className="mt-5">
                <TermsCheckbox />
              </div>

              <div className="mt-6 flex flex-col-reverse gap-3 sm:flex-row sm:items-center sm:justify-between">
                <BackButton onClick={() => go(2)} />
                <Submit className="h-12 w-full px-7 text-base sm:w-auto">
                  <Gift className="h-4 w-4" />
                  Commencer mes 3 jours gratuits
                </Submit>
              </div>
              <p className="mt-4 flex items-center gap-2 text-xs text-muted">
                <ShieldCheck className="h-4 w-4 text-brand-600" />
                Aucun moyen de paiement demandé maintenant. Vous paierez seulement si vous continuez.
              </p>
            </Panel>
          </div>
        </ActionForm>

        <OrderSummary plan={plan} months={months} total={total} />
      </div>
    </div>
  );
}

function Stepper({ step, onGo }: { step: number; onGo: (i: number) => void }) {
  return (
    <ol className="flex items-center gap-2 sm:gap-3">
      {STEPS.map((s, i) => {
        const done = i < step;
        const active = i === step;
        const Icon = s.icon;
        return (
          <li key={s.id} className="flex flex-1 items-center gap-2 sm:gap-3">
            <button
              type="button"
              onClick={() => onGo(i)}
              disabled={!done}
              className={cn("flex items-center gap-2 text-left", done && "cursor-pointer")}
              aria-current={active ? "step" : undefined}
              aria-label={`Étape ${i + 1} sur ${STEPS.length} : ${s.label}`}
            >
              <span
                className={cn(
                  "grid h-9 w-9 shrink-0 place-items-center rounded-full border-2 text-sm font-bold transition",
                  done && "border-brand-600 bg-brand-600 text-white",
                  active && "border-brand-600 bg-brand-50 text-brand-700 dark:bg-brand-900/40 dark:text-brand-200",
                  !done && !active && "border-line text-muted",
                )}
              >
                {done ? <Check className="h-4 w-4" strokeWidth={3} /> : <Icon className="h-4 w-4" />}
              </span>
              <span className={cn("hidden text-sm font-semibold sm:block", active ? "text-ink" : "text-muted")}>{s.label}</span>
            </button>
            {i < STEPS.length - 1 && (
              <span className="relative h-0.5 flex-1 overflow-hidden rounded-full bg-line">
                <mo.span className="absolute inset-y-0 left-0 bg-brand-600" animate={{ width: done ? "100%" : "0%" }} transition={{ duration: 0.4 }} />
              </span>
            )}
          </li>
        );
      })}
    </ol>
  );
}

/** Étape : montée tant qu'elle est active, masquée sinon (les champs restent dans le formulaire). */
function Panel({
  index,
  step,
  dir,
  panels,
  children,
}: {
  index: number;
  step: number;
  dir: number;
  panels: React.RefObject<(HTMLDivElement | null)[]>;
  children: React.ReactNode;
}) {
  const active = index === step;
  return (
    <div
      ref={(el) => {
        panels.current[index] = el;
      }}
      hidden={!active}
    >
      <AnimatePresence mode="wait" initial={false}>
        {active && (
          <mo.div key={index} initial={{ opacity: 0, x: 24 * dir }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}>
            {children}
          </mo.div>
        )}
      </AnimatePresence>
      {/* Champs des étapes masquées : gardés hors animation pour rester envoyés. */}
      {!active && <div className="hidden">{children}</div>}
    </div>
  );
}

function StepTitle({ n, title, text }: { n: number; title: string; text: string }) {
  return (
    <div className="mb-6">
      <p className="text-xs font-bold uppercase tracking-widest text-brand-600">Étape {n} sur 4</p>
      <h1 className="mt-1 text-2xl font-extrabold tracking-tight sm:text-3xl">{title}</h1>
      <p className="mt-1.5 text-muted">{text}</p>
    </div>
  );
}

function BackButton({ onClick }: { onClick: () => void }) {
  return (
    <button type="button" onClick={onClick} className="inline-flex h-11 items-center justify-center gap-2 rounded-xl px-4 text-sm font-semibold text-muted transition hover:text-ink">
      <ArrowLeft className="h-4 w-4" /> Retour
    </button>
  );
}

function Nav({ onBack, onNext, nextLabel = "Continuer" }: { onBack?: () => void; onNext: () => void; nextLabel?: string }) {
  return (
    <div className="mt-6 flex flex-col-reverse gap-3 sm:flex-row sm:items-center sm:justify-between">
      {onBack ? <BackButton onClick={onBack} /> : <span />}
      <button
        type="button"
        onClick={onNext}
        className="inline-flex h-12 items-center justify-center gap-2 rounded-xl bg-brand-600 px-7 text-base font-semibold text-white shadow-lg shadow-brand-600/25 transition hover:bg-brand-700"
      >
        {nextLabel} <ArrowRight className="h-4 w-4" />
      </button>
    </div>
  );
}

function Recap({ title, onEdit, children }: { title: string; onEdit: () => void; children: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-4 px-5 py-4">
      <div className="min-w-0">
        <p className="text-xs font-semibold uppercase tracking-wide text-muted">{title}</p>
        <p className="mt-0.5 truncate font-semibold">{children}</p>
      </div>
      <button type="button" onClick={onEdit} className="shrink-0 text-sm font-semibold text-brand-700 hover:underline">
        Modifier
      </button>
    </div>
  );
}

/** Commande en cours, visible à toutes les étapes sur ordinateur. */
function OrderSummary({ plan, months, total }: { plan: PlanId; months: 1 | 12; total: number }) {
  return (
    <aside className="hidden lg:block">
      <div className="sticky top-8 rounded-3xl bg-asphalt p-6 text-white shadow-2xl shadow-black/20">
        <p className="text-xs font-bold uppercase tracking-widest text-brand-200">Votre commande</p>
        <p className="mt-3 text-xl font-bold">SunuPermis {PLANS[plan].name}</p>
        <p className="text-sm text-slate-400">
          {months === 1 ? "Abonnement mensuel" : "Abonnement annuel"} · {accounts(plan).toLowerCase()}
        </p>
        <ul className="mt-5 space-y-2 text-sm text-slate-300">
          {FEATURES[plan].slice(0, 4).map((f) => (
            <li key={f} className="flex gap-2">
              <Check className="mt-0.5 h-4 w-4 shrink-0 text-lane" strokeWidth={3} />
              {f}
            </li>
          ))}
        </ul>
        <div className="mt-6 space-y-2 border-t border-white/10 pt-5 text-sm">
          <div className="flex justify-between text-slate-400">
            <span>{months === 1 ? "1 mois" : "12 mois"}</span>
            <span>{money(planPrice(plan, 1) * months)}</span>
          </div>
          {months === 12 && (
            <div className="flex justify-between text-lane">
              <span>2 mois offerts</span>
              <span>− {money(planPrice(plan, 1) * 2)}</span>
            </div>
          )}
          <div className="flex items-baseline justify-between pt-2">
            <span className="font-semibold">Après l'essai</span>
            <span className="text-2xl font-extrabold">{money(total)}</span>
          </div>
          <div className="flex items-baseline justify-between text-lane">
            <span className="font-semibold">Aujourd'hui</span>
            <span className="text-lg font-extrabold">0 FCFA · 3 jours offerts</span>
          </div>
        </div>
        <p className="mt-5 flex items-start gap-2 text-xs text-slate-400">
          <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-brand-400" />
          Essai sans engagement. Ensuite, paiement sécurisé par Wave, Orange Money ou carte.
        </p>
        <div className="lane-dashes mt-6 h-1.5 w-full opacity-70" />
      </div>
      <p className="mt-4 text-center text-sm text-muted">
        Déjà inscrit ?{" "}
        <Link href="/connexion" className="font-semibold text-brand-700 hover:underline">
          Se connecter
        </Link>
      </p>
    </aside>
  );
}
