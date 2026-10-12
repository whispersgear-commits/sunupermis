"use client";

import Link from "next/link";
import { PendingButton } from "@/components/ui/pending-button";
import { usePathname } from "next/navigation";
import { motion } from "motion/react";
import {
  CalendarDays,
  CalendarPlus,
  Car,
  ChevronRight,
  CreditCard,
  LayoutDashboard,
  LogOut,
  Plus,
  Search,
  Settings,
  UserPlus,
  Users,
  Wallet,
  type LucideIcon,
} from "lucide-react";
import { Logo } from "@/components/logo";
import { Sheet } from "@/components/ui/sheet";
import { LinkPending } from "@/components/ui/link-pending";
import { NavProgress } from "@/components/ui/nav-progress";
import { inputClass } from "@/components/ui/fields";
import { cn } from "@/lib/utils";
import { ROLE_LABEL, type Role } from "@/lib/types";
import { Avatar } from "./ui";
import { SunuAgence } from "@/components/sunu-agence";

interface NavItem {
  href: string;
  label: string;
  icon: LucideIcon;
  exact?: boolean;
  /** Dans la barre du bas sur téléphone ; sinon dans le menu du compte. */
  tab?: boolean;
  roles: Role[];
}

const ALL: Role[] = ["owner", "secretary", "instructor"];
const STAFF: Role[] = ["owner", "secretary"];

/** Un moniteur ne voit ni l'argent ni l'équipe. */
const NAV: NavItem[] = [
  { href: "/app", label: "Accueil", icon: LayoutDashboard, exact: true, tab: true, roles: ALL },
  { href: "/app/eleves", label: "Élèves", icon: Users, tab: true, roles: ALL },
  { href: "/app/planning", label: "Planning", icon: CalendarDays, tab: true, roles: ALL },
  { href: "/app/paiements", label: "Paiements", icon: Wallet, tab: true, roles: STAFF },
  { href: "/app/equipe", label: "Équipe et voitures", icon: Car, roles: STAFF },
  { href: "/app/abonnement", label: "Abonnement", icon: CreditCard, roles: ["owner"] },
  { href: "/app/reglages", label: "Réglages", icon: Settings, roles: ALL },
];

const QUICK = [
  { href: "/app/eleves/nouveau", label: "Nouvel élève", hint: "Inscription et échéancier", icon: UserPlus, tone: "bg-brand-50 text-brand-700 dark:bg-brand-900/50 dark:text-brand-200" },
  { href: "/app/planning?nouveau=1", label: "Planifier une leçon", hint: "Conduite ou code", icon: CalendarPlus, tone: "bg-sky-50 text-sky-700 dark:bg-sky-900/40 dark:text-sky-200" },
  { href: "/app/paiements?encaisser=1", label: "Encaisser un paiement", hint: "Wave, Orange Money, espèces", icon: Wallet, tone: "bg-amber-50 text-amber-800 dark:bg-amber-900/40 dark:text-amber-200" },
];

/**
 * Coque de l'espace auto-école.
 *
 * Ordinateur : barre latérale + barre de recherche en haut.
 * Téléphone : barre d'onglets en bas (là où tombe le pouce) avec un bouton
 * « + » central pour les actions du quotidien, et le reste dans le menu du
 * compte, en haut à droite.
 */
export function Shell({
  schoolName,
  userName,
  role,
  trial,
  daysLeft,
  signOut,
  children,
}: {
  schoolName: string;
  userName: string;
  role: Role;
  trial: boolean;
  daysLeft: number;
  signOut: () => Promise<void>;
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const items = NAV.filter((item) => item.roles.includes(role));
  const tabs = items.filter((item) => item.tab);
  const staff = role !== "instructor";
  const active = (item: NavItem) => (item.exact ? pathname === item.href : pathname.startsWith(item.href));
  const showTrial = role === "owner" && (trial || daysLeft <= 7);

  const trialCard = showTrial && (
    <Link href="/app/abonnement" className="block rounded-2xl bg-asphalt p-4 text-white transition hover:brightness-110">
      <p className="text-xs font-semibold text-brand-200">{trial ? "Essai gratuit" : "Abonnement"}</p>
      <p className="mt-1 text-2xl font-extrabold">
        {daysLeft} jour{daysLeft > 1 ? "s" : ""} restant{daysLeft > 1 ? "s" : ""}
      </p>
      <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-white/10">
        <motion.div
          className="h-full rounded-full bg-lane"
          initial={{ width: 0 }}
          animate={{ width: `${Math.min(100, (daysLeft / 30) * 100)}%` }}
          transition={{ duration: 1.2, ease: [0.22, 1, 0.36, 1] }}
        />
      </div>
      <p className="mt-2 text-xs text-slate-400">Choisir ma formule →</p>
    </Link>
  );

  // Rangée du bas sur téléphone : le « + » se glisse au milieu.
  const mobileRow: (NavItem | "plus")[] = staff ? [tabs[0], tabs[1], "plus", ...tabs.slice(2)] : tabs;

  return (
    <div className="min-h-screen lg:flex">
      <NavProgress />
      {/* ------------------------------------------------ Ordinateur */}
      <aside className="sticky top-0 hidden h-screen print:!hidden w-64 shrink-0 flex-col border-r border-line bg-surface p-5 lg:flex">
        <Logo href="/app" />
        <nav className="mt-10 space-y-1">
          {items.map((item) => (
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
              <LinkPending className="relative ml-auto text-brand-600" />
            </Link>
          ))}
        </nav>

        <div className="mt-auto space-y-4">
          {trialCard}
          <div className="flex items-center gap-3 border-t border-line pt-4">
            <Avatar name={userName} size="sm" />
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-bold">{userName}</p>
              <p className="truncate text-xs text-muted">{ROLE_LABEL[role]}</p>
            </div>
            <form action={signOut}>
              <PendingButton className="grid h-9 w-9 place-items-center rounded-xl text-muted transition hover:bg-red-50 hover:text-red-600" aria-label="Déconnexion" title="Déconnexion">
                <LogOut className="h-4 w-4" />
              </PendingButton>
            </form>
          </div>
        </div>
      </aside>

      <div className="min-w-0 flex-1">
        <header className="sticky top-0 z-30 hidden border-b print:!hidden border-line bg-bg/80 backdrop-blur-xl lg:block">
          <div className="mx-auto flex max-w-6xl items-center gap-4 px-6 py-3">
            <form action="/app/eleves" className="relative max-w-md flex-1">
              <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" />
              <input name="q" type="search" placeholder="Rechercher un élève (nom ou téléphone)" aria-label="Rechercher un élève" className={cn(inputClass, "h-10 bg-surface pl-10")} />
            </form>
            <p className="ml-auto truncate text-sm font-semibold text-muted">{schoolName}</p>
            {staff && (
              <Sheet
                title="Que voulez-vous faire ?"
                triggerClassName="inline-flex h-10 items-center gap-2 rounded-xl bg-brand-600 px-4 text-sm font-semibold text-white shadow-lg shadow-brand-600/20 transition hover:bg-brand-700"
                trigger={
                  <>
                    <Plus className="h-4 w-4" /> Nouveau
                  </>
                }
              >
                <QuickActions />
              </Sheet>
            )}
          </div>
        </header>

        {/* ------------------------------------------------ Téléphone */}
        <header className="sticky top-0 z-30 flex items-center justify-between gap-3 print:hidden border-b border-line bg-surface/85 px-4 py-2.5 backdrop-blur-xl lg:hidden">
          <Logo href="/app" />
          <div className="flex items-center gap-1">
            <Link href="/app/eleves" className="grid h-10 w-10 place-items-center rounded-xl text-muted hover:bg-bg" aria-label="Rechercher un élève">
              <Search className="h-5 w-5" />
            </Link>
            <Sheet title={schoolName} description={`${userName} · ${ROLE_LABEL[role]}`} triggerClassName="rounded-xl p-0.5" trigger={<Avatar name={userName} size="sm" />}>
              <div className="space-y-4">
                {trialCard}
                <ul className="overflow-hidden rounded-2xl border border-line">
                  {items
                    .filter((i) => !i.tab)
                    .map((item) => (
                      <li key={item.href} className="border-b border-line last:border-0">
                        <Link href={item.href} className="flex items-center gap-3 px-4 py-3.5 font-semibold transition hover:bg-bg">
                          <item.icon className="h-5 w-5 text-muted" />
                          <span className="flex-1">{item.label}</span>
                          <ChevronRight className="h-4 w-4 text-muted" />
                        </Link>
                      </li>
                    ))}
                </ul>
                <form action={signOut}>
                  <PendingButton className="flex w-full items-center justify-center gap-2 rounded-2xl border border-line py-3.5 font-semibold text-red-600 transition hover:bg-red-50">
                    <LogOut className="h-4 w-4" /> Se déconnecter
                  </PendingButton>
                </form>
              </div>
            </Sheet>
          </div>
        </header>

        <main className="pb-28 lg:pb-0 print:p-0">
          <div className="mx-auto max-w-6xl px-4 py-5 sm:px-6 lg:py-8 print:max-w-none print:p-0">{children}</div>
          <div className="flex justify-center px-4 pb-6 pt-2 print:hidden">
            <SunuAgence />
          </div>
        </main>
      </div>

      <nav
        className="fixed inset-x-0 bottom-0 z-40 grid border-t print:hidden border-line bg-surface/95 pb-[env(safe-area-inset-bottom)] backdrop-blur-xl lg:hidden"
        style={{ gridTemplateColumns: `repeat(${mobileRow.length}, minmax(0, 1fr))` }}
      >
        {mobileRow.map((item) =>
          item === "plus" ? (
            <div key="plus" className="flex items-start justify-center">
              <Sheet
                title="Que voulez-vous faire ?"
                triggerClassName="-mt-5 grid h-14 w-14 place-items-center rounded-2xl bg-brand-600 text-white shadow-xl shadow-brand-600/40 ring-4 ring-surface transition active:scale-95"
                trigger={
                  <>
                    <Plus className="h-6 w-6" />
                    <span className="sr-only">Nouveau</span>
                  </>
                }
              >
                <QuickActions />
              </Sheet>
            </div>
          ) : (
            <Link key={item.href} href={item.href} className="relative flex flex-col items-center gap-1 py-2.5 text-[11px] font-semibold">
              {active(item) && (
                <motion.span layoutId="tab-active" className="absolute top-0 h-1 w-10 rounded-b-full bg-brand-600" transition={{ type: "spring", stiffness: 420, damping: 34 }} />
              )}
              <item.icon className={cn("h-5 w-5", active(item) ? "text-brand-600" : "text-muted")} />
              <span className={active(item) ? "text-brand-700 dark:text-brand-200" : "text-muted"}>{item.label}</span>
              <LinkPending className="absolute right-1/2 top-2 translate-x-4 text-brand-600" />
            </Link>
          ),
        )}
      </nav>
    </div>
  );
}

function QuickActions() {
  return (
    <ul className="space-y-2">
      {QUICK.map((q) => (
        <li key={q.href}>
          <Link href={q.href} className="flex items-center gap-4 rounded-2xl border border-line p-4 transition hover:border-brand-500 hover:bg-bg">
            <span className={cn("grid h-12 w-12 shrink-0 place-items-center rounded-2xl", q.tone)}>
              <q.icon className="h-5 w-5" />
            </span>
            <span className="min-w-0 flex-1">
              <span className="block font-bold">{q.label}</span>
              <span className="block text-sm text-muted">{q.hint}</span>
            </span>
            <ChevronRight className="h-4 w-4 text-muted" />
          </Link>
        </li>
      ))}
    </ul>
  );
}
