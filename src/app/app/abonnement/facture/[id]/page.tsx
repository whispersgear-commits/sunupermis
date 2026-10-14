import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, BadgeCheck } from "lucide-react";
import { DocumentHeader } from "@/components/documents/receipt";
import { PrintButton } from "@/components/documents/print-button";
import { createClient } from "@/lib/supabase/server";
import { requireOwner } from "@/lib/session";
import { dayMonth, money } from "@/lib/format";
import { displayPhone } from "@/lib/phone";
import { amountInWords } from "@/lib/receipts";
import { LEGAL } from "@/lib/legal";
import { PLANS, planPrice, type PlanId } from "@/lib/plans";
import { subscriptionInvoiceLabel } from "@/lib/subscription-invoice";

export const metadata: Metadata = { title: "Facture d'abonnement" };

const fullDate = (iso: string) => `${dayMonth(iso.slice(0, 10))} ${iso.slice(0, 4)}`;

/**
 * Facture d'un abonnement payé : émise par Sunu Agence (éditeur de
 * SunuPermis) à l'auto-école, acquittée, imprimable ou enregistrable en PDF.
 */
export default async function FactureAbonnementPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const ctx = await requireOwner();
  const supabase = await createClient();
  const { data } = await supabase
    .from("subscription_payments")
    .select("id, plan, months, amount, status, paid_at, provider, provider_ref, invoice_no, period_start, period_end")
    .eq("id", id)
    .eq("school_id", ctx.school.id)
    .maybeSingle();
  if (!data || data.status !== "paid" || !data.paid_at) notFound();
  const p = data as {
    id: string;
    plan: PlanId;
    months: 1 | 12;
    amount: number;
    paid_at: string;
    provider: string;
    provider_ref: string | null;
    invoice_no: number | null;
    period_start: string | null;
    period_end: string | null;
  };
  const plan = PLANS[p.plan];
  const fullPrice = plan.price * p.months;
  const discount = p.months === 12 ? fullPrice - planPrice(p.plan, 12) : 0;
  const issuer = { name: `${LEGAL.product} · ${LEGAL.editor}`, city: LEGAL.city, phone: "221782932433", address: LEGAL.address };
  const school = ctx.school;

  return (
    <>
      <div className="mb-5 flex flex-wrap items-center justify-between gap-3 print:hidden">
        <Link href="/app/abonnement" className="inline-flex items-center gap-1.5 text-sm font-semibold text-muted hover:text-ink">
          <ArrowLeft className="h-4 w-4" /> Abonnement
        </Link>
        <PrintButton />
      </div>

      <article className="mx-auto max-w-3xl rounded-3xl border border-line bg-surface p-6 shadow-sm sm:p-10 print:max-w-none print:rounded-none print:border-0 print:p-0 print:shadow-none">
        <DocumentHeader school={issuer} title="Facture" number={subscriptionInvoiceLabel(p.invoice_no, p.paid_at)} date={`Le ${fullDate(p.paid_at)}`} />

        <div className="mt-6 grid gap-6 sm:grid-cols-2">
          <div>
            <p className="text-xs font-bold uppercase tracking-wider text-muted">Facturé à</p>
            <p className="mt-1 text-lg font-bold">{school.name}</p>
            <p className="text-sm text-muted">
              {[school.address, school.city].filter(Boolean).join(", ")}
              {school.phone && (
                <>
                  <br />
                  Tél. {displayPhone(school.phone)}
                </>
              )}
              <br />
              {ctx.email}
            </p>
          </div>
          <div className="sm:text-right">
            <p className="text-xs font-bold uppercase tracking-wider text-muted">Émetteur</p>
            <p className="mt-1 text-sm text-muted">
              {LEGAL.editor} · {LEGAL.status}
              {LEGAL.ninea && (
                <>
                  <br />
                  NINEA {LEGAL.ninea}
                </>
              )}
              {LEGAL.rccm && (
                <>
                  <br />
                  RCCM {LEGAL.rccm}
                </>
              )}
              <br />
              {LEGAL.email}
            </p>
          </div>
        </div>

        <div className="mt-8 overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b-2 border-ink text-left text-xs uppercase tracking-wider text-muted">
                <th className="py-2 pr-4">Désignation</th>
                <th className="py-2 text-right">Montant</th>
              </tr>
            </thead>
            <tbody>
              <tr className="border-b border-line">
                <td className="py-3 pr-4">
                  <p className="font-semibold">
                    Abonnement {LEGAL.product} {plan.name} · {p.months === 12 ? "12 mois" : "1 mois"}
                  </p>
                  <p className="text-muted">
                    {p.period_start && p.period_end ? `Du ${fullDate(p.period_start)} au ${fullDate(p.period_end)}` : `${p.months} mois d'accès`}
                    {" · "}
                    {plan.users === null ? "comptes illimités" : `${plan.users} compte${plan.users > 1 ? "s" : ""}`}
                  </p>
                </td>
                <td className="py-3 text-right font-semibold tabular-nums whitespace-nowrap">{money(fullPrice)}</td>
              </tr>
              {discount > 0 && (
                <tr className="border-b border-line">
                  <td className="py-3 pr-4">
                    <p className="font-semibold">Remise abonnement annuel</p>
                    <p className="text-muted">2 mois offerts</p>
                  </td>
                  <td className="py-3 text-right font-semibold tabular-nums whitespace-nowrap">− {money(discount)}</td>
                </tr>
              )}
            </tbody>
            <tfoot>
              <tr>
                <td className="pt-4 pr-4 text-right font-bold">Total</td>
                <td className="pt-4 text-right text-lg font-extrabold tabular-nums whitespace-nowrap">{money(p.amount)}</td>
              </tr>
              <tr>
                <td className="pt-1 pr-4 text-right text-muted">Payé le {fullDate(p.paid_at)}</td>
                <td className="pt-1 text-right font-semibold text-brand-700 tabular-nums whitespace-nowrap">− {money(p.amount)}</td>
              </tr>
              <tr>
                <td className="pt-1 pr-4 text-right font-bold">Reste à payer</td>
                <td className="pt-1 text-right text-lg font-extrabold tabular-nums whitespace-nowrap">{money(0)}</td>
              </tr>
            </tfoot>
          </table>
        </div>

        <p className="mt-6 text-sm">
          Arrêtée la présente facture à la somme de <b className="first-letter:uppercase">{amountInWords(p.amount)} francs CFA</b>.
        </p>

        <div className="mt-8 flex flex-wrap items-end justify-between gap-6">
          <div className="text-sm text-muted">
            Paiement en ligne {p.provider === "bictorys" ? "via Bictorys (Wave, Orange Money ou carte bancaire)" : ""}
            {p.provider_ref && (
              <>
                <br />
                Référence : <span className="font-mono">{p.provider_ref}</span>
              </>
            )}
          </div>
          <div className="inline-flex -rotate-6 items-center gap-2 rounded-xl border-4 border-brand-600 px-4 py-2 text-lg font-extrabold uppercase tracking-widest text-brand-700">
            <BadgeCheck className="h-6 w-6" /> Acquittée
          </div>
        </div>

        <p className="mt-10 border-t border-line pt-4 text-center text-xs text-muted">
          {LEGAL.product} est un produit {LEGAL.editor} · {LEGAL.city} · {LEGAL.site.replace("https://", "")}
        </p>
      </article>
    </>
  );
}
