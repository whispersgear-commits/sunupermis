import type { Metadata } from "next";
import Link from "next/link";
import { AuthShell } from "@/components/auth-shell";
import { ActionForm, Submit } from "@/components/ui/form";
import { Field, Input } from "@/components/ui/fields";
import { signUp } from "../auth-actions";
import { TermsCheckbox } from "@/components/legal/terms-checkbox";
import { SignupPlan } from "@/components/auth/signup-plan";
import { PLANS, type PlanId } from "@/lib/plans";

export const metadata: Metadata = { title: "Créer mon auto-école" };

export default async function InscriptionPage({ searchParams }: { searchParams: Promise<{ plan?: string; mois?: string }> }) {
  const sp = await searchParams;
  const plan: PlanId = sp.plan && sp.plan in PLANS ? (sp.plan as PlanId) : "pro";
  const months = sp.mois === "12" ? 12 : 1;
  return (
    <AuthShell
      title="Créez votre auto-école"
      subtitle="Choisissez votre formule, payez en ligne, et votre espace est prêt."
      footer={
        <>
          Déjà inscrit ?{" "}
          <Link href="/connexion" className="font-semibold text-brand-700 hover:underline">
            Se connecter
          </Link>
        </>
      }
    >
      <ActionForm action={signUp} className="space-y-4">
        <Field label="Nom de l'auto-école">
          <Input name="school" required placeholder="Auto-École Teranga" />
        </Field>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Ville">
            <Input name="city" placeholder="Thiès" />
          </Field>
          <Field label="Téléphone">
            <Input name="phone" type="tel" required placeholder="77 123 45 67" />
          </Field>
        </div>
        <Field label="Votre nom">
          <Input name="name" required autoComplete="name" />
        </Field>
        <Field label="Adresse e-mail">
          <Input name="email" type="email" required autoComplete="email" />
        </Field>
        <Field label="Mot de passe" hint="8 caractères minimum.">
          <Input name="password" type="password" required minLength={8} autoComplete="new-password" />
        </Field>
        <SignupPlan defaultPlan={plan} defaultMonths={months} />
        <TermsCheckbox />
        <Submit className="w-full">Continuer vers le paiement</Submit>
      </ActionForm>
    </AuthShell>
  );
}
