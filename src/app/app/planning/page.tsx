import type { Metadata } from "next";
import Link from "next/link";
import { CalendarPlus, ChevronLeft, ChevronRight, LayoutGrid, List } from "lucide-react";
import { Card, Empty, PageHeader } from "@/components/app/ui";
import { LessonForm } from "@/components/app/lesson-form";
import { LessonRow, type LessonWithNames } from "@/components/app/lesson-row";
import { ParamSelect, SearchBox, Tabs } from "@/components/app/filters";
import { Sheet } from "@/components/ui/sheet";
import { createClient } from "@/lib/supabase/server";
import { requireContext } from "@/lib/session";
import { addDaysIso, dayMonth, dayShort, longDay, mondayOf, todayIso, weekday } from "@/lib/format";
import { fold, withParams } from "@/lib/url";
import { cn } from "@/lib/utils";

export const metadata: Metadata = { title: "Planning" };

type Params = { semaine?: string; jour?: string; vue?: string; q?: string; moniteur?: string; voiture?: string; statut?: string; eleve?: string; nouveau?: string };

const ISO = /^\d{4}-\d{2}-\d{2}$/;
const STATUS_FILTERS = [
  { key: "", label: "Toutes" },
  { key: "a-venir", label: "Prévues" },
  { key: "faites", label: "Faites" },
  { key: "absences", label: "Absences" },
  { key: "annulees", label: "Annulées" },
] as const;

export default async function PlanningPage({ searchParams }: { searchParams: Promise<Params> }) {
  const params = await searchParams;
  const ctx = await requireContext();
  const supabase = await createClient();
  const isStaff = ctx.role !== "instructor";

  const today = todayIso();
  const anchor = ISO.test(params.semaine ?? "") ? params.semaine! : ISO.test(params.jour ?? "") ? params.jour! : today;
  const monday = mondayOf(anchor);
  const days = Array.from({ length: 7 }, (_, i) => addDaysIso(monday, i));
  const selected = ISO.test(params.jour ?? "") && days.includes(params.jour!) ? params.jour! : days.includes(today) ? today : monday;
  const view = params.vue === "jour" ? "jour" : "semaine";
  const statut = params.statut ?? "";

  let query = supabase
    .from("lessons")
    .select("*, student:students(id, full_name, phone), instructor:instructors(full_name), vehicle:vehicles(label)")
    .gte("starts_at", `${monday}T00:00:00Z`)
    .lt("starts_at", `${addDaysIso(monday, 7)}T00:00:00Z`)
    .order("starts_at");
  // Un moniteur relié à sa fiche ne voit que ses propres leçons.
  if (!isStaff && ctx.instructorId) query = query.eq("instructor_id", ctx.instructorId);
  if (isStaff && params.moniteur) query = query.eq("instructor_id", params.moniteur);
  if (params.voiture) query = query.eq("vehicle_id", params.voiture);

  const [{ data: lessons }, { data: students }, { data: instructors }, { data: vehicles }] = await Promise.all([
    query,
    isStaff ? supabase.from("students").select("id, full_name").in("status", ["active", "code_ok"]).order("full_name") : Promise.resolve({ data: [] }),
    supabase.from("instructors").select("id, full_name").eq("active", true).order("full_name"),
    supabase.from("vehicles").select("id, label").eq("active", true).order("label"),
  ]);

  const term = fold(params.q?.trim() ?? "");
  const all = ((lessons ?? []) as LessonWithNames[]).filter((l) => !term || fold(l.student?.full_name ?? "").includes(term));
  const visible = all.filter((l) =>
    statut === "a-venir" ? l.status === "planned" : statut === "faites" ? l.status === "done" : statut === "absences" ? l.status === "missed" : statut === "annulees" ? l.status === "cancelled" : l.status !== "cancelled",
  );
  const byDay = new Map<string, LessonWithNames[]>(days.map((d) => [d, []]));
  for (const l of visible) byDay.get(l.starts_at.slice(0, 10))?.push(l);
  const active = all.filter((l) => l.status !== "cancelled");
  const counts = {
    total: active.length,
    done: active.filter((l) => l.status === "done").length,
    planned: active.filter((l) => l.status === "planned").length,
    missed: active.filter((l) => l.status === "missed").length,
  };
  const now = Date.now();

  const current: Params = { ...params, semaine: monday, nouveau: undefined, eleve: undefined };
  const href = (changes: Partial<Record<keyof Params, string | null>>) => withParams("/app/planning", current, changes);
  const dayLessons = byDay.get(selected) ?? [];
  const filtered = Boolean(term || params.moniteur || params.voiture || statut);

  return (
    <>
      <PageHeader
        title={isStaff ? "Planning" : "Mon planning"}
        description={`Semaine du ${dayMonth(monday)} au ${dayMonth(addDaysIso(monday, 6))}`}
        actions={
          isStaff ? (
            <Sheet
              title="Planifier une leçon"
              defaultOpen={Boolean(params.nouveau || params.eleve)}
              triggerClassName="inline-flex h-10 items-center gap-2 rounded-xl bg-brand-600 px-4 text-sm font-semibold text-white shadow-lg shadow-brand-600/20 transition hover:bg-brand-700"
              trigger={
                <>
                  <CalendarPlus className="h-4 w-4" /> Planifier
                </>
              }
            >
              <LessonForm
                students={(students ?? []).map((s) => ({ id: s.id, label: s.full_name }))}
                instructors={(instructors ?? []).map((i) => ({ id: i.id, label: i.full_name }))}
                vehicles={(vehicles ?? []).map((v) => ({ id: v.id, label: v.label }))}
                defaultStudent={params.eleve}
                defaultDate={selected < today ? today : selected}
              />
            </Sheet>
          ) : undefined
        }
      />

      {/* Semaine : navigation + résumé */}
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-1 rounded-2xl border border-line bg-surface p-1">
          <Link href={href({ semaine: addDaysIso(monday, -7), jour: null })} scroll={false} className="grid h-9 w-9 place-items-center rounded-xl hover:bg-bg" aria-label="Semaine précédente">
            <ChevronLeft className="h-4 w-4" />
          </Link>
          <Link href={href({ semaine: null, jour: null })} scroll={false} className="rounded-xl px-3 py-2 text-sm font-semibold hover:bg-bg">
            Aujourd'hui
          </Link>
          <Link href={href({ semaine: addDaysIso(monday, 7), jour: null })} scroll={false} className="grid h-9 w-9 place-items-center rounded-xl hover:bg-bg" aria-label="Semaine suivante">
            <ChevronRight className="h-4 w-4" />
          </Link>
        </div>
        <p className="text-sm text-muted">
          <b className="text-ink">{counts.total}</b> leçon{counts.total > 1 ? "s" : ""} · <b className="text-brand-700">{counts.done}</b> faite{counts.done > 1 ? "s" : ""} ·{" "}
          <b className="text-sky-600">{counts.planned}</b> prévue{counts.planned > 1 ? "s" : ""}
          {counts.missed > 0 && (
            <>
              {" "}
              · <b className="text-red-600">{counts.missed}</b> absence{counts.missed > 1 ? "s" : ""}
            </>
          )}
        </p>
        <div className="hidden items-center gap-1 rounded-2xl border border-line bg-surface p-1 lg:flex">
          <Link href={href({ vue: null })} scroll={false} className={cn("flex items-center gap-1.5 rounded-xl px-3 py-2 text-sm font-semibold", view === "semaine" ? "bg-asphalt text-white dark:bg-brand-600" : "text-muted hover:text-ink")}>
            <LayoutGrid className="h-4 w-4" /> Semaine
          </Link>
          <Link href={href({ vue: "jour" })} scroll={false} className={cn("flex items-center gap-1.5 rounded-xl px-3 py-2 text-sm font-semibold", view === "jour" ? "bg-asphalt text-white dark:bg-brand-600" : "text-muted hover:text-ink")}>
            <List className="h-4 w-4" /> Jour
          </Link>
        </div>
      </div>

      {/* Filtres */}
      <div className="mb-5 space-y-3">
        <div className="flex flex-col gap-2 sm:flex-row">
          <SearchBox placeholder="Rechercher un élève" className="sm:max-w-xs sm:flex-1" />
          <div className="grid grid-cols-2 gap-2 sm:flex">
            {isStaff && (
              <ParamSelect
                param="moniteur"
                label="Moniteur"
                options={[{ value: "", label: "Moniteurs" }, ...(instructors ?? []).map((i) => ({ value: i.id, label: i.full_name }))]}
              />
            )}
            <ParamSelect param="voiture" label="Voiture" options={[{ value: "", label: "Voitures" }, ...(vehicles ?? []).map((v) => ({ value: v.id, label: v.label }))]} />
          </div>
        </div>
        <Tabs id="planning-statut" items={STATUS_FILTERS.map((f) => ({ href: href({ statut: f.key || null }), label: f.label, active: statut === f.key }))} />
      </div>

      {/* Bande des jours (téléphone, et vue « Jour » sur ordinateur) */}
      <div className={cn("mb-4 grid grid-cols-7 gap-1.5", view === "semaine" && "lg:hidden")}>
        {days.map((d) => {
          const n = (byDay.get(d) ?? []).length;
          const isSel = d === selected;
          return (
            <Link
              key={d}
              href={href({ jour: d })}
              scroll={false}
              replace
              className={cn(
                "flex flex-col items-center rounded-2xl border py-2 transition",
                isSel ? "border-brand-600 bg-brand-600 text-white shadow-lg shadow-brand-600/25" : "border-line bg-surface hover:border-brand-400",
              )}
            >
              <span className={cn("text-[11px] font-semibold uppercase", isSel ? "text-brand-50" : "text-muted")}>{weekday(d).slice(0, 3)}</span>
              <span className={cn("text-lg font-extrabold leading-tight", d === today && !isSel && "text-brand-700")}>{Number(d.slice(8, 10))}</span>
              <span className={cn("mt-0.5 h-1.5 w-1.5 rounded-full", n === 0 ? "bg-transparent" : isSel ? "bg-white" : "bg-brand-500")} />
            </Link>
          );
        })}
      </div>

      {/* Liste du jour choisi */}
      <Card className={cn(view === "semaine" && "lg:hidden")}>
        <div className="flex items-center justify-between border-b border-line px-5 py-4">
          <h2 className="font-bold first-letter:uppercase">
            {longDay(selected)}
            {selected === today && <span className="ml-2 rounded-full bg-brand-50 px-2 py-0.5 text-xs font-bold text-brand-700 dark:bg-brand-900/50 dark:text-brand-200">Aujourd'hui</span>}
          </h2>
          <span className="text-sm text-muted">
            {dayLessons.length} leçon{dayLessons.length > 1 ? "s" : ""}
          </span>
        </div>
        {dayLessons.length ? (
          <div className="divide-y divide-line">
            {dayLessons.map((l) => (
              <LessonRow key={l.id} lesson={l} canCancel={isStaff} now={now} />
            ))}
          </div>
        ) : (
          <Empty title={filtered ? "Aucune leçon ne correspond" : "Journée libre"}>{filtered ? "Modifiez la recherche ou les filtres." : isStaff ? "Appuyez sur « Planifier » pour ajouter une leçon." : "Aucune leçon prévue ce jour-là."}</Empty>
        )}
      </Card>

      {/* Vue semaine (ordinateur) */}
      {view === "semaine" && (
        <div className="hidden grid-cols-7 gap-2 lg:grid">
          {days.map((d) => {
            const list = byDay.get(d) ?? [];
            return (
              <div key={d} className={cn("min-h-64 rounded-2xl border bg-surface", d === today ? "border-brand-500 ring-4 ring-brand-500/10" : "border-line")}>
                <Link href={href({ vue: "jour", jour: d })} scroll={false} className="flex items-baseline justify-between border-b border-line px-3 py-2.5 hover:bg-bg">
                  <span>
                    <span className="block text-[11px] font-semibold uppercase text-muted">{weekday(d)}</span>
                    <span className={cn("text-lg font-extrabold", d === today && "text-brand-700")}>{dayShort(d)}</span>
                  </span>
                  <span className="text-xs font-bold text-muted">{list.length || ""}</span>
                </Link>
                <div className="space-y-1.5 p-1.5">
                  {list.map((l) => (
                    <Link
                      key={l.id}
                      href={href({ vue: "jour", jour: d })}
                      scroll={false}
                      className={cn(
                        "block rounded-xl border-l-4 px-2 py-1.5 text-xs transition hover:brightness-95",
                        l.status === "done" && "border-brand-500 bg-brand-50 dark:bg-brand-900/30",
                        l.status === "missed" && "border-red-500 bg-red-50 dark:bg-red-900/30",
                        l.status === "cancelled" && "border-slate-300 bg-bg line-through opacity-60",
                        l.status === "planned" && (new Date(l.ends_at).getTime() < now ? "border-amber-400 bg-amber-50 dark:bg-amber-900/30" : "border-sky-400 bg-sky-50 dark:bg-sky-900/30"),
                      )}
                    >
                      <span className="font-bold tabular-nums">{l.starts_at.slice(11, 16)}</span>
                      <span className="block truncate font-semibold">{l.student?.full_name ?? "—"}</span>
                      <span className="block truncate text-muted">{l.instructor?.full_name ?? "Sans moniteur"}</span>
                    </Link>
                  ))}
                  {!list.length && <p className="px-2 py-4 text-center text-xs text-muted">—</p>}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </>
  );
}
