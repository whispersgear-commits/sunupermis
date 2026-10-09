import "server-only";
import { cache } from "react";
import { redirect } from "next/navigation";
import { createClient } from "./supabase/server";
import type { Role, School } from "./types";

export interface Context {
  userId: string;
  email: string;
  fullName: string;
  role: Role;
  /** Fiche moniteur reliée au compte (rôle « instructor »). */
  instructorId: string | null;
  school: School;
}

/**
 * Qui est connecté, dans quelle école, avec quel rôle. Lu une fois par
 * requête grâce à `cache()`.
 */
export const getContext = cache(async (): Promise<Context | "no-school" | null> => {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const { data: membership } = await supabase
    .from("memberships")
    .select("role, instructor_id, school:schools(*)")
    .eq("user_id", user.id)
    .limit(1)
    .maybeSingle();

  if (!membership?.school) return "no-school";

  return {
    userId: user.id,
    email: user.email ?? "",
    fullName: (user.user_metadata?.full_name as string) ?? "",
    role: membership.role as Role,
    instructorId: (membership.instructor_id as string | null) ?? null,
    school: membership.school as unknown as School,
  };
});

export async function requireContext(): Promise<Context> {
  const ctx = await getContext();
  if (!ctx) redirect("/connexion");
  if (ctx === "no-school") redirect("/bienvenue");
  return ctx;
}

export async function requireStaff(): Promise<Context> {
  const ctx = await requireContext();
  if (ctx.role === "instructor") redirect("/app");
  return ctx;
}

export async function requireOwner(): Promise<Context> {
  const ctx = await requireContext();
  if (ctx.role !== "owner") redirect("/app");
  return ctx;
}

/** Origine publique du site, pour les liens envoyés par e-mail ou WhatsApp. */
export async function siteOrigin(): Promise<string> {
  const configured = process.env.NEXT_PUBLIC_SITE_URL ?? process.env.URL;
  if (configured) return configured.replace(/\/+$/, "");
  const { headers } = await import("next/headers");
  const h = await headers();
  const host = h.get("x-forwarded-host") ?? h.get("host") ?? "localhost:3000";
  const proto = h.get("x-forwarded-proto") ?? (host.startsWith("localhost") ? "http" : "https");
  return `${proto}://${host}`;
}
