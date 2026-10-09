import type { Metadata } from "next";
import Link from "next/link";
import { addDays, format, startOfWeek } from "date-fns";
import { fr } from "date-fns/locale";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Card, PageHeader } from "@/components/app/ui";
import { LessonForm } from "@/components/app/lesson-form";
import { LessonRow, type LessonWithNames } from "@/components/app/lesson-row";
import { createClient } from "@/lib/supabase/server";
import { requireContext } from "@/lib/session";
import { todayIso } from "@/lib/format";
import { cn } from "@/lib/utils";

export const metadata: Metadata = { title: "Planning" };

const iso = (d: Date) => d.toISOString().slice(0, 10);

export default async function PlanningPage({ searchParams }: { searchParams: Promise<{ semaine?: string; eleve?: string }> }) {
  const { semaine, eleve } = await searchParams;
  const ctx = await requireContext();
  const supabase = await createClient();

  const today = todayIso();
  const anchor = /^\d{4}-\d{2}-\d{2}$/.test(semaine ?? "") ? new Date(`${semaine}T00:00:00Z`) : new Date(`${today}T00:00:00Z`);
  const monday = startOfWeek(anchor, { weekStartsOn: 1 });
  const days = Array.from({ length: 7 }, (_, i) => addDays(monday, i));
  const end = addDays(monday, 7);

  const isStaff = ctx.role !== "instructor";
  let lessonQuery = supabase
    .from("lessons")
    .select("*, student:students(id, full_name, phone), instructor:instructors(full_name), vehicle:vehicles(label)")
    .gte("starts_at", `${iso(monday)}T00:00:00Z`)
    .lt("starts_at", `${iso(end)}T00:00:00Z`)
    .neq("status", "cancelled")
    .order("starts_at");
  // Un moniteur relié à sa fiche ne voit que ses propres leçons.
  if (!isStaff && ctx.instructorId) lessonQuery = lessonQuery.eq("instructor_id", ctx.instructorId);

  const [{ data: lessons }, { data: students }, { data: instructors }, { data: vehicles }] = await Promise.all([
    lessonQuery,
    supabase.from("students").select("id, full_name").in("status", ["active", "code_ok"]).order("full_name"),
    supabase.from("instructors").select("id, full_name").eq("active", true).order("full_name"),
    supabase.from("vehicles").select("id, label").eq("active", true).order("label"),
  ]);

  const byDay = new Map<string, LessonWithNames[]>();
  for (const l of (lessons ?? []) as LessonWithNames[]) {
    const key = l.starts_at.slice(0, 10);
    byDay.set(key, [...(byDay.get(key) ?? []), l]);
  }

  return (
    <>
      <PageHeader
        title="Planning"
        description={`Semaine du ${format(monday, "d MMMM", { locale: fr })}`}
        actions={
          <div className="flex items-center gap-1 rounded-xl border border-line bg-surface p-1">
            <Link href={`/app/planning?semaine=${iso(addDays(monday, -7))}`} className="rounded-lg p-2 hover:bg-bg" aria-label="Semaine précédente">
              <ChevronLeft className="h-4 w-4" />
            </Link>
            <Link href="/app/planning" className="rounded-lg px-3 py-1.5 text-sm font-semibold hover:bg-bg">
              Aujourd'hui
            </Link>
            <Link href={`/app/planning?semaine=${iso(addDays(monday, 7))}`} className="rounded-lg p-2 hover:bg-bg" aria-label="Semaine suivante">
              <ChevronRight className="h-4 w-4" />
            </Link>
          </div>
        }
      />

      {isStaff && (
        <LessonForm
          students={(students ?? []).map((s) => ({ id: s.id, label: s.full_name }))}
          instructors={(instructors ?? []).map((i) => ({ id: i.id, label: i.full_name }))}
          vehicles={(vehicles ?? []).map((v) => ({ id: v.id, label: v.label }))}
          defaultStudent={eleve}
          defaultDate={iso(anchor) < today ? today : iso(anchor)}
        />
      )}

      <div className="space-y-4">
        {days.map((d, i) => {
          const key = iso(d);
          const list = byDay.get(key) ?? [];
          const isToday = key === today;
          return (
            <Card key={key} delay={i * 0.04} className={cn(isToday && "border-brand-500 ring-4 ring-brand-500/10")}>
              <div className="flex items-center justify-between border-b border-line px-5 py-3">
                <p className="font-bold capitalize">
                  {format(d, "EEEE d MMMM", { locale: fr })}
                  {isToday && <span className="ml-2 rounded-full bg-brand-600 px-2 py-0.5 text-xs text-white">Aujourd'hui</span>}
                </p>
                <span className="text-sm text-muted">
                  {list.length} leçon{list.length > 1 ? "s" : ""}
                </span>
              </div>
              {list.length ? (
                <div className="divide-y divide-line">
                  {list.map((l) => (
                    <LessonRow key={l.id} lesson={l} canCancel={isStaff} />
                  ))}
                </div>
              ) : (
                <p className="px-5 py-4 text-sm text-muted">Libre</p>
              )}
            </Card>
          );
        })}
      </div>
    </>
  );
}
