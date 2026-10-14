import type { Metadata } from "next";
import Link from "next/link";
import { startOfMonth } from "date-fns";
import {
  AlertTriangle,
  ArrowRight,
  BellRing,
  CalendarCheck,
  CalendarClock,
  CalendarPlus,
  Car,
  GraduationCap,
  MessageCircle,
  Phone,
  Send,
  UserPlus,
  Users,
  Wallet,
} from "lucide-react";
import { Avatar, Badge, ButtonLink, Card, CardTitle, Empty, PageHeader, ProgressBar, Stat, StaggerItem, StaggerList } from "@/components/app/ui";
import { LessonRow, type LessonWithNames } from "@/components/app/lesson-row";
import { ActionForm, Submit } from "@/components/ui/form";
import { createClient } from "@/lib/supabase/server";
import { requireContext } from "@/lib/session";
import { addDaysIso, dayShort, longDay, money, todayIso, weekday } from "@/lib/format";
import { displayPhone } from "@/lib/phone";
import { lessonReminder, paymentReminder, waLink } from "@/lib/whatsapp";
import { whatsappConfigured } from "@/lib/whatsapp-api";
import { can } from "@/lib/plans";
import { cn } from "@/lib/utils";
import { sendRemindersNow } from "./actions";
import type { Balance, Exam, Student } from "@/lib/types";

export const metadata: Metadata = { title: "Accueil" };

const LESSON_SELECT = "*, student:students(id, full_name, phone), instructor:instructors(full_name), vehicle:vehicles(label)";

function greeting(hourUtc: number) {
  return hourUtc < 12 ? "Bonjour" : hourUtc < 18 ? "Bon après-midi" : "Bonsoir";
}

export default async function Dashboard({ searchParams }: { searchParams: Promise<{ bienvenue?: string }> }) {
  const { bienvenue } = await searchParams;
  const ctx = await requireContext();
  const supabase = await createClient();

  const today = todayIso();
  const tomorrow = addDaysIso(today, 1);
  const isStaff = ctx.role !== "instructor";
  // Un moniteur relié à sa fiche ne voit que ses leçons, et pas l'argent.
  const mine = !isStaff && ctx.instructorId ? ctx.instructorId : null;
  const lessonsBetween = (from: string, to: string) => {
    const q = supabase.from("lessons").select(LESSON_SELECT).gte("starts_at", `${from}T00:00:00Z`).lt("starts_at", `${to}T00:00:00Z`).order("starts_at");
    return mine ? q.eq("instructor_id", mine) : q;
  };

  const [todayLessons, tomorrowLessons, students, balances, monthPayments, exams] = await Promise.all([
    lessonsBetween(today, tomorrow).neq("status", "cancelled"),
    lessonsBetween(tomorrow, addDaysIso(today, 2)).eq("status", "planned"),
    supabase.from("students").select("id, full_name, phone, status").neq("status", "dropped"),
    isStaff ? supabase.from("student_balances").select("*") : Promise.resolve({ data: [] }),
    isStaff ? supabase.from("payments").select("amount").is("cancelled_at", null).gte("paid_at", startOfMonth(new Date()).toISOString()) : Promise.resolve({ data: [] }),
    supabase
      .from("exams")
      .select("*, student:students(id, full_name)")
      .eq("result", "pending")
      .gte("exam_date", today)
      .lte("exam_date", addDaysIso(today, 30))
      .order("exam_date")
      .limit(5),
  ]);
  const autoSend = isStaff && whatsappConfigured() && can(ctx.school, "autoReminders");

  const studentList = (students.data ?? []) as Pick<Student, "id" | "full_name" | "phone" | "status">[];
  const byId = new Map(studentList.map((s) => [s.id, s]));
  const balanceRows = (balances.data ?? []) as Balance[];

  // En retard = ce qui était dû à aujourd'hui moins ce qui a été payé.
  const overdue = balanceRows
    .map((b) => ({ ...b, late: Math.min(b.balance, b.due_to_date - b.paid), student: byId.get(b.student_id) }))
    .filter((b) => b.late > 0 && b.student)
    .sort((a, b) => b.late - a.late);

  const collected = ((monthPayments.data ?? []) as { amount: number }[]).reduce((sum, p) => sum + p.amount, 0);
  const lateTotal = overdue.reduce((sum, b) => sum + b.late, 0);
  const lessonsToday = (todayLessons.data ?? []) as LessonWithNames[];
  const lessonsTomorrow = (tomorrowLessons.data ?? []) as LessonWithNames[];
  const upcomingExams = (exams.data ?? []) as (Exam & { student: { id: string; full_name: string } | null })[];
  const firstName = (ctx.fullName || "").split(" ")[0];
  const now = Date.now();
  const doneToday = lessonsToday.filter((l) => l.status === "done").length;
  const next = lessonsToday.find((l) => l.status === "planned" && new Date(l.ends_at).getTime() > now);
  const inTraining = studentList.filter((s) => s.status === "active" || s.status === "code_ok").length;

  const quick = [
    { href: "/app/eleves/nouveau", label: "Nouvel élève", icon: UserPlus, tone: "bg-brand-50 text-brand-700 dark:bg-brand-900/50 dark:text-brand-200" },
    { href: "/app/planning?nouveau=1", label: "Planifier", icon: CalendarPlus, tone: "bg-sky-50 text-sky-700 dark:bg-sky-900/40 dark:text-sky-200" },
    { href: "/app/paiements?encaisser=1", label: "Encaisser", icon: Wallet, tone: "bg-amber-50 text-amber-800 dark:bg-amber-900/40 dark:text-amber-200" },
    { href: "/app/paiements?onglet=retards", label: "Relances", icon: BellRing, tone: "bg-rose-50 text-rose-700 dark:bg-rose-900/40 dark:text-rose-200" },
  ];

  return (
    <>
      <PageHeader
        title={bienvenue ? `Bienvenue${firstName ? `, ${firstName}` : ""} 🎉` : `${greeting(new Date().getUTCHours())}${firstName ? ` ${firstName}` : ""} 👋`}
        description={
          bienvenue ? (
            "Votre auto-école est créée. Ajoutez vos moniteurs et vos voitures (menu Équipe), puis vos élèves."
          ) : (
            <span className="first-letter:uppercase">
              {longDay(today)} · {ctx.school.name}
            </span>
          )
        }
      />

      {isStaff && (
        <div className="mb-5 grid grid-cols-4 gap-2 sm:gap-3">
          {quick.map((q) => (
            <Link key={q.href} href={q.href} className="group flex flex-col items-center gap-2 rounded-2xl border border-line bg-surface p-3 text-center transition hover:-translate-y-0.5 hover:border-brand-400 hover:shadow-lg sm:flex-row sm:p-4 sm:text-left">
              <span className={cn("grid h-11 w-11 shrink-0 place-items-center rounded-2xl transition group-hover:scale-105", q.tone)}>
                <q.icon className="h-5 w-5" />
              </span>
              <span className="text-xs font-bold leading-tight sm:text-sm">{q.label}</span>
            </Link>
          ))}
        </div>
      )}

      {isStaff ? (
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4 lg:gap-4">
          <Stat label="Encaissé ce mois" value={collected} format="money" icon={<Wallet className="h-4 w-4" />} tone="brand" href="/app/paiements" />
          <Stat
            label="Impayés en retard"
            value={lateTotal}
            format="money"
            icon={<AlertTriangle className="h-4 w-4" />}
            tone="bad"
            hint={`${overdue.length} élève${overdue.length > 1 ? "s" : ""}`}
            delay={0.05}
            href="/app/paiements?onglet=retards"
          />
          <Stat label="Leçons aujourd'hui" value={lessonsToday.length} icon={<CalendarCheck className="h-4 w-4" />} hint={`${doneToday} faite${doneToday > 1 ? "s" : ""}`} delay={0.1} href="/app/planning" />
          <Stat label="Élèves en formation" value={inTraining} icon={<Users className="h-4 w-4" />} hint={`${studentList.length} inscrits`} delay={0.15} href="/app/eleves" />
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-3 lg:gap-4">
          <Stat label="Mes leçons aujourd'hui" value={lessonsToday.length} icon={<CalendarCheck className="h-4 w-4" />} tone="brand" hint={`${doneToday} faite${doneToday > 1 ? "s" : ""}`} href="/app/planning" />
          <Stat label="Mes leçons demain" value={lessonsTomorrow.length} icon={<CalendarClock className="h-4 w-4" />} delay={0.05} href={`/app/planning?jour=${tomorrow}`} />
        </div>
      )}

      <div className="mt-6 grid gap-6 lg:grid-cols-5">
        <div className="space-y-6 lg:col-span-3">
          {next && (
            <Card className="overflow-hidden" delay={0.1}>
              <div className="relative bg-asphalt p-5 text-white">
                <div className="lane-dashes absolute inset-x-0 bottom-0 h-1.5 opacity-60" />
                <p className="text-xs font-bold uppercase tracking-wider text-brand-200">Prochaine leçon</p>
                <div className="mt-3 flex items-center gap-4">
                  <p className="text-4xl font-extrabold tabular-nums">{next.starts_at.slice(11, 16)}</p>
                  <div className="min-w-0">
                    <p className="truncate text-lg font-bold">{next.student?.full_name ?? "—"}</p>
                    <p className="flex flex-wrap items-center gap-x-2 text-sm text-slate-300">
                      <span>{next.kind === "code" ? "Code" : "Conduite"}</span>
                      {next.instructor && <span>· {next.instructor.full_name}</span>}
                      {next.vehicle && (
                        <span className="inline-flex items-center gap-1">
                          · <Car className="h-3.5 w-3.5" /> {next.vehicle.label}
                        </span>
                      )}
                    </p>
                  </div>
                </div>
                {next.student && (
                  <div className="mt-4 flex gap-2">
                    <a href={`tel:+${next.student.phone}`} className="inline-flex h-10 flex-1 items-center justify-center gap-2 rounded-xl bg-white/10 text-sm font-semibold transition hover:bg-white/20 sm:flex-none sm:px-4">
                      <Phone className="h-4 w-4" /> Appeler
                    </a>
                    <a
                      href={waLink(next.student.phone, lessonReminder(next.student.full_name, ctx.school.name, next.starts_at, next.instructor?.full_name))}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex h-10 flex-1 items-center justify-center gap-2 rounded-xl bg-[#25D366] text-sm font-semibold transition hover:brightness-95 sm:flex-none sm:px-4"
                    >
                      <MessageCircle className="h-4 w-4" /> WhatsApp
                    </a>
                  </div>
                )}
              </div>
            </Card>
          )}

          <Card delay={0.15}>
            <div className="border-b border-line px-5 py-4">
              <div className="flex items-center justify-between gap-3">
                <h2 className="font-bold">{isStaff ? "Leçons du jour" : "Ma journée"}</h2>
                <Link href="/app/planning" className="inline-flex items-center gap-1 text-sm font-semibold text-brand-700 hover:underline">
                  Planning <ArrowRight className="h-3.5 w-3.5" />
                </Link>
              </div>
              {lessonsToday.length > 0 && (
                <div className="mt-3 flex items-center gap-3">
                  <div className="flex-1">
                    <ProgressBar value={doneToday} total={lessonsToday.length} />
                  </div>
                  <span className="text-xs font-semibold text-muted tabular-nums">
                    {doneToday}/{lessonsToday.length} faites
                  </span>
                </div>
              )}
            </div>
            {lessonsToday.length ? (
              <StaggerList className="divide-y divide-line">
                {lessonsToday.map((lesson) => (
                  <StaggerItem key={lesson.id}>
                    <LessonRow lesson={lesson} canCancel={isStaff} now={now} />
                  </StaggerItem>
                ))}
              </StaggerList>
            ) : (
              <Empty title="Aucune leçon aujourd'hui">{isStaff ? "Planifiez les leçons avec le bouton « + »." : "Profitez de votre journée."}</Empty>
            )}
          </Card>
        </div>

        <div className="space-y-6 lg:col-span-2">
          <Card delay={0.2}>
            <CardTitle title={isStaff ? "Rappels pour demain" : "Demain"} action={<Badge tone="info">{lessonsTomorrow.length}</Badge>} />
            {autoSend && lessonsTomorrow.length > 0 && (
              <ActionForm action={sendRemindersNow} className="border-b border-line px-5 py-3">
                <input type="hidden" name="date" value={tomorrow} />
                <Submit className="h-10 w-full">
                  <Send className="h-4 w-4" /> Envoyer tous les rappels WhatsApp
                </Submit>
                <p className="mt-2 text-center text-xs text-muted">
                  {ctx.school.whatsapp_auto ? "Envoi automatique activé : ils partent aussi seuls à 18 h." : "Chaque élève ne reçoit qu'un rappel par leçon."}
                </p>
              </ActionForm>
            )}
            {lessonsTomorrow.length ? (
              <ul className="divide-y divide-line">
                {lessonsTomorrow.slice(0, 6).map((l) => (
                  <li key={l.id} className="flex items-center gap-3 px-5 py-3">
                    <span className="w-12 shrink-0 font-extrabold tabular-nums">{l.starts_at.slice(11, 16)}</span>
                    <div className="min-w-0 flex-1">
                      <p className="truncate font-semibold">{l.student?.full_name}</p>
                      <p className="truncate text-xs text-muted">{l.instructor?.full_name ?? "Sans moniteur"}</p>
                    </div>
                    {l.student && (
                      <a
                        href={waLink(l.student.phone, lessonReminder(l.student.full_name, ctx.school.name, l.starts_at, l.instructor?.full_name))}
                        target="_blank"
                        rel="noopener noreferrer"
                        aria-label={`Rappeler ${l.student.full_name} sur WhatsApp`}
                        title="Envoyer le rappel sur WhatsApp"
                        className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-[#25D366]/10 text-[#128C7E] transition hover:bg-[#25D366] hover:text-white"
                      >
                        <MessageCircle className="h-4 w-4" />
                      </a>
                    )}
                  </li>
                ))}
                {lessonsTomorrow.length > 6 && (
                  <li>
                    <Link href={`/app/planning?jour=${tomorrow}`} className="flex items-center justify-center gap-1 px-5 py-3 text-sm font-semibold text-brand-700 hover:bg-bg">
                      Voir les {lessonsTomorrow.length} leçons de demain <ArrowRight className="h-3.5 w-3.5" />
                    </Link>
                  </li>
                )}
              </ul>
            ) : (
              <p className="px-5 py-6 text-sm text-muted">Aucune leçon prévue demain.</p>
            )}
          </Card>

          {isStaff && (
            <Card delay={0.25}>
              <CardTitle title="À relancer" action={lateTotal > 0 ? <Badge tone="bad">{money(lateTotal)}</Badge> : undefined} />
              {overdue.length ? (
                <ul className="divide-y divide-line">
                  {overdue.slice(0, 5).map((b) => (
                    <li key={b.student_id} className="flex items-center gap-3 px-5 py-3">
                      <Avatar name={b.student!.full_name} size="sm" />
                      <div className="min-w-0 flex-1">
                        <Link href={`/app/eleves/${b.student_id}`} className="block truncate font-semibold hover:text-brand-700">
                          {b.student!.full_name}
                        </Link>
                        <p className="text-xs text-muted">
                          <span className="font-bold text-red-600">{money(b.late)}</span> · {displayPhone(b.student!.phone)}
                        </p>
                      </div>
                      <a
                        href={waLink(b.student!.phone, paymentReminder(b.student!.full_name, ctx.school.name, b.late))}
                        target="_blank"
                        rel="noopener noreferrer"
                        aria-label={`Relancer ${b.student!.full_name} sur WhatsApp`}
                        title="Relancer sur WhatsApp"
                        className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-[#25D366]/10 text-[#128C7E] transition hover:bg-[#25D366] hover:text-white"
                      >
                        <MessageCircle className="h-4 w-4" />
                      </a>
                    </li>
                  ))}
                  <li>
                    <Link href="/app/paiements?onglet=retards" className="flex items-center justify-center gap-1 px-5 py-3 text-sm font-semibold text-brand-700 hover:bg-bg">
                      Tous les retards ({overdue.length}) <ArrowRight className="h-3.5 w-3.5" />
                    </Link>
                  </li>
                </ul>
              ) : (
                <p className="px-5 py-6 text-sm text-muted">Aucun impayé en retard. Bravo ! 👏</p>
              )}
            </Card>
          )}

          <Card delay={0.3}>
            <CardTitle title="Examens à venir" action={<GraduationCap className="h-4 w-4 text-muted" />} />
            {upcomingExams.length ? (
              <ul className="divide-y divide-line">
                {upcomingExams.map((e) => (
                  <li key={e.id} className="flex items-center gap-3 px-5 py-3">
                    <span className="w-14 shrink-0 text-center">
                      <span className="block text-[11px] font-bold uppercase text-muted">{weekday(e.exam_date).slice(0, 3)}</span>
                      <span className="block font-extrabold">{dayShort(e.exam_date)}</span>
                    </span>
                    <div className="min-w-0 flex-1">
                      {e.student ? (
                        <Link href={`/app/eleves/${e.student.id}`} className="block truncate font-semibold hover:text-brand-700">
                          {e.student.full_name}
                        </Link>
                      ) : (
                        <p className="font-semibold">—</p>
                      )}
                    </div>
                    <Badge tone={e.kind === "code" ? "info" : "warn"}>{e.kind === "code" ? "Code" : "Conduite"}</Badge>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="px-5 py-6 text-sm text-muted">Aucun examen dans les 30 prochains jours.</p>
            )}
          </Card>

          {isStaff && studentList.length === 0 && (
            <ButtonLink href="/app/eleves/nouveau" className="w-full justify-center">
              <UserPlus className="h-4 w-4" /> Inscrire le premier élève
            </ButtonLink>
          )}
        </div>
      </div>
    </>
  );
}
