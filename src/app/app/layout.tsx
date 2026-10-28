import type { Metadata } from "next";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { Shell } from "@/components/app/shell";
import { requireContext } from "@/lib/session";
import { accessOf } from "@/lib/plans";
import { signOut } from "../auth-actions";

export const dynamic = "force-dynamic";

// L'espace des auto-écoles n'a rien à faire dans les moteurs de recherche.
export const metadata: Metadata = { robots: { index: false, follow: false } };

/** Pages accessibles même quand l'abonnement est échu : payer, se déconnecter. */
const ALWAYS_OPEN = ["/app/abonnement", "/app/reglages"];

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const ctx = await requireContext();
  const access = accessOf(ctx.school);
  const pathname = (await headers()).get("x-pathname") ?? "";

  if (!access.active && !ALWAYS_OPEN.some((p) => pathname.startsWith(p))) {
    redirect("/app/abonnement?expire=1");
  }

  return (
    <>
      <Shell
        schoolName={ctx.school.name}
        userName={ctx.fullName || ctx.email}
        role={ctx.role}
        trial={access.trial}
        daysLeft={access.daysLeft}
        signOut={signOut}
      >
        {children}
      </Shell>
    </>
  );
}
