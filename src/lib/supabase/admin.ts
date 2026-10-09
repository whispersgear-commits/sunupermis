import "server-only";
import { createClient } from "@supabase/supabase-js";

/**
 * Client avec la clé de service : il ignore la sécurité par ligne.
 *
 * Réservé à deux usages qui n'ont pas d'utilisateur connecté derrière eux :
 * le webhook de paiement Wave (après vérification de sa signature) et la
 * tâche planifiée des rappels WhatsApp (après vérification de son secret).
 * Jamais dans une page ni dans une action déclenchée par un utilisateur.
 */
export function createAdminClient() {
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!key) throw new Error("SUPABASE_SERVICE_ROLE_KEY manquante");
  return createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}
