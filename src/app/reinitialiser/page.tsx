import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { AuthShell } from "@/components/auth-shell";
import { ActionForm, Submit } from "@/components/ui/form";
import { Field, Input } from "@/components/ui/fields";
import { createClient } from "@/lib/supabase/server";
import { resetPassword } from "../auth-actions";

export const metadata: Metadata = { title: "Nouveau mot de passe" };

/** Atteinte par le lien de réinitialisation, après `/auth/callback`. */
export default async function ReinitialiserPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/mot-de-passe-oublie");

  return (
    <AuthShell title="Nouveau mot de passe" subtitle={`Pour le compte ${user.email}.`}>
      <ActionForm action={resetPassword} className="space-y-4">
        <Field label="Nouveau mot de passe" hint="8 caractères minimum.">
          <Input name="password" type="password" required minLength={8} autoComplete="new-password" />
        </Field>
        <Field label="Confirmer">
          <Input name="confirm" type="password" required minLength={8} autoComplete="new-password" />
        </Field>
        <Submit className="w-full">Enregistrer</Submit>
      </ActionForm>
    </AuthShell>
  );
}
