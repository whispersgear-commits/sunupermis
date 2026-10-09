import type { Metadata } from "next";
import Link from "next/link";
import { AuthShell } from "@/components/auth-shell";
import { ActionForm, Submit } from "@/components/ui/form";
import { Field, Input } from "@/components/ui/fields";
import { signIn } from "../auth-actions";

export const metadata: Metadata = { title: "Connexion" };

export default function ConnexionPage() {
  return (
    <AuthShell
      title="Bon retour 👋"
      subtitle="Connectez-vous à l'espace de votre auto-école."
      footer={
        <>
          Pas encore de compte ?{" "}
          <Link href="/inscription" className="font-semibold text-brand-700 hover:underline">
            Créer mon auto-école
          </Link>
        </>
      }
    >
      <ActionForm action={signIn} className="space-y-4">
        <Field label="Adresse e-mail">
          <Input name="email" type="email" required autoComplete="email" placeholder="vous@exemple.sn" />
        </Field>
        <Field label="Mot de passe">
          <Input name="password" type="password" required autoComplete="current-password" />
        </Field>
        <Submit className="w-full">Se connecter</Submit>
      </ActionForm>
    </AuthShell>
  );
}
