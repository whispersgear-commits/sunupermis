import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, Ban, FileText, MessageCircle } from "lucide-react";
import { Receipt } from "@/components/documents/receipt";
import { PrintButton } from "@/components/documents/print-button";
import { CancelPaymentForm } from "@/components/documents/cancel-payment-form";
import { Sheet } from "@/components/ui/sheet";
import { createClient } from "@/lib/supabase/server";
import { requireStaff, siteOrigin } from "@/lib/session";
import { qrSvg } from "@/lib/qr";
import { receiptLabel } from "@/lib/receipts";
import { receiptMessage, waLink } from "@/lib/whatsapp";
import { METHOD_LABEL, type Payment, type Student } from "@/lib/types";

export const metadata: Metadata = { title: "Reçu" };

export default async function RecuPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const ctx = await requireStaff();
  const supabase = await createClient();

  const { data } = await supabase.from("payments").select("*, student:students(id, full_name, phone, license, file_no, package_price)").eq("id", id).maybeSingle();
  if (!data?.student) notFound();
  const payment = data as Payment & { student: Pick<Student, "id" | "full_name" | "phone" | "license" | "file_no" | "package_price"> };
  const student = payment.student;

  const [{ data: earlier }, { data: member }] = await Promise.all([
    // Reste à payer au moment de ce reçu : paiements valides jusqu'à celui-ci.
    supabase.from("payments").select("amount").eq("student_id", student.id).is("cancelled_at", null).lte("receipt_no", payment.receipt_no ?? 0),
    payment.created_by ? supabase.from("memberships").select("full_name, email").eq("user_id", payment.created_by).maybeSingle() : Promise.resolve({ data: null }),
  ]);
  const paidSoFar = (earlier ?? []).reduce((sum, p) => sum + p.amount, 0);
  const balanceAfter = Math.max(0, student.package_price - paidSoFar);
  const verifyUrl = `${await siteOrigin()}/recu/${payment.receipt_token}`;
  const label = receiptLabel(payment.receipt_no, payment.paid_at);
  const cancelled = Boolean(payment.cancelled_at);

  return (
    <>
      <div className="mb-5 flex flex-wrap items-center justify-between gap-3 print:hidden">
        <Link href={`/app/eleves/${student.id}?onglet=paiements`} className="inline-flex items-center gap-1.5 text-sm font-semibold text-muted hover:text-ink">
          <ArrowLeft className="h-4 w-4" /> {student.full_name}
        </Link>
        <div className="flex flex-wrap gap-2">
          {!cancelled && (
            <a
              href={waLink(student.phone, receiptMessage(student.full_name, ctx.school.name, label, payment.amount, METHOD_LABEL[payment.method], balanceAfter, verifyUrl))}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex h-10 items-center gap-2 rounded-xl bg-[#25D366] px-4 text-sm font-semibold text-white transition hover:brightness-95"
            >
              <MessageCircle className="h-4 w-4" /> Envoyer sur WhatsApp
            </a>
          )}
          <PrintButton />
          <Link href={`/app/eleves/${student.id}/facture`} className="inline-flex h-10 items-center gap-2 rounded-xl border border-line bg-surface px-4 text-sm font-semibold transition hover:border-brand-600 hover:text-brand-700">
            <FileText className="h-4 w-4" /> Facture
          </Link>
          {ctx.role === "owner" && !cancelled && (
            <Sheet
              title={`Annuler le reçu ${label}`}
              description="Le paiement ne compte plus dans les soldes. Le reçu reste visible avec la mention « ANNULÉ »."
              triggerClassName="inline-flex h-10 items-center gap-2 rounded-xl border border-line bg-surface px-4 text-sm font-semibold text-red-600 transition hover:border-red-400"
              trigger={
                <>
                  <Ban className="h-4 w-4" /> Annuler
                </>
              }
            >
              <CancelPaymentForm paymentId={payment.id} />
            </Sheet>
          )}
        </div>
      </div>

      <Receipt
        school={ctx.school}
        payment={payment}
        student={student}
        receivedBy={(member as { full_name: string | null; email: string | null } | null)?.full_name ?? null}
        balanceAfter={balanceAfter}
        qr={await qrSvg(verifyUrl)}
        verifyUrl={verifyUrl}
      />
    </>
  );
}
