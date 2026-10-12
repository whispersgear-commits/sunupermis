import { money } from "@/lib/format";
import { displayPhone } from "@/lib/phone";
import { amountInWords, fileLabel, receiptLabel } from "@/lib/receipts";
import { METHOD_LABEL, type Payment, type School, type Student } from "@/lib/types";
import { cn } from "@/lib/utils";

const MONTHS = ["janvier", "février", "mars", "avril", "mai", "juin", "juillet", "août", "septembre", "octobre", "novembre", "décembre"];

/** « 2026-10-10T09:41:00Z » ⟶ « 10 octobre 2026 à 09:41 » (heure de Dakar = UTC). */
function dateTime(iso: string) {
  return `${Number(iso.slice(8, 10))} ${MONTHS[Number(iso.slice(5, 7)) - 1]} ${iso.slice(0, 4)} à ${iso.slice(11, 16)}`;
}

/** En-tête commun aux reçus et factures : l'école, sur papier. */
export function DocumentHeader({ school, title, number, date }: { school: Pick<School, "name" | "city" | "phone" | "address">; title: string; number: string; date: string }) {
  return (
    <div className="flex flex-wrap items-start justify-between gap-4 border-b-2 border-ink pb-5">
      <div>
        <p className="text-xl font-extrabold leading-tight">{school.name}</p>
        <p className="mt-1 text-sm text-muted">
          {[school.address, school.city && !school.address?.toLowerCase().includes(school.city.toLowerCase()) ? school.city : null].filter(Boolean).join(", ")}
          {school.phone && (
            <>
              <br />
              Tél. {displayPhone(school.phone)}
            </>
          )}
        </p>
      </div>
      <div className="sm:text-right print:text-right">
        <p className="text-xs font-bold uppercase tracking-[0.2em] text-muted">{title}</p>
        <p className="mt-1 font-mono text-lg font-extrabold">{number}</p>
        <p className="text-sm text-muted">{date}</p>
      </div>
    </div>
  );
}

/**
 * Reçu de paiement. Le QR code renvoie vers la page publique qui confirme
 * que le reçu existe bien dans le registre de l'école.
 */
export function Receipt({
  school,
  payment,
  student,
  receivedBy,
  balanceAfter,
  qr,
  verifyUrl,
}: {
  school: Pick<School, "name" | "city" | "phone" | "address">;
  payment: Payment;
  student: Pick<Student, "full_name" | "phone" | "license" | "file_no">;
  receivedBy: string | null;
  balanceAfter: number;
  qr: string;
  verifyUrl: string;
}) {
  const cancelled = Boolean(payment.cancelled_at);
  return (
    <article className="relative mx-auto max-w-2xl overflow-hidden rounded-3xl border border-line bg-surface p-6 shadow-sm sm:p-10 print:max-w-none print:rounded-none print:border-0 print:p-0 print:shadow-none">
      {cancelled && (
        <div aria-hidden className="pointer-events-none absolute inset-0 grid place-items-center">
          <span className="-rotate-12 rounded-2xl border-8 border-red-600/70 px-8 py-2 text-6xl font-black tracking-widest text-red-600/70">ANNULÉ</span>
        </div>
      )}
      <DocumentHeader school={school} title="Reçu de paiement" number={receiptLabel(payment.receipt_no, payment.paid_at)} date={dateTime(payment.paid_at)} />

      <dl className="mt-6 grid gap-x-8 gap-y-4 sm:grid-cols-2 print:mt-4 print:grid-cols-2">
        <div>
          <dt className="text-xs font-bold uppercase tracking-wider text-muted">Reçu de</dt>
          <dd className="mt-1 text-lg font-bold">{student.full_name}</dd>
          <dd className="text-sm text-muted">
            {displayPhone(student.phone)} · Permis {student.license} · Dossier {fileLabel(student.file_no)}
          </dd>
        </div>
        <div>
          <dt className="text-xs font-bold uppercase tracking-wider text-muted">Objet</dt>
          <dd className="mt-1 font-semibold">Formation au permis de conduire, catégorie {student.license}</dd>
        </div>
      </dl>

      <div className="mt-6 rounded-2xl bg-bg p-5 print:mt-4 print:border print:border-line print:p-4">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <p className="text-xs font-bold uppercase tracking-wider text-muted">Montant reçu</p>
            <p className={cn("mt-1 text-4xl font-extrabold tracking-tight", cancelled && "line-through")}>{money(payment.amount)}</p>
          </div>
          <div className="text-right text-sm">
            <p className="font-semibold">{METHOD_LABEL[payment.method]}</p>
            {payment.reference && <p className="font-mono text-muted">Réf. {payment.reference}</p>}
          </div>
        </div>
        <p className="mt-3 text-sm italic first-letter:uppercase">{amountInWords(payment.amount)} francs CFA.</p>
      </div>

      <div className="mt-6 flex flex-wrap items-end justify-between gap-6 print:mt-4">
        <div className="space-y-1 text-sm">
          <p>
            Reste à payer après ce versement : <b>{balanceAfter > 0 ? money(balanceAfter) : "rien, forfait soldé"}</b>
          </p>
          {receivedBy && (
            <p>
              Encaissé par : <b>{receivedBy}</b>
            </p>
          )}
          {cancelled && (
            <p className="font-bold text-red-600">
              Paiement annulé le {dateTime(payment.cancelled_at!)}
              {payment.cancel_reason ? ` · motif : ${payment.cancel_reason}` : ""}
            </p>
          )}
          <p className="pt-4 text-xs text-muted">Cachet et signature</p>
          <div className="h-12 w-48 border-b border-dashed border-line" />
        </div>
        <div className="flex items-center gap-3">
          <div className="text-right text-[11px] leading-tight text-muted">
            Scannez pour vérifier
            <br />
            l'authenticité du reçu
            <br />
            <span className="font-mono">{verifyUrl.replace(/^https?:\/\//, "").replace(/\/recu\/.*/, "/recu/…")}</span>
          </div>
          <div className="h-24 w-24 shrink-0 rounded-lg bg-white p-1.5" dangerouslySetInnerHTML={{ __html: qr }} />
        </div>
      </div>
      <p className="mt-5 border-t border-line pt-2 text-center text-[11px] text-muted print:mt-3">Reçu émis par SunuPermis, un produit Sunu Agence · numérotation continue, aucun reçu ne peut être supprimé.</p>
    </article>
  );
}
