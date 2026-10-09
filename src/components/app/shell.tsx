"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { motion } from "motion/react";
import { CalendarDays, LayoutDashboard, LogOut, Settings, Users, Wallet, Car } from "lucide-react";
import { Logo } from "@/components/logo";
import { cn } from "@/lib/utils";

const NAV = [
  { href: "/app", label: "Accueil", icon: LayoutDashboard, exact: true },
  { href: "/app/eleves", label: "Élèves", icon: Users },
  { href: "/app/planning", label: "Planning", icon: CalendarDays },
  { href: "/app/paiements", label: "Paiements", icon: Wallet },
  { href: "/app/equipe", label: "Équipe", icon: Car },
  { href: "/app/reglages", label: "Réglages", icon: Settings, desktopOnly: true },
];

/**
 * Coque de l'espace auto-école : barre latérale sur ordinateur, barre
 * d'onglets en bas sur téléphone (là où tombe le pouce). L'onglet actif est
 * marqué par une pastille qui glisse d'un onglet à l'autre.
 */
export function Shell({
  schoolName,
  userName,
  trialDays,
  signOut,
  children,
}: {
  schoolName: string;
  userName: string;
  trialDays: number;
  signOut: () => Promise<void>;
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const active = (item: (typeof NAV)[number]) => (item.exact ? pathname === item.href : pathname.startsWith(item.href));

  return (
    <div className="min-h-screen lg:flex">
      <aside className="sticky top-0 hidden h-screen w-64 shrink-0 flex-col border-r border-line bg-surface p-5 lg:flex">
        <Logo href="/app" />
        <nav className="mt-10 space-y-1">
          {NAV.map((item) => (
            <Link key={item.href} href={item.href} className="relative flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-semibold">
              {active(item) && (
                <motion.span
                  layoutId="nav-active"
                  className="absolute inset-0 rounded-xl bg-brand-50 dark:bg-brand-900/40"
                  transition={{ type: "spring", stiffness: 420, damping: 34 }}
                />
              )}
              <item.icon className={cn("relative h-5 w-5", active(item) ? "text-brand-600" : "text-muted")} />
              <span className={cn("relative", active(item) ? "text-brand-700 dark:text-brand-200" : "text-muted")}>{item.label}</span>
            </Link>
          ))}
        </nav>

        <div className="mt-auto space-y-4">
          {trialDays > 0 && (
            <div className="rounded-2xl bg-asphalt p-4 text-white">
              <p className="text-xs font-semibold text-brand-200">Essai gratuit</p>
              <p className="mt-1 text-2xl font-extrabold">{trialDays} jours</p>
              <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-white/10">
                <motion.div
                  className="h-full rounded-full bg-lane"
                  initial={{ width: 0 }}
                  animate={{ width: `${(trialDays / 30) * 100}%` }}
                  transition={{ duration: 1.2, ease: [0.22, 1, 0.36, 1] }}
                />
              </div>
            </div>
          )}
          <div className="border-t border-line pt-4">
            <p className="truncate text-sm font-bold">{schoolName}</p>
            <p className="truncate text-xs text-muted">{userName}</p>
            <form action={signOut}>
              <button className="mt-3 flex items-center gap-2 text-sm font-semibold text-muted hover:text-red-600">
                <LogOut className="h-4 w-4" /> Déconnexion
              </button>
            </form>
          </div>
        </div>
      </aside>

      <header className="sticky top-0 z-30 flex items-center justify-between border-b border-line bg-surface/85 px-4 py-3 backdrop-blur-xl lg:hidden">
        <Logo href="/app" />
        <Link href="/app/reglages" className="rounded-xl p-2 text-muted hover:bg-bg" aria-label="Réglages">
          <Settings className="h-5 w-5" />
        </Link>
      </header>

      <main className="min-w-0 flex-1 pb-24 lg:pb-0">
        <div className="mx-auto max-w-6xl px-4 py-6 sm:px-6 lg:py-10">{children}</div>
      </main>

      <nav className="fixed inset-x-0 bottom-0 z-40 grid grid-cols-5 border-t border-line bg-surface/95 pb-[env(safe-area-inset-bottom)] backdrop-blur-xl lg:hidden">
        {NAV.filter((item) => !item.desktopOnly).map((item) => (
          <Link key={item.href} href={item.href} className="relative flex flex-col items-center gap-1 py-2.5 text-[11px] font-semibold">
            {active(item) && (
              <motion.span layoutId="tab-active" className="absolute top-0 h-1 w-10 rounded-b-full bg-brand-600" transition={{ type: "spring", stiffness: 420, damping: 34 }} />
            )}
            <item.icon className={cn("h-5 w-5", active(item) ? "text-brand-600" : "text-muted")} />
            <span className={active(item) ? "text-brand-700 dark:text-brand-200" : "text-muted"}>{item.label}</span>
          </Link>
        ))}
      </nav>
    </div>
  );
}
