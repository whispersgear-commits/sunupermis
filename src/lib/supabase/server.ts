import "server-only";
import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";

/**
 * Client Supabase côté serveur, lié aux cookies de la requête.
 *
 * Il agit avec les droits de l'utilisateur connecté : toutes les lectures et
 * écritures passent par les politiques RLS de la base. Aucune clé de service
 * n'est utilisée par l'application.
 */
export async function createClient() {
  const store = await cookies();
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll: () => store.getAll(),
        setAll: (toSet) => {
          try {
            for (const { name, value, options } of toSet) store.set(name, value, options);
          } catch {
            // Appelé depuis un composant serveur : les cookies sont en lecture
            // seule. Le middleware rafraîchit la session, on peut ignorer.
          }
        },
      },
    },
  );
}
