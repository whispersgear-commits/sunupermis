import type { Metadata } from "next";
import { AlertTriangle, CalendarCheck, CalendarClock, MessageCircle, Send, Users, Wallet } from "lucide-react";
import { addDays, startOfMonth } from "date-fns";
import { Badge, ButtonLink, Card, CardTitle, Empty, PageHeader, Stat, StaggerItem, StaggerList } from "@/components/app/ui";
import { LessonRow, type LessonWithNames } from "@/components/app/lesson-row";
import { createClient } from "@/lib/supabase/server";
import { requireContext } from "@/lib/session";
import { money, todayIso } from "@/lib/format";
import { displayPhone } from "@/lib/phone";
import { lessonReminder, paymentReminder, waLink } from "@/lib/whatsapp";
import { whatsappConfigured } from "@/lib/whatsapp-api";
import { ActionForm, Submit } from "@/components/ui/form";
import { sendRemindersNow } from "./actions";
import type { Balance, Student } from "@/lib/types";

export const metadata: Metadata = { title: "Accueil" };

const LESSON_SELECT = "*, student:students(id, full_name, phone), instructor:instructors(full_name), vehicle:vehicles(label)";

export default async function Dashboard({ searchParams }: { searchParams: Promise<{ bienvenue?: string }> }) {
  const { bienvenue } = await searchParams;
  const ctx = await requireContext();
  const supabase = await createClient();

  const today = todayIso();
  const tomorrow = addDays(new Date(`${today}T00:00:00Z`), 1)
    .toISOString()
    .slice(0, 10);
  const afterTomorrow = addDays(new Date(`${today}T00:00:00Z`), 2)
    .toISOString()
    .slice(0, 10);

  const isStaff = ctx.role !== "instructor";
  // Un moniteur relié à sa fiche ne voit que ses leçons, et pas l'argent.
  const mine = !isStaff && ctx.instructorId ? ctx.instructorId : null;
  const lessonsBetween = (from: string, to: string) => {
    const q = supabase.from("lessons").select(LESSON_SELECT).gte("starts_at", `${from}T00:00:00Z`).lt("starts_at", `${to}T00:00:00Z`).order("starts_at");
    return mine ? q.eq("instructor_id", mine) : q;
  };

  const [todayLessons, tomorrowLessons, students, balances, monthPayments] = await Promise.all([
    lessonsBetween(today, tomorrow).neq("status", "cancelled"),
    lessonsBetween(tomorrow, afterTomorrow).eq("status", "planned"),
    supabase.from("students").select("id, full_name, phone, status").neq("status", "dropped"),
    isStaff ? supabase.from("student_balances").select("*") : Promise.resolve({ data: [] }),
    isStaff ? supabase.from("payments").select("amount").gte("paid_at", startOfMonth(new Date()).toISOString()) : Promise.resolve({ data: [] }),
  ]);
  const autoSend = isStaff && whatsappConfigured();

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
  const firstName = (ctx.fullName || "").split(" ")[0];

  return (
    <>
      <PageHeader
        title={bienvenue ? `Bienvenue${firstName ? `, ${firstName}` : ""} 🎉` : `Bonjour${firstName ? ` ${firstName}` : ""} 👋`}
        description={bienvenue ? "Votre auto-école est créée. Commencez par ajouter vos moniteurs et vos voitures, puis vos élèves." : ctx.school.name}
        actions={
          <>
            <ButtonLink href="/app/planning" variant="secondary">
              Planning
            </ButtonLink>
            {isStaff && <ButtonLink href="/app/eleves/nouveau">+ Nouvel élève</ButtonLink>}
          </>
        }
      />

      {isStaff ? (
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4 lg:gap-4">
          <Stat label="Encaissé ce mois" value={collected} format="money" icon={<Wallet className="h-4 w-4" />} tone="brand" />
          <Stat
            label="Impayés en retard"
            value={lateTotal}
            format="money"
            icon={<AlertTriangle className="h-4 w-4" />}
            tone="bad"
            hint={`${overdue.length} élève${overdue.length > 1 ? "s" : ""}`}
            delay={0.05}
            href="/app/paiements"
          />
          <Stat label="Leçons aujourd'hui" value={lessonsToday.length} icon={<CalendarCheck className="h-4 w-4" />} delay={0.1} href="/app/planning" />
          <Stat
            label="Élèves en formation"
            value={studentList.filter((s) => s.status === "active" || s.status === "code_ok").length}
            icon={<Users className="h-4 w-4" />}
            delay={0.15}
            href="/app/eleves"
          />
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-3 lg:gap-4">
          <Stat label="Mes leçons aujourd'hui" value={lessonsToday.length} icon={<CalendarCheck className="h-4 w-4" />} tone="brand" href="/app/planning" />
          <Stat label="Mes leçons demain" value={lessonsTomorrow.length} icon={<CalendarClock className="h-4 w-4" />} delay={0.05} href="/app/planning" />
        </div>
      )}

      <div className="mt-6 grid gap-6 lg:grid-cols-5">
        <Card className="lg:col-span-3" delay={0.15}>
          <CardTitle title={isStaff ? "Leçons du jour" : "Mes leçons du jour"} action={<Badge tone="good">{lessonsToday.length}</Badge>} />
          {lessonsToday.length ? (
            <StaggerList className="divide-y divide-line">
              {lessonsToday.map((lesson) => (
                <StaggerItem key={lesson.id}>
                  <LessonRow lesson={lesson} canCancel={isStaff} />
                </StaggerItem>
              ))}
            </StaggerList>
          ) : (
            <Empty title="Aucune leçon aujourd'hui">Planifiez les leçons depuis le planning.</Empty>
          )}
        </Card>

        <div className="space-y-6 lg:col-span-2">
          <Card delay={0.2}>
            <CardTitle title={isStaff ? "Rappels pour demain" : "Mes leçons de demain"} action={<Badge tone="info">{lessonsTomorrow.length}</Badge>} />
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
              <StaggerList className="divide-y divide-line">
                {lessonsTomorrow.map((l) => (
                  <StaggerItem key={l.id} className="flex items-center justify-between gap-3 px-5 py-3">
                    <div className="min-w-0">
                      <p className="truncate font-semibold">{l.student?.full_name}</p>
                      <p className="text-xs text-muted">
                        {l.starts_at.slice(11, 16)} · {l.instructor?.full_name ?? "Sans moniteur"}
                      </p>
                    </div>
                    {l.student && (
                      <ButtonLink
                        variant="whatsapp"
                        href={waLink(l.student.phone, lessonReminder(l.student.full_name, ctx.school.name, l.starts_at, l.instructor?.full_name))}
                        className="h-9 px-3"
                      >
                        <MessageCircle className="h-4 w-4" /> Rappeler
                      </ButtonLink>
                    )}
                  </StaggerItem>
                ))}
              </StaggerList>
            ) : (
              <p className="px-5 py-6 text-sm text-muted">Aucune leçon prévue demain.</p>
            )}
          </Card>

          {isStaff && (
            <Card delay={0.25}>
              <CardTitle title="À relancer" action={lateTotal > 0 ? <Badge tone="bad">{money(lateTotal)}</Badge> : undefined} />
              {overdue.length ? (
                <StaggerList className="divide-y divide-line">
                  {overdue.slice(0, 6).map((b) => (
                    <StaggerItem key={b.student_id} className="flex items-center justify-between gap-3 px-5 py-3">
                      <div className="min-w-0">
                        <a href={`/app/eleves/${b.student_id}`} className="block truncate font-semibold hover:text-brand-700">
                          {b.student!.full_name}
                        </a>
                        <p className="text-xs text-muted">
                          {displayPhone(b.student!.phone)} · <span className="font-semibold text-red-600">{money(b.late)}</span>
                        </p>
                      </div>
                      <ButtonLink
                        variant="whatsapp"
                        href={waLink(b.student!.phone, paymentReminder(b.student!.full_name, ctx.school.name, b.late))}
                        className="h-9 px-3"
                      >
                        <MessageCircle className="h-4 w-4" /> Relancer
                      </ButtonLink>
                    </StaggerItem>
                  ))}
                </StaggerList>
              ) : (
                <p className="px-5 py-6 text-sm text-muted">Aucun impayé en retard. Bravo ! 👏</p>
              )}
            </Card>
          )}
        </div>
      </div>
    </>
  );
}
