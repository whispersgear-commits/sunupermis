"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { normalizePhone } from "@/lib/phone";
import type { FormState } from "@/components/ui/form";

const text = (fd: FormData, k: string) => String(fd.get(k) ?? "").trim();

export async function signIn(_s: FormState, fd: FormData): Promise<FormState> {
  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword({
    email: text(fd, "email").toLowerCase(),
    password: String(fd.get("password") ?? ""),
  });
  if (error) {
    return {
      error: error.message.includes("confirm")
        ? "Confirmez d'abord votre adresse e-mail (lien reçu par e-mail)."
        : "E-mail ou mot de passe incorrect.",
    };
  }
  redirect("/app");
}

/**
 * Inscription : crée le compte, puis l'école. Le nom de l'école est aussi
 * gardé dans le profil du compte : si Supabase demande de confirmer l'e-mail
 * avant la première connexion, l'école sera créée à ce moment-là (voir
 * `/bienvenue`).
 */
export async function signUp(_s: FormState, fd: FormData): Promise<FormState> {
  const school = text(fd, "school");
  const city = text(fd, "city");
  const fullName = text(fd, "name");
  const email = text(fd, "email").toLowerCase();
  const password = String(fd.get("password") ?? "");
  const phone = normalizePhone(text(fd, "phone"));

  if (school.length < 2 || fullName.length < 2) return { error: "Indiquez le nom de l'auto-école et votre nom." };
  if (!phone) return { error: "Numéro de téléphone invalide." };
  if (password.length < 8) return { error: "Le mot de passe doit faire au moins 8 caractères." };

  const supabase = await createClient();
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: { data: { full_name: fullName, school_name: school, school_city: city, school_phone: phone } },
  });
  if (error) {
    return { error: error.message.includes("registered") ? "Un compte existe déjà avec cet e-mail." : "Inscription impossible. Réessayez." };
  }

  if (!data.session) {
    return { success: "Compte créé ! Ouvrez l'e-mail de confirmation que nous venons d'envoyer, puis connectez-vous." };
  }

  const { error: rpcError } = await supabase.rpc("create_school", {
    school_name: school,
    school_city: city,
    school_phone: phone,
  });
  if (rpcError) return { error: "Le compte est créé, mais pas l'école. Connectez-vous pour terminer." };
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

export async function signOut() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/connexion");
}
