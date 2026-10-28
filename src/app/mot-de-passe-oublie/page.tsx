import type { Metadata } from "next";
import { SpamTrap } from "@/components/ui/spam-trap";
import Link from "next/link";
import { AuthShell } from "@/components/auth-shell";
import { ActionForm, Submit } from "@/components/ui/form";
import { Field, Input } from "@/components/ui/fields";
import { forgotPassword } from "../auth-actions";

export const metadata: Metadata = {
  title: "Mot de passe oublié",
  description: "Recevez un lien par e-mail pour choisir un nouveau mot de passe SunuPermis.",
  robots: { index: false },
};

export default function MotDePasseOubliePage() {
  return (
    <AuthShell
      title="Mot de passe oublié"
      subtitle="Indiquez votre e-mail : nous vous envoyons un lien pour en choisir un nouveau."
      footer={
        <Link href="/connexion" className="font-semibold text-brand-700 hover:underline">
          ← Retour à la connexion
        </Link>
      }
    >
      <ActionForm action={forgotPassword} className="space-y-4" resetOnSuccess>
        <SpamTrap />
        <Field label="Adresse e-mail">
          <Input name="email" type="email" required autoComplete="email" />
        </Field>
        <Submit className="w-full">Envoyer le lien</Submit>
      </ActionForm>
    </AuthShell>
  );
}
