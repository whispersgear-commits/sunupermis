import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

/**
 * Rafraîchit la session Supabase à chaque navigation et protège l'espace
 * `/app`. Transmet aussi le chemin demandé (`x-pathname`) : la mise en page
 * de l'espace en a besoin pour savoir si une page reste accessible quand
 * l'abonnement est échu.
 */
export async function middleware(request: NextRequest) {
  const headers = new Headers(request.headers);
  headers.set("x-pathname", request.nextUrl.pathname);
  let response = NextResponse.next({ request: { headers } });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll: () => request.cookies.getAll(),
        setAll: (toSet) => {
          for (const { name, value } of toSet) request.cookies.set(name, value);
          response = NextResponse.next({ request: { headers } });
          for (const { name, value, options } of toSet) response.cookies.set(name, value, options);
        },
      },
    },
  );

  // `getClaims()` vérifie la signature du jeton sur place, avec les clés
  // publiques du projet gardées en mémoire : pas d'aller-retour vers
  // Supabase à chaque clic (il rafraîchit aussi la session expirée). Un
  // projet encore en clé secrète partagée retombe sur `getUser()`.
  // `getSession()` seul ne suffirait pas : il lit un cookie qui peut être forgé.
  const { data } = await supabase.auth.getClaims();
  const user = data?.claims?.sub ? data.claims : null;

  const { pathname } = request.nextUrl;
  if (!user && pathname.startsWith("/app")) {
    const url = request.nextUrl.clone();
    url.pathname = "/connexion";
    url.search = "";
    return NextResponse.redirect(url);
  }
  if (user && (pathname === "/connexion" || pathname === "/inscription")) {
    const url = request.nextUrl.clone();
    url.pathname = "/app";
    url.search = "";
    return NextResponse.redirect(url);
  }
  return response;
}

export const config = {
  matcher: ["/app/:path*", "/connexion", "/inscription", "/bienvenue", "/rejoindre/:path*", "/reinitialiser"],
};
