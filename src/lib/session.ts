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
    .select("role, school:schools(*)")
    .eq("user_id", user.id)
    .limit(1)
    .maybeSingle();

  if (!membership?.school) return "no-school";

  return {
    userId: user.id,
    email: user.email ?? "",
    fullName: (user.user_metadata?.full_name as string) ?? "",
    role: membership.role as Role,
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
