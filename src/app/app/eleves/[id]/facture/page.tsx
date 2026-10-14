import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { DocumentHeader } from "@/components/documents/receipt";
import { PrintButton } from "@/components/documents/print-button";
import { createClient } from "@/lib/supabase/server";
import { requireStaff } from "@/lib/session";
import { dayMonth, money, todayIso } from "@/lib/format";
import { displayPhone } from "@/lib/phone";
import { amountInWords, fileLabel, invoiceLabel, receiptLabel } from "@/lib/receipts";
import { METHOD_LABEL, type Installment, type Payment, type Student } from "@/lib/types";

export const metadata: Metadata = { title: "Facture" };

const LICENSE = { A: "moto", B: "voiture", C: "poids lourd", D: "transport de personnes", E: "remorque" } as const;

/**
 * Facture du forfait : ce que l'élève (ou son employeur, ou un parent) doit,
 * ce qu'il a déjà versé reçu par reçu, et ce qui reste, échéance par échéance.
 */
export default async function FacturePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const ctx = await requireStaff();
  const supabase = await createClient();
  const [{ data: student }, { data: payments }, { data: installments }] = await Promise.all([
    supabase.from("students").select("*").eq("id", id).maybeSingle(),
    supabase.from("payments").select("*").eq("student_id", id).is("cancelled_at", null).order("receipt_no"),
    supabase.from("installments").select("*").eq("student_id", id).order("due_date"),
  ]);
  if (!student) notFound();
  const s = student as Student;
  const list = (payments ?? []) as Payment[];
  const paid = list.reduce((sum, p) => sum + p.amount, 0);
  const rest = Math.max(0, s.package_price - paid);
  const today = todayIso();

  let left = paid;
  const schedule = ((installments ?? []) as Installment[]).map((i) => {
    const covered = Math.min(i.amount, Math.max(0, left));
    left -= covered;
    return { ...i, due: i.amount - covered };
  });

  // Suppléments ajoutés après l'inscription : une ligne chacun.
  const supplements = ((installments ?? []) as Installment[]).filter((i) => i.label);
  const base = s.package_price - supplements.reduce((sum, i) => sum + i.amount, 0);

  return (
    <>
      <div className="mb-5 flex flex-wrap items-center justify-between gap-3 print:hidden">
        <Link href={`/app/eleves/${s.id}?onglet=paiements`} className="inline-flex items-center gap-1.5 text-sm font-semibold text-muted hover:text-ink">
          <ArrowLeft className="h-4 w-4" /> {s.full_name}
        </Link>
        <PrintButton />
      </div>

      <article className="mx-auto max-w-3xl rounded-3xl border border-line bg-surface p-6 shadow-sm sm:p-10 print:max-w-none print:rounded-none print:border-0 print:p-0 print:shadow-none">
        <DocumentHeader school={ctx.school} title="Facture" number={invoiceLabel(s.file_no)} date={`Le ${dayMonth(today)} ${today.slice(0, 4)}`} />

        <div className="mt-6 grid gap-6 sm:grid-cols-2">
          <div>
            <p className="text-xs font-bold uppercase tracking-wider text-muted">Facturé à</p>
            <p className="mt-1 text-lg font-bold">{s.full_name}</p>
            <p className="text-sm text-muted">
              Tél. {displayPhone(s.phone)}
              <br />
              Dossier {fileLabel(s.file_no)} · inscrit le {dayMonth(s.created_at.slice(0, 10))} {s.created_at.slice(0, 4)}
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
                  <p className="font-semibold">Formation au permis de conduire, catégorie {s.license} ({LICENSE[s.license as keyof typeof LICENSE] ?? ""})</p>
                  <p className="text-muted">Forfait : code de la route et {s.hours_planned} leçons de conduite</p>
                </td>
                <td className="py-3 text-right font-semibold tabular-nums whitespace-nowrap">{money(base)}</td>
              </tr>
              {supplements.map((i) => (
                <tr key={i.id} className="border-b border-line">
                  <td className="py-3 pr-4">
                    <p className="font-semibold">Supplément : {i.label}</p>
                    <p className="text-muted">Ajouté le {dayMonth(i.due_date)}</p>
                  </td>
                  <td className="py-3 text-right font-semibold tabular-nums whitespace-nowrap">{money(i.amount)}</td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr>
                <td className="pt-4 pr-4 text-right font-bold">Total</td>
                <td className="pt-4 text-right text-lg font-extrabold tabular-nums whitespace-nowrap">{money(s.package_price)}</td>
              </tr>
              <tr>
                <td className="pt-1 pr-4 text-right text-muted">Déjà payé</td>
                <td className="pt-1 text-right font-semibold text-brand-700 tabular-nums whitespace-nowrap">− {money(paid)}</td>
              </tr>
              <tr>
                <td className="pt-1 pr-4 text-right font-bold">Reste à payer</td>
                <td className="pt-1 text-right text-lg font-extrabold tabular-nums whitespace-nowrap">{money(rest)}</td>
              </tr>
            </tfoot>
          </table>
        </div>

        <p className="mt-6 text-sm">
          Arrêtée la présente facture à la somme de <b className="first-letter:uppercase">{amountInWords(s.package_price)} francs CFA</b>.
        </p>

        {list.length > 0 && (
          <section className="mt-8">
            <h2 className="text-xs font-bold uppercase tracking-wider text-muted">Paiements reçus</h2>
            <ul className="mt-2 divide-y divide-line text-sm">
              {list.map((p) => (
                <li key={p.id} className="flex justify-between gap-4 py-2">
                  <span>
                    <span className="font-mono">{receiptLabel(p.receipt_no, p.paid_at)}</span> · {dayMonth(p.paid_at.slice(0, 10))} {p.paid_at.slice(0, 4)} · {METHOD_LABEL[p.method]}
                  </span>
                  <span className="font-semibold tabular-nums whitespace-nowrap">{money(p.amount)}</span>
                </li>
              ))}
            </ul>
          </section>
        )}

        {schedule.some((i) => i.due > 0) && (
          <section className="mt-8">
            <h2 className="text-xs font-bold uppercase tracking-wider text-muted">Échéances restantes</h2>
            <ul className="mt-2 divide-y divide-line text-sm">
              {schedule
                .filter((i) => i.due > 0)
                .map((i) => (
                  <li key={i.id} className="flex justify-between gap-4 py-2">
                    <span>
                      {dayMonth(i.due_date)} {i.due_date.slice(0, 4)}
                      {i.due_date < today && <b className="ml-2 text-red-600">en retard</b>}
                    </span>
                    <span className="font-semibold tabular-nums whitespace-nowrap">{money(i.due)}</span>
                  </li>
                ))}
            </ul>
          </section>
        )}

        <div className="mt-10 flex justify-end">
          <div className="text-sm">
            <p className="text-xs text-muted">Cachet et signature</p>
            <div className="mt-2 h-20 w-56 border-b border-dashed border-line" />
          </div>
        </div>
      </article>
    </>
  );
}
