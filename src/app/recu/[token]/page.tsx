import type { Metadata } from "next";
import { BadgeCheck, CircleX, SearchX } from "lucide-react";
import { Logo } from "@/components/logo";
import { createClient } from "@/lib/supabase/server";
import { money } from "@/lib/format";
import { receiptLabel } from "@/lib/receipts";
import { METHOD_LABEL, type Payment } from "@/lib/types";

export const metadata: Metadata = { title: "Vérification d'un reçu", robots: { index: false, follow: false } };

interface Verified {
  school_name: string;
  school_city: string | null;
  receipt_no: number;
  amount: number;
  method: Payment["method"];
  paid_at: string;
  student: string;
  cancelled: boolean;
}

const MONTHS = ["janvier", "février", "mars", "avril", "mai", "juin", "juillet", "août", "septembre", "octobre", "novembre", "décembre"];

/**
 * Page ouverte en scannant le QR code d'un reçu. Sans compte : l'élève, un
 * parent ou un employeur vérifie que le reçu figure bien dans le registre de
 * l'auto-école. Rien d'autre n'est montré (ni téléphone, ni nom complet).
 */
export default async function VerifierRecuPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  let receipt: Verified | null = null;
  if (/^[0-9a-f]{24}$/.test(token)) {
    const supabase = await createClient();
    const { data } = await supabase.rpc("verify_receipt", { token });
    receipt = ((data ?? []) as Verified[])[0] ?? null;
  }

  return (
    <main className="grid min-h-screen place-items-center bg-bg px-4 py-10">
      <div className="w-full max-w-md">
        <div className="mb-6 flex justify-center">
          <Logo />
        </div>
        <div className="overflow-hidden rounded-3xl border border-line bg-surface shadow-xl shadow-black/5">
          {!receipt ? (
            <div className="p-8 text-center">
              <SearchX className="mx-auto h-14 w-14 text-muted" />
              <h1 className="mt-4 text-2xl font-extrabold">Reçu introuvable</h1>
              <p className="mt-2 text-muted">Ce reçu n'existe pas dans le registre SunuPermis. S'il vous a été remis contre un paiement, contactez l'auto-école.</p>
            </div>
          ) : (
            <>
              <div className={receipt.cancelled ? "bg-red-600 p-6 text-white" : "bg-brand-600 p-6 text-white"}>
                {receipt.cancelled ? <CircleX className="h-12 w-12" /> : <BadgeCheck className="h-12 w-12" />}
                <h1 className="mt-3 text-2xl font-extrabold">{receipt.cancelled ? "Reçu annulé" : "Reçu authentique"}</h1>
                <p className="mt-1 text-white/85">
                  {receipt.cancelled ? "Ce paiement a été annulé par l'auto-école." : `Enregistré dans le registre de ${receipt.school_name}.`}
                </p>
              </div>
              <dl className="divide-y divide-line">
                {[
                  ["Auto-école", `${receipt.school_name}${receipt.school_city ? ` · ${receipt.school_city}` : ""}`],
                  ["Reçu n°", receiptLabel(receipt.receipt_no, receipt.paid_at)],
                  ["Élève", receipt.student],
                  ["Montant", money(receipt.amount)],
                  ["Moyen", METHOD_LABEL[receipt.method]],
                  ["Date", `${Number(receipt.paid_at.slice(8, 10))} ${MONTHS[Number(receipt.paid_at.slice(5, 7)) - 1]} ${receipt.paid_at.slice(0, 4)} à ${receipt.paid_at.slice(11, 16)}`],
                ].map(([k, v]) => (
                  <div key={k} className="flex justify-between gap-4 px-6 py-3.5 text-sm">
                    <dt className="shrink-0 whitespace-nowrap text-muted">{k}</dt>
                    <dd className={k === "Montant" ? "text-right font-extrabold" : "text-right font-semibold"}>{v}</dd>
                  </div>
                ))}
              </dl>
            </>
          )}
        </div>
        <p className="mt-6 text-center text-xs text-muted">Vérification fournie par SunuPermis, logiciel de gestion des auto-écoles.</p>
      </div>
    </main>
  );
}
