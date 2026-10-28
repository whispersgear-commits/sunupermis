"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { normalizePhone } from "@/lib/phone";
import { siteOrigin } from "@/lib/session";
import type { FormState } from "@/components/ui/form";
import { LEGAL } from "@/lib/legal";
import { isSpam } from "@/lib/spam";
import { PLANS } from "@/lib/plans";

const text = (fd: FormData, k: string) => String(fd.get(k) ?? "").trim();
const TOKEN = /^[0-9a-f]{36}$/;
const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;


/** Une destination de retour n'est suivie que si elle reste dans le site. */
function safePath(path: string, fallback = "/app"): string {
  return path.startsWith("/") && !path.startsWith("//") ? path : fallback;
}

export async function signIn(_s: FormState, fd: FormData): Promise<FormState> {
  if (isSpam(fd, 0)) return { error: "Envoi refusé. Patientez un instant puis réessayez." };
  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword({
    email: text(fd, "email").toLowerCase(),
    password: String(fd.get("password") ?? ""),
  });
  if (error) {
    return {
      error: error.message.toLowerCase().includes("confirm")
        ? "Confirmez d'abord votre adresse e-mail (lien reçu par e-mail)."
        : "E-mail ou mot de passe incorrect.",
    };
  }
  redirect(safePath(text(fd, "next")));
}

/**
 * Inscription.
 *
 * Sans invitation, le compte crée sa propre école. Avec une invitation, il
 * rejoint l'école qui l'a invité. Les informations sont aussi gardées dans le
 * profil : si Supabase demande de confirmer l'e-mail avant la première
 * connexion, l'école est créée (ou l'invitation acceptée) au retour, sur
 * `/bienvenue`.
 */
export async function signUp(_s: FormState, fd: FormData): Promise<FormState> {
  if (isSpam(fd)) return { error: "Envoi refusé. Patientez un instant puis réessayez." };
  const invite = text(fd, "invite");
  const isInvite = TOKEN.test(invite);
  const school = text(fd, "school");
  const city = text(fd, "city");
  const fullName = text(fd, "name");
  const email = text(fd, "email").toLowerCase();
  const password = String(fd.get("password") ?? "");
  const phone = normalizePhone(text(fd, "phone"));
  const plan = text(fd, "plan") in PLANS ? text(fd, "plan") : "pro";
  const months = text(fd, "months") === "12" ? 12 : 1;

  if (fullName.length < 2 || fullName.length > 120) return { error: "Indiquez votre nom." };
  if (!EMAIL.test(email) || email.length > 200) return { error: "Adresse e-mail invalide." };
  if (school.length > 120) return { error: "Nom de l'auto-école trop long." };
  if (password.length > 72) return { error: "Mot de passe trop long (72 caractères au plus)." };
  if (!isInvite && school.length < 2) return { error: "Indiquez le nom de l'auto-école." };
  if (!isInvite && !phone) return { error: "Numéro de téléphone invalide." };
  if (password.length < 8) return { error: "Le mot de passe doit faire au moins 8 caractères." };
  if (fd.get("terms") !== "on") return { error: "Acceptez les conditions d'utilisation et la politique de confidentialité pour continuer." };

  const supabase = await createClient();
  const origin = await siteOrigin();
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      emailRedirectTo: `${origin}/auth/callback?next=/bienvenue`,
      // La version acceptée des conditions est gardée avec le compte.
      data: isInvite
        ? { full_name: fullName, invite_token: invite, terms_version: LEGAL.version, terms_accepted_at: new Date().toISOString() }
        : { full_name: fullName, school_name: school, school_city: city, school_phone: phone, plan, plan_months: months, terms_version: LEGAL.version, terms_accepted_at: new Date().toISOString() },
    },
  });
  if (error) {
    return {
      error: error.message.toLowerCase().includes("registered")
        ? "Un compte existe déjà avec cet e-mail. Connectez-vous."
        : "Inscription impossible. Réessayez.",
    };
  }
  if (!data.session) {
    return { success: "Compte créé ! Ouvrez l'e-mail de confirmation que nous venons d'envoyer pour continuer." };
  }

  if (isInvite) {
    const { error: joinError } = await supabase.rpc("accept_invitation", { invite_token: invite });
    if (joinError) return { error: "Compte créé, mais l'invitation est invalide ou expirée. Demandez un nouveau lien." };
    redirect("/app");
  }

  const { error: rpcError } = await supabase.rpc("create_school", { school_name: school, school_city: city, school_phone: phone });
  if (rpcError) return { error: "Le compte est créé, mais pas l'école. Connectez-vous pour terminer." };
  // Essai gratuit de 3 jours : l'espace s'ouvre tout de suite.
  redirect("/app?bienvenue=1");
}

export async function createSchool(_s: FormState, fd: FormData): Promise<FormState> {
  const name = text(fd, "school");
  if (name.length < 2) return { error: "Indiquez le nom de l'auto-école." };
  const supabase = await createClient();
  const { error } = await supabase.rpc("create_school", {
    school_name: name,
    school_city: text(fd, "city"),
    school_phone: normalizePhone(text(fd, "phone")) ?? "",
  });
  if (error) return { error: "Création impossible. Réessayez." };
  redirect("/app?bienvenue=1");
}

/** Un compte déjà connecté accepte une invitation. */
export async function acceptInvite(_s: FormState, fd: FormData): Promise<FormState> {
  const invite = text(fd, "invite");
  if (!TOKEN.test(invite)) return { error: "Lien d'invitation invalide." };
  const supabase = await createClient();
  const { error } = await supabase.rpc("accept_invitation", { invite_token: invite });
  if (error) {
    return { error: error.message.includes("déjà membre") ? "Vous faites déjà partie de cette auto-école." : "Invitation invalide ou expirée." };
  }
  redirect("/app");
}

export async function forgotPassword(_s: FormState, fd: FormData): Promise<FormState> {
  if (isSpam(fd)) return { error: "Envoi refusé. Patientez un instant puis réessayez." };
  const email = text(fd, "email").toLowerCase();
  if (!EMAIL.test(email)) return { error: "Adresse e-mail invalide." };
  const supabase = await createClient();
  const origin = await siteOrigin();
  await supabase.auth.resetPasswordForEmail(email, { redirectTo: `${origin}/auth/callback?next=/reinitialiser` });
  // Même réponse que le compte existe ou non : ne pas révéler qui est inscrit.
  return { success: "Si un compte existe avec cette adresse, un lien de réinitialisation vient d'être envoyé." };
}

export async function resetPassword(_s: FormState, fd: FormData): Promise<FormState> {
  const password = String(fd.get("password") ?? "");
  if (password.length < 8) return { error: "Le mot de passe doit faire au moins 8 caractères." };
  if (password !== String(fd.get("confirm") ?? "")) return { error: "Les deux mots de passe ne correspondent pas." };
  const supabase = await createClient();
  const { error } = await supabase.auth.updateUser({ password });
  if (error) return { error: "Lien expiré. Redemandez un e-mail de réinitialisation." };
  redirect("/app");
}

export async function signOut() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/connexion");
}
