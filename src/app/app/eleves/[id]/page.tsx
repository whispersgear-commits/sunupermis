import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { MessageCircle } from "lucide-react";
import { Badge, ButtonLink, Card, CardTitle, PageHeader, StaggerItem, StaggerList } from "@/components/app/ui";
import { LessonRow, type LessonWithNames } from "@/components/app/lesson-row";
import { ExamForm, PaymentForm, ProgressRing } from "@/components/app/student-panels";
import { createClient } from "@/lib/supabase/server";
import { requireContext } from "@/lib/session";
import { dayMonth, money, shortDate, todayIso } from "@/lib/format";
import { displayPhone } from "@/lib/phone";
import { paymentReminder, waLink, welcomeMessage } from "@/lib/whatsapp";
import { METHOD_LABEL, STATUS_LABEL, type Balance, type Exam, type Installment, type Payment, type Student } from "@/lib/types";
import { setExamResult, updateStudentStatus } from "../../actions";

export const metadata: Metadata = { title: "Élève" };

export default async function ElevePage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ nouveau?: string }> }) {
  const { id } = await params;
  const { nouveau } = await searchParams;
  const ctx = await requireContext();
  const supabase = await createClient();

  const { data: student } = await supabase.from("students").select("*").eq("id", id).maybeSingle();
  if (!student) notFound();
  const s = student as Student;

  const [{ data: balance }, { data: installments }, { data: payments }, { data: lessons }, { data: exams }] = await Promise.all([
    supabase.from("student_balances").select("*").eq("student_id", id).maybeSingle(),
    supabase.from("installments").select("*").eq("student_id", id).order("due_date"),
    supabase.from("payments").select("*").eq("student_id", id).order("paid_at", { ascending: false }),
    supabase.from("lessons").select("*, student:students(id, full_name, phone), instructor:instructors(full_name), vehicle:vehicles(label)").eq("student_id", id).order("starts_at", { ascending: false }).limit(50),
    supabase.from("exams").select("*").eq("student_id", id).order("exam_date", { ascending: false }),
  ]);

  const b = balance as Balance | null;
  const paid = b?.paid ?? 0;
  const rest = b?.balance ?? s.package_price;
  const done = b?.driving_lessons_done ?? 0;
  const today = todayIso();

  // Les paiements couvrent les échéances dans l'ordre : on sait ainsi
  // lesquelles sont réglées, entamées ou en retard.
  let remaining = paid;
  const schedule = ((installments ?? []) as Installment[]).map((i) => {
    const covered = Math.min(i.amount, Math.max(0, remaining));
    remaining -= covered;
    const state = covered >= i.amount ? "paid" : i.due_date < today ? "late" : covered > 0 ? "partial" : "upcoming";
    return { ...i, covered, state };
  });
  const late = schedule.filter((i) => i.state === "late").reduce((sum, i) => sum + i.amount - i.covered, 0);

  return (
    <>
      <PageHeader
        title={s.full_name}
        description={`${displayPhone(s.phone)} · Permis ${s.license} · inscrit le ${shortDate(s.created_at)}`}
        actions={
          <>
            <ButtonLink variant="whatsapp" href={waLink(s.phone, nouveau ? welcomeMessage(s.full_name, ctx.school.name) : `Bonjour ${s.full_name.split(" ")[0]}, `)}>
              <MessageCircle className="h-4 w-4" /> {nouveau ? "Envoyer la bienvenue" : "WhatsApp"}
            </ButtonLink>
            {rest > 0 && (
              <ButtonLink variant="secondary" href={waLink(s.phone, paymentReminder(s.full_name, ctx.school.name, late > 0 ? late : rest))}>
                Rappel de paiement
              </ButtonLink>
            )}
          </>
        }
      />

      <div className="grid gap-6 lg:grid-cols-3">
        <Card className="p-6">
          <div className="flex items-center gap-5">
            <ProgressRing value={done} total={s.hours_planned} />
            <div>
              <p className="text-sm text-muted">Leçons de conduite</p>
              <p className="text-2xl font-extrabold">
                {done} <span className="text-base font-semibold text-muted">/ {s.hours_planned}</span>
              </p>
            </div>
          </div>
          <form action={updateStudentStatus} className="mt-6 flex flex-wrap gap-2">
            <input type="hidden" name="student_id" value={s.id} />
            {(Object.keys(STATUS_LABEL) as Student["status"][]).map((st) => (
              <button
                key={st}
                name="status"
                value={st}
                className={`rounded-full px-3 py-1.5 text-xs font-bold transition ${st === s.status ? "bg-brand-600 text-white" : "border border-line text-muted hover:border-brand-500"}`}
              >
                {STATUS_LABEL[st]}
              </button>
            ))}
          </form>
        </Card>

        <Card className="p-6 lg:col-span-2" delay={0.05}>
          <div className="grid grid-cols-3 gap-4">
            <div>
              <p className="text-sm text-muted">Forfait</p>
              <p className="text-xl font-extrabold">{money(s.package_price)}</p>
            </div>
            <div>
              <p className="text-sm text-muted">Payé</p>
              <p className="text-xl font-extrabold text-brand-700">{money(paid)}</p>
            </div>
            <div>
              <p className="text-sm text-muted">Reste</p>
              <p className={`text-xl font-extrabold ${rest > 0 ? "text-red-600" : "text-brand-700"}`}>{money(rest)}</p>
            </div>
          </div>
          <div className="mt-4 h-2.5 overflow-hidden rounded-full bg-line">
            <div className="h-full rounded-full bg-gradient-to-r from-brand-500 to-brand-600 transition-all duration-1000" style={{ width: `${s.package_price ? Math.min(100, (paid / s.package_price) * 100) : 100}%` }} />
          </div>
          {late > 0 && <p className="mt-3 text-sm font-semibold text-red-600">{money(late)} en retard sur l'échéancier.</p>}
        </Card>
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        <Card delay={0.1}>
          <CardTitle title="Échéancier" />
          {schedule.length ? (
            <StaggerList className="divide-y divide-line">
              {schedule.map((i, n) => (
                <StaggerItem key={i.id} className="flex items-center justify-between px-5 py-3">
                  <span className="flex items-center gap-3">
                    <span className="grid h-7 w-7 place-items-center rounded-full bg-bg text-xs font-bold">{n + 1}</span>
                    <span>
                      <span className="block font-semibold">{dayMonth(i.due_date)}</span>
                      <span className="text-xs text-muted">{money(i.amount)}</span>
                    </span>
                  </span>
                  <Badge tone={i.state === "paid" ? "good" : i.state === "late" ? "bad" : i.state === "partial" ? "warn" : "neutral"}>
                    {i.state === "paid" ? "Payée" : i.state === "late" ? "En retard" : i.state === "partial" ? `Entamée · ${money(i.covered)}` : "À venir"}
                  </Badge>
                </StaggerItem>
              ))}
            </StaggerList>
          ) : (
            <p className="px-5 py-6 text-sm text-muted">Pas d'échéancier : forfait payé en une fois ou gratuit.</p>
          )}
        </Card>

        <Card delay={0.15}>
          <CardTitle title="Paiements" />
          <div className="border-b border-line p-5">
            <PaymentForm studentId={s.id} suggested={late > 0 ? late : Math.min(rest, schedule.find((i) => i.state !== "paid")?.amount ?? rest)} />
          </div>
          {(payments ?? []).length ? (
            <StaggerList className="divide-y divide-line">
              {((payments ?? []) as Payment[]).map((p) => (
                <StaggerItem key={p.id} className="flex items-center justify-between px-5 py-3 text-sm">
                  <span>
                    <span className="block font-semibold">{money(p.amount)}</span>
                    <span className="text-xs text-muted">
                      {shortDate(p.paid_at)} · {METHOD_LABEL[p.method]}
                      {p.reference ? ` · ${p.reference}` : ""}
                    </span>
                  </span>
                  <Badge tone="good">Reçu</Badge>
                </StaggerItem>
              ))}
            </StaggerList>
          ) : (
            <p className="px-5 py-6 text-sm text-muted">Aucun paiement enregistré.</p>
          )}
        </Card>

        <Card delay={0.2}>
          <CardTitle title="Leçons" action={<ButtonLink href={`/app/planning?eleve=${s.id}`} variant="secondary" className="h-8 px-3 text-xs">+ Planifier</ButtonLink>} />
          {(lessons ?? []).length ? (
            <div className="divide-y divide-line">
              {((lessons ?? []) as LessonWithNames[]).map((l) => (
                <LessonRow key={l.id} lesson={l} showDate />
              ))}
            </div>
          ) : (
            <p className="px-5 py-6 text-sm text-muted">Aucune leçon planifiée.</p>
          )}
        </Card>

        <Card delay={0.25}>
          <CardTitle title="Examens" />
          <div className="border-b border-line p-5">
            <ExamForm studentId={s.id} />
          </div>
          {(exams ?? []).length ? (
            <ul className="divide-y divide-line">
              {((exams ?? []) as Exam[]).map((e) => (
                <li key={e.id} className="flex flex-wrap items-center justify-between gap-2 px-5 py-3 text-sm">
                  <span>
                    <span className="block font-semibold">{e.kind === "code" ? "Code" : "Conduite"}</span>
                    <span className="text-xs text-muted">{shortDate(e.exam_date)}</span>
                  </span>
                  {e.result === "pending" ? (
                    <form action={setExamResult} className="flex gap-1.5">
                      <input type="hidden" name="exam_id" value={e.id} />
                      <input type="hidden" name="student_id" value={s.id} />
                      <button name="result" value="passed" className="rounded-lg bg-brand-600 px-2.5 py-1 text-xs font-bold text-white">
                        Réussi
                      </button>
                      <button name="result" value="failed" className="rounded-lg border border-line px-2.5 py-1 text-xs font-bold text-muted">
                        Échoué
                      </button>
                    </form>
                  ) : (
                    <Badge tone={e.result === "passed" ? "good" : "bad"}>{e.result === "passed" ? "Réussi 🎉" : "Échoué"}</Badge>
                  )}
                </li>
              ))}
            </ul>
          ) : (
            <p className="px-5 py-6 text-sm text-muted">Aucun examen prévu.</p>
          )}
        </Card>
      </div>
    </>
  );
}
