import type { Metadata } from "next";
import { SpamTrap } from "@/components/ui/spam-trap";
import { TermsCheckbox } from "@/components/legal/terms-checkbox";
import Link from "next/link";
import { AuthShell } from "@/components/auth-shell";
import { ActionForm, Submit } from "@/components/ui/form";
import { Field, Input } from "@/components/ui/fields";
import { createClient } from "@/lib/supabase/server";
import { ROLE_LABEL, type Role } from "@/lib/types";
import { acceptInvite, signUp } from "../../auth-actions";

export const metadata: Metadata = { title: "Rejoindre une auto-école", robots: { index: false } };

/**
 * Page ouverte depuis le lien d'invitation envoyé par le propriétaire.
 * Elle n'affiche que ce que la fonction `invitation_info` laisse sortir :
 * le nom de l'école, le rôle et le nom prévu.
 */
export default async function RejoindrePage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const supabase = await createClient();
  const [{ data: info }, { data: auth }] = await Promise.all([
    /^[0-9a-f]{36}$/.test(token) ? supabase.rpc("invitation_info", { invite_token: token }).maybeSingle() : Promise.resolve({ data: null }),
    supabase.auth.getUser(),
  ]);
  const invitation = info as { school_name: string; role: Role; label: string; valid: boolean } | null;

  if (!invitation || !invitation.valid) {
    return (
      <AuthShell title="Lien expiré" subtitle="Cette invitation n'est plus valable : elle a expiré, a déjà servi ou a été annulée.">
        <p className="text-sm text-muted">Demandez un nouveau lien au responsable de l'auto-école.</p>
        <Link href="/" className="mt-6 inline-flex font-semibold text-brand-700 hover:underline">
          Découvrir SunuPermis
        </Link>
      </AuthShell>
    );
  }

  const role = ROLE_LABEL[invitation.role].toLowerCase();

  if (auth.user) {
    return (
      <AuthShell title={`Rejoindre ${invitation.school_name}`} subtitle={`Vous êtes invité en tant que ${role}.`}>
        <ActionForm action={acceptInvite} className="space-y-4">
          <input type="hidden" name="invite" value={token} />
          <p className="text-sm text-muted">Connecté en tant que {auth.user.email}.</p>
          <Submit className="w-full">Rejoindre l'auto-école</Submit>
        </ActionForm>
      </AuthShell>
    );
  }

  return (
    <AuthShell
      title={`Rejoindre ${invitation.school_name}`}
      subtitle={`Créez votre compte de ${role}.`}
      footer={
        <>
          Déjà un compte ?{" "}
          <Link href={`/connexion?next=/rejoindre/${token}`} className="font-semibold text-brand-700 hover:underline">
            Se connecter
          </Link>
        </>
      }
    >
      <ActionForm action={signUp} className="space-y-4">
        <SpamTrap />
        <input type="hidden" name="invite" value={token} />
        <Field label="Votre nom">
          <Input name="name" required defaultValue={invitation.label} autoComplete="name" />
        </Field>
        <Field label="Adresse e-mail">
          <Input name="email" type="email" required autoComplete="email" />
        </Field>
        <Field label="Mot de passe" hint="8 caractères minimum.">
          <Input name="password" type="password" required minLength={8} autoComplete="new-password" />
        </Field>
        <TermsCheckbox />
        <Submit className="w-full">Créer mon compte</Submit>
      </ActionForm>
    </AuthShell>
  );
}
