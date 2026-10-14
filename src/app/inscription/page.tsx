import type { Metadata } from "next";
import Link from "next/link";
import { Logo } from "@/components/logo";
import { LegalLinks } from "@/components/legal/legal-page";
import { SunuAgence } from "@/components/sunu-agence";
import { SignupWizard } from "@/components/auth/signup-wizard";
import { PLANS, type PlanId } from "@/lib/plans";

export const metadata: Metadata = { title: "Créer mon auto-école" };

/** Inscription en quatre étapes : formule, auto-école, compte, paiement. */
export default async function InscriptionPage({ searchParams }: { searchParams: Promise<{ plan?: string; mois?: string }> }) {
  const sp = await searchParams;
  const plan: PlanId = sp.plan && sp.plan in PLANS ? (sp.plan as PlanId) : "pro";
  const months = sp.mois === "12" ? 12 : 1;
  return (
    <div className="min-h-screen bg-bg">
      <header className="border-b border-line bg-surface/80 backdrop-blur">
        <div className="mx-auto flex h-16 max-w-5xl items-center justify-between px-4 sm:px-6">
          <Logo />
          <p className="text-sm text-muted">
            <span className="hidden sm:inline">Déjà inscrit ? </span>
            <Link href="/connexion" className="font-semibold text-brand-700 hover:underline">
              Se connecter
            </Link>
          </p>
        </div>
      </header>
      <main className="px-4 py-8 sm:px-6 sm:py-12">
        <SignupWizard defaultPlan={plan} defaultMonths={months} />
      </main>
      <footer className="mx-auto flex max-w-5xl flex-wrap items-center justify-between gap-4 px-4 pb-10 sm:px-6">
        <LegalLinks />
        <SunuAgence />
      </footer>
    </div>
  );
}
