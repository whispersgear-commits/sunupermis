import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

/**
 * Retour des liens envoyés par e-mail (confirmation d'inscription,
 * réinitialisation du mot de passe) : on échange le code contre une session,
 * puis on suit `next`, limité aux chemins internes.
 */
export async function GET(request: Request) {
  const url = new URL(request.url);
  const code = url.searchParams.get("code");
  const next = url.searchParams.get("next") ?? "/app";
  const safeNext = next.startsWith("/") && !next.startsWith("//") ? next : "/app";

  if (code) {
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) return NextResponse.redirect(new URL(safeNext, url.origin));
  }
  return NextResponse.redirect(new URL("/connexion?lien=invalide", url.origin));
}
