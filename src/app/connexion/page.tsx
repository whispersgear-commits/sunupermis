import type { Metadata } from "next";
import { SpamTrap } from "@/components/ui/spam-trap";
import Link from "next/link";
import { AuthShell } from "@/components/auth-shell";
import { ActionForm, Submit } from "@/components/ui/form";
import { Field, Input } from "@/components/ui/fields";
import { signIn } from "../auth-actions";

export const metadata: Metadata = {
  title: "Connexion",
  description: "Connectez-vous à l'espace SunuPermis de votre auto-école.",
  alternates: { canonical: "/connexion" },
};

export default async function ConnexionPage({ searchParams }: { searchParams: Promise<{ next?: string; lien?: string }> }) {
  const { next, lien } = await searchParams;
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
      {lien === "invalide" && (
        <p className="mb-4 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900">
          Ce lien a expiré ou a déjà servi. Connectez-vous, ou redemandez un e-mail.
        </p>
      )}
      <ActionForm action={signIn} className="space-y-4">
        <SpamTrap />
        <input type="hidden" name="next" value={next ?? "/app"} />
        <Field label="Adresse e-mail">
          <Input name="email" type="email" required autoComplete="email" placeholder="vous@exemple.sn" />
        </Field>
        <Field label="Mot de passe">
          <Input name="password" type="password" required autoComplete="current-password" />
        </Field>
        <div className="flex justify-end">
          <Link href="/mot-de-passe-oublie" className="text-sm font-semibold text-brand-700 hover:underline">
            Mot de passe oublié ?
          </Link>
        </div>
        <Submit className="w-full">Se connecter</Submit>
      </ActionForm>
    </AuthShell>
  );
}
