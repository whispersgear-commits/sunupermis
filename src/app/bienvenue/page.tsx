import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { AuthShell } from "@/components/auth-shell";
import { ActionForm, Submit } from "@/components/ui/form";
import { Field, Input } from "@/components/ui/fields";
import { createClient } from "@/lib/supabase/server";
import { getContext } from "@/lib/session";
import { createSchool } from "../auth-actions";

export const metadata: Metadata = { title: "Bienvenue" };

/**
 * Premier passage d'un compte sans école, typiquement après la
 * confirmation de l'e-mail. Invité : on accepte l'invitation gardée dans le
 * profil. Sinon : on confirme les informations de l'école saisies à
 * l'inscription.
 */
export default async function BienvenuePage() {
  const ctx = await getContext();
  if (!ctx) redirect("/connexion");
  if (ctx !== "no-school") redirect("/app");

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const meta = (user?.user_metadata ?? {}) as Record<string, string>;

  if (meta.invite_token) {
    const { error } = await supabase.rpc("accept_invitation", { invite_token: meta.invite_token });
    if (!error) redirect("/app");
  }

  return (
    <AuthShell
      title="Dernière étape"
      subtitle={meta.invite_token ? "Votre invitation a expiré : créez votre propre auto-école, ou demandez un nouveau lien." : "Confirmez les informations de votre auto-école."}
    >
      <ActionForm action={createSchool} className="space-y-4">
        <Field label="Nom de l'auto-école">
          <Input name="school" required defaultValue={meta.school_name ?? ""} />
        </Field>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Ville">
            <Input name="city" defaultValue={meta.school_city ?? ""} />
          </Field>
          <Field label="Téléphone">
            <Input name="phone" type="tel" defaultValue={meta.school_phone ?? ""} />
          </Field>
        </div>
        <input type="hidden" name="plan" value={meta.plan ?? ""} />
        <input type="hidden" name="months" value={String(meta.plan_months ?? "")} />
        <Submit className="w-full">Continuer vers le paiement</Submit>
      </ActionForm>
    </AuthShell>
  );
}
