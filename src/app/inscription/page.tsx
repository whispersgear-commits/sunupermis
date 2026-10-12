import type { Metadata } from "next";
import Link from "next/link";
import { AuthShell } from "@/components/auth-shell";
import { ActionForm, Submit } from "@/components/ui/form";
import { Field, Input } from "@/components/ui/fields";
import { signUp } from "../auth-actions";
import { TermsCheckbox } from "@/components/legal/terms-checkbox";

export const metadata: Metadata = { title: "Créer mon auto-école" };

export default function InscriptionPage() {
  return (
    <AuthShell
      title="Créez votre auto-école"
      subtitle="Un mois gratuit, sans carte bancaire. Prêt en 2 minutes."
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
        <TermsCheckbox />
        <Submit className="w-full">Créer mon auto-école</Submit>
      </ActionForm>
    </AuthShell>
  );
}
