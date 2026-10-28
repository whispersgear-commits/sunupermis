import type { Metadata } from "next";
import { PendingButton } from "@/components/ui/pending-button";
import Link from "next/link";
import { notFound } from "next/navigation";
import { AlertTriangle, ArrowLeft, CalendarPlus, ChevronRight, FileText, GraduationCap, MessageCircle, Pencil, Phone, StickyNote, Wallet } from "lucide-react";
import { receiptLabel } from "@/lib/receipts";
import { Avatar, Badge, Card, CardTitle, Empty, ProgressBar } from "@/components/app/ui";
import { LessonRow, type LessonWithNames } from "@/components/app/lesson-row";
import { ExamForm, PaymentForm, ProgressRing , SupplementForm } from "@/components/app/student-panels";
import { Tabs } from "@/components/app/filters";
import { createClient } from "@/lib/supabase/server";
import { requireContext } from "@/lib/session";
import { dayMonth, dayShort, longDay, money, shortDate, todayIso } from "@/lib/format";
import { displayPhone } from "@/lib/phone";
import { paymentReminder, waLink, welcomeMessage } from "@/lib/whatsapp";
import { METHOD_LABEL, STATUS_LABEL, type Balance, type Exam, type Installment, type Payment, type Student } from "@/lib/types";
import { cn } from "@/lib/utils";
import { setExamResult, updateStudentStatus } from "../../actions";

export const metadata: Metadata = { title: "Élève" };

const STATUS_TONE = { active: "info", code_ok: "warn", licensed: "good", dropped: "neutral" } as const;

export default async function ElevePage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ nouveau?: string; onglet?: string }> }) {
  const { id } = await params;
  const { nouveau, onglet } = await searchParams;
  const ctx = await requireContext();
  const supabase = await createClient();

  const { data: student } = await supabase.from("students").select("*").eq("id", id).maybeSingle();
  if (!student) notFound();
  const s = student as Student;
  // Les moniteurs suivent la formation ; l'argent reste au bureau.
  const isStaff = ctx.role !== "instructor";

  const [{ data: balance }, { data: installments }, { data: payments }, { data: lessons }, { data: exams }] = await Promise.all([
    supabase.from("student_balances").select("*").eq("student_id", id).maybeSingle(),
    isStaff ? supabase.from("installments").select("*").eq("student_id", id).order("due_date") : Promise.resolve({ data: [] }),
    isStaff ? supabase.from("payments").select("*").eq("student_id", id).order("paid_at", { ascending: false }) : Promise.resolve({ data: [] }),
    supabase
      .from("lessons")
      .select("*, student:students(id, full_name, phone), instructor:instructors(full_name), vehicle:vehicles(label)")
      .eq("student_id", id)
      .order("starts_at", { ascending: false })
      .limit(100),
    supabase.from("exams").select("*").eq("student_id", id).order("exam_date", { ascending: false }),
  ]);

  const b = balance as Balance | null;
  const paid = b?.paid ?? 0;
  const rest = b?.balance ?? s.package_price;
  const done = b?.driving_lessons_done ?? 0;
  const today = todayIso();
  const now = Date.now();

  // Les paiements couvrent les échéances dans l'ordre : on sait ainsi
  // lesquelles sont réglées, entamées ou en retard.
  let remaining = paid;
  const schedule = ((installments ?? []) as Installment[]).map((i) => {
    const covered = Math.min(i.amount, Math.max(0, remaining));
    remaining -= covered;
    const state = covered >= i.amount ? "paid" : i.due_date < today ? "late" : covered > 0 ? "partial" : i.due_date === today ? "today" : "upcoming";
    return { ...i, covered, state };
  });
  const late = schedule.filter((i) => i.state === "late").reduce((sum, i) => sum + i.amount - i.covered, 0);
  const nextDue = schedule.find((i) => i.state !== "paid");

  const allLessons = (lessons ?? []) as LessonWithNames[];
  const upcoming = allLessons.filter((l) => l.status === "planned" && new Date(l.ends_at).getTime() >= now).reverse();
  const past = allLessons.filter((l) => !(l.status === "planned" && new Date(l.ends_at).getTime() >= now));
  const missed = allLessons.filter((l) => l.status === "missed").length;
  const examList = (exams ?? []) as Exam[];
  const nextExam = [...examList].reverse().find((e) => e.result === "pending" && e.exam_date >= today);
  const paymentList = (payments ?? []) as Payment[];

  const tabs = [
    { key: "apercu", label: "Aperçu" },
    ...(isStaff ? [{ key: "paiements", label: "Paiements", count: paymentList.length }] : []),
    { key: "lecons", label: "Leçons", count: allLessons.filter((l) => l.status !== "cancelled").length },
    { key: "examens", label: "Examens", count: examList.length },
  ];
  const tab = tabs.some((t) => t.key === onglet) ? onglet! : "apercu";
  const tabHref = (key: string) => (key === "apercu" ? `/app/eleves/${s.id}` : `/app/eleves/${s.id}?onglet=${key}`);

  const actions = [
    { href: `tel:+${s.phone}`, label: "Appeler", icon: Phone, className: "border border-line bg-surface hover:border-brand-500" },
    {
      href: waLink(s.phone, nouveau ? welcomeMessage(s.full_name, ctx.school.name) : `Bonjour ${s.full_name.split(" ")[0]}, `),
      label: nouveau ? "Bienvenue" : "WhatsApp",
      icon: MessageCircle,
      external: true,
      className: "bg-[#25D366] text-asphalt hover:brightness-95",
    },
    ...(isStaff
      ? [
          { href: `/app/planning?eleve=${s.id}`, label: "Planifier", icon: CalendarPlus, className: "border border-line bg-surface hover:border-brand-500" },
          { href: `/app/eleves/${s.id}/modifier`, label: "Modifier", icon: Pencil, className: "border border-line bg-surface hover:border-brand-500" },
        ]
      : []),
  ];

  return (
    <>
      <Link href="/app/eleves" className="mb-4 inline-flex items-center gap-1.5 text-sm font-semibold text-muted hover:text-ink">
        <ArrowLeft className="h-4 w-4" /> Élèves
      </Link>

      <Card className="mb-5 p-5 sm:p-6">
        <div className="flex flex-col gap-5 md:flex-row md:items-center md:justify-between">
          <div className="flex min-w-0 items-center gap-4">
            <Avatar name={s.full_name} size="lg" />
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <h1 className="text-2xl font-extrabold tracking-tight sm:text-3xl">{s.full_name}</h1>
                <Badge tone={STATUS_TONE[s.status]}>{STATUS_LABEL[s.status]}</Badge>
              </div>
              <p className="mt-1 text-sm text-muted">
                {displayPhone(s.phone)} · Permis {s.license} · inscrit le {shortDate(s.created_at)}
              </p>
            </div>
          </div>
          <div className={cn("grid gap-2", actions.length === 4 ? "grid-cols-4" : "grid-cols-2", "md:flex")}>
            {actions.map((a) => (
              <a
                key={a.label}
                href={a.href}
                target={"external" in a ? "_blank" : undefined}
                rel={"external" in a ? "noopener noreferrer" : undefined}
                className={cn(
                  "flex flex-col items-center justify-center gap-1 rounded-2xl px-3 py-2.5 text-xs font-semibold transition md:h-10 md:flex-row md:gap-2 md:rounded-xl md:py-0 md:text-sm",
                  a.className,
                )}
              >
                <a.icon className="h-4 w-4" /> {a.label}
              </a>
            ))}
          </div>
        </div>
      </Card>

      <Tabs id="eleve-onglet" variant="underline" className="mb-5" items={tabs.map((t) => ({ href: tabHref(t.key), label: t.label, count: t.count, active: t.key === tab }))} />

      {tab === "apercu" && (
        <div className="grid gap-5 lg:grid-cols-3">
          <Card className="p-5">
            <p className="text-sm font-semibold text-muted">Leçons de conduite</p>
            <div className="mt-3 flex items-center gap-5">
              <ProgressRing value={done} total={s.hours_planned} />
              <div>
                <p className="text-3xl font-extrabold">
                  {done} <span className="text-base font-semibold text-muted">/ {s.hours_planned}</span>
                </p>
                <p className="text-sm text-muted">
                  {Math.max(0, s.hours_planned - done)} restante{s.hours_planned - done > 1 ? "s" : ""}
                  {missed > 0 && <span className="text-red-600"> · {missed} absence{missed > 1 ? "s" : ""}</span>}
                </p>
              </div>
            </div>
            <div className="mt-5 border-t border-line pt-4 text-sm">
              <p className="text-muted">Prochaine leçon</p>
              <p className="font-bold first-letter:uppercase">{upcoming[0] ? `${longDay(upcoming[0].starts_at)} à ${upcoming[0].starts_at.slice(11, 16)}` : "Aucune de prévue"}</p>
            </div>
          </Card>

          {isStaff && (
            <Card className="p-5" delay={0.05}>
              <div className="flex items-center justify-between">
                <p className="text-sm font-semibold text-muted">Paiement du forfait</p>
                <Wallet className="h-4 w-4 text-muted" />
              </div>
              <p className={cn("mt-3 text-3xl font-extrabold", rest > 0 ? "" : "text-brand-700")}>{rest > 0 ? money(rest) : "Soldé"}</p>
              <p className="text-sm text-muted">{rest > 0 ? `reste sur ${money(s.package_price)}` : `${money(s.package_price)} payés`}</p>
              {rest > 0 && (
                <div className="mt-4">
                  <ProgressBar value={paid} total={s.package_price || 1} />
                  <p className="mt-1.5 text-xs text-muted">{money(paid)} payés</p>
                </div>
              )}
              {late > 0 ? (
                <div className="mt-4 flex items-center justify-between gap-3 rounded-2xl bg-red-50 p-3 text-sm dark:bg-red-900/30">
                  <span className="flex items-center gap-2 font-semibold text-red-700 dark:text-red-200">
                    <AlertTriangle className="h-4 w-4" /> {money(late)} en retard
                  </span>
                  <a href={waLink(s.phone, paymentReminder(s.full_name, ctx.school.name, late))} target="_blank" rel="noopener noreferrer" className="font-bold text-red-700 underline dark:text-red-200">
                    Relancer
                  </a>
                </div>
              ) : nextDue ? (
                <p className="mt-4 text-sm text-muted">
                  Prochaine échéance : <b className="text-ink">{money(nextDue.amount - nextDue.covered)}</b> le {dayMonth(nextDue.due_date)}
                </p>
              ) : null}
              <Link
                href={tabHref("paiements")}
                className={cn(
                  "mt-4 inline-flex h-10 w-full items-center justify-center rounded-xl text-sm font-semibold",
                  rest > 0 ? "bg-brand-600 text-white hover:bg-brand-700" : "border border-line hover:border-brand-500",
                )}
              >
                {rest > 0 ? "Encaisser un paiement" : "Voir les paiements"}
              </Link>
            </Card>
          )}

          <div className="space-y-5">
            {isStaff && (
              <Card className="p-5" delay={0.1}>
                <p className="mb-3 text-sm font-semibold text-muted">Étape de la formation</p>
                <form action={updateStudentStatus} className="grid grid-cols-2 gap-2">
                  <input type="hidden" name="student_id" value={s.id} />
                  {(Object.keys(STATUS_LABEL) as Student["status"][]).map((st) => (
                    <PendingButton
                      key={st}
                      name="status"
                      value={st}
                      className={cn(
                        "rounded-xl px-3 py-2 text-xs font-bold transition",
                        st === s.status ? "bg-asphalt text-white dark:bg-brand-600" : "border border-line text-muted hover:border-brand-500 hover:text-ink",
                      )}
                    >
                      {STATUS_LABEL[st]}
                    </PendingButton>
                  ))}
                </form>
              </Card>
            )}
            <Card className="p-5" delay={0.15}>
              <div className="flex items-center justify-between">
                <p className="text-sm font-semibold text-muted">Prochain examen</p>
                <GraduationCap className="h-4 w-4 text-muted" />
              </div>
              <p className="mt-2 font-bold first-letter:uppercase">{nextExam ? `${nextExam.kind === "code" ? "Code" : "Conduite"} · ${longDay(nextExam.exam_date)}` : "Aucun de prévu"}</p>
            </Card>
            {s.notes && (
              <Card className="p-5" delay={0.2}>
                <p className="mb-2 flex items-center gap-2 text-sm font-semibold text-muted">
                  <StickyNote className="h-4 w-4" /> Notes
                </p>
                <p className="whitespace-pre-line text-sm">{s.notes}</p>
              </Card>
            )}
          </div>
        </div>
      )}

      {tab === "paiements" && isStaff && (
        <div className="grid gap-5 lg:grid-cols-2">
          <div className="space-y-5">
            <Card>
              <CardTitle title="Encaisser un paiement" />
              <div className="p-5">
                {rest > 0 ? (
                  <PaymentForm studentId={s.id} suggested={late > 0 ? late : Math.min(rest, nextDue ? nextDue.amount - nextDue.covered : rest)} />
                ) : (
                  <p className="rounded-2xl bg-brand-50 p-4 text-sm font-semibold text-brand-800 dark:bg-brand-900/40 dark:text-brand-100">
                    Forfait soldé : rien à encaisser. Pour un frais en plus, ajoutez un supplément ci-dessous.
                  </p>
                )}
              </div>
            </Card>
            <Card delay={0.05}>
              <CardTitle title="Échéancier" action={<span className="text-sm font-semibold text-muted">{money(s.package_price)}</span>} />
              {schedule.length ? (
                <ul className="divide-y divide-line">
                  {schedule.map((i, n) => (
                    <li key={i.id} className="flex items-center justify-between gap-3 px-5 py-3">
                      <span className="flex items-center gap-3">
                        <span className={cn("grid h-8 w-8 place-items-center rounded-full text-xs font-bold", i.state === "paid" ? "bg-brand-600 text-white" : i.state === "late" ? "bg-red-100 text-red-700" : "bg-bg")}>
                          {n + 1}
                        </span>
                        <span>
                          <span className="block font-semibold">{dayMonth(i.due_date)}</span>
                          <span className="text-xs text-muted">
                            {money(i.amount)}
                            {i.label && ` · ${i.label}`}
                          </span>
                        </span>
                      </span>
                      <Badge tone={i.state === "paid" ? "good" : i.state === "late" ? "bad" : i.state === "partial" || i.state === "today" ? "warn" : "neutral"}>
                        {i.state === "paid" ? "Payée" : i.state === "late" ? "En retard" : i.state === "partial" ? `Entamée · ${money(i.covered)}` : i.state === "today" ? "Aujourd'hui" : "À venir"}
                      </Badge>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="px-5 py-6 text-sm text-muted">Pas d'échéancier : forfait payé en une fois ou gratuit.</p>
              )}
            </Card>
            <Card delay={0.08}>
              <CardTitle title="Ajouter un supplément" />
              <div className="p-5">
                <SupplementForm studentId={s.id} />
              </div>
            </Card>
          </div>
          <Card delay={0.1} className="h-fit">
            <CardTitle
              title="Reçus"
              action={
                <Link href={`/app/eleves/${s.id}/facture`} className="inline-flex items-center gap-1.5 text-sm font-semibold text-brand-700 hover:underline">
                  <FileText className="h-4 w-4" /> Facture
                </Link>
              }
            />
            {paymentList.length ? (
              <ul className="divide-y divide-line">
                {paymentList.map((p) => (
                  <li key={p.id}>
                    <Link href={`/app/paiements/${p.id}/recu`} className="flex items-center justify-between gap-3 px-5 py-3 text-sm transition hover:bg-bg">
                      <span className="min-w-0">
                        <span className="block font-semibold">
                          <span className="font-mono text-xs text-muted">{receiptLabel(p.receipt_no, p.paid_at)}</span> · {shortDate(p.paid_at)}
                        </span>
                        <span className="block truncate text-xs text-muted">
                          {METHOD_LABEL[p.method]}
                          {p.reference ? ` · ${p.reference}` : ""}
                          {p.cancelled_at ? ` · annulé : ${p.cancel_reason ?? ""}` : ""}
                        </span>
                      </span>
                      <span className="flex shrink-0 items-center gap-2">
                        {p.cancelled_at ? <Badge tone="bad">Annulé</Badge> : null}
                        <span className={cn("font-bold", p.cancelled_at ? "text-muted line-through" : "text-brand-700")}>+{money(p.amount)}</span>
                        <ChevronRight className="h-4 w-4 text-muted" />
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>
            ) : (
              <Empty title="Aucun paiement enregistré" />
            )}
          </Card>
        </div>
      )}

      {tab === "lecons" && (
        <div className="space-y-5">
          <Card>
            <CardTitle
              title={`À venir (${upcoming.length})`}
              action={
                isStaff && (
                  <Link href={`/app/planning?eleve=${s.id}`} className="inline-flex items-center gap-1.5 text-sm font-semibold text-brand-700 hover:underline">
                    <CalendarPlus className="h-4 w-4" /> Planifier
                  </Link>
                )
              }
            />
            {upcoming.length ? (
              <div className="divide-y divide-line">
                {upcoming.map((l) => (
                  <LessonRow key={l.id} lesson={l} showDate showStudent={false} canCancel={isStaff} now={now} />
                ))}
              </div>
            ) : (
              <p className="px-5 py-6 text-sm text-muted">Aucune leçon à venir.</p>
            )}
          </Card>
          <Card delay={0.05}>
            <CardTitle title={`Historique (${past.length})`} />
            {past.length ? (
              <div className="divide-y divide-line">
                {past.map((l) => (
                  <LessonRow key={l.id} lesson={l} showDate showStudent={false} canCancel={isStaff} now={now} />
                ))}
              </div>
            ) : (
              <p className="px-5 py-6 text-sm text-muted">Aucune leçon passée.</p>
            )}
          </Card>
        </div>
      )}

      {tab === "examens" && (
        <Card>
          <CardTitle title="Examens" />
          {isStaff && (
            <div className="border-b border-line p-5">
              <ExamForm studentId={s.id} />
            </div>
          )}
          {examList.length ? (
            <ul className="divide-y divide-line">
              {examList.map((e) => (
                <li key={e.id} className="flex flex-wrap items-center justify-between gap-3 px-5 py-3.5">
                  <span className="flex items-center gap-3">
                    <span className="w-14 text-center">
                      <span className="block text-[11px] font-bold uppercase text-muted">{e.exam_date.slice(0, 4)}</span>
                      <span className="block font-extrabold">{dayShort(e.exam_date)}</span>
                    </span>
                    <span className="font-semibold">{e.kind === "code" ? "Code de la route" : "Conduite"}</span>
                  </span>
                  {e.result === "pending" && isStaff ? (
                    <form action={setExamResult} className="flex gap-1.5">
                      <input type="hidden" name="exam_id" value={e.id} />
                      <input type="hidden" name="student_id" value={s.id} />
                      <PendingButton name="result" value="passed" className="rounded-xl bg-brand-600 px-3 py-2 text-xs font-bold text-white">
                        Réussi
                      </PendingButton>
                      <PendingButton name="result" value="failed" className="rounded-xl border border-line px-3 py-2 text-xs font-bold text-muted hover:text-red-600">
                        Échoué
                      </PendingButton>
                    </form>
                  ) : (
                    <Badge tone={e.result === "passed" ? "good" : e.result === "failed" ? "bad" : "neutral"}>
                      {e.result === "passed" ? "Réussi 🎉" : e.result === "failed" ? "Échoué" : "À venir"}
                    </Badge>
                  )}
                </li>
              ))}
            </ul>
          ) : (
            <Empty title="Aucun examen prévu" />
          )}
        </Card>
      )}
    </>
  );
}
