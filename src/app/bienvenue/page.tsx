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
 * Premier passage d'un compte sans école : celui qui a dû confirmer son
 * e-mail avant de se connecter. Les informations saisies à l'inscription sont
 * reprises du profil pour qu'il n'ait qu'à valider.
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

  return (
    <AuthShell title="Dernière étape" subtitle="Confirmez les informations de votre auto-école.">
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
        <Submit className="w-full">Ouvrir mon espace</Submit>
      </ActionForm>
    </AuthShell>
  );
}
