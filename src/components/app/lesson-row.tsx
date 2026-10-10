import Link from "next/link";
import { Car } from "lucide-react";
import type { Lesson } from "@/lib/types";
import { dayShort } from "@/lib/format";
import { cn } from "@/lib/utils";
import { LessonActions } from "./lesson-actions";

export interface LessonWithNames extends Lesson {
  student: { id: string; full_name: string; phone: string } | null;
  instructor: { full_name: string } | null;
  vehicle: { label: string } | null;
}

const BAR = { planned: "bg-sky-400", done: "bg-brand-500", missed: "bg-red-500", cancelled: "bg-slate-300" } as const;

/**
 * Une leçon. Tant qu'elle est prévue : « Faite », « Absent » et, pour le
 * bureau, « Annuler ». Sur téléphone, les boutons passent sous le nom pour
 * que celui-ci reste lisible en entier.
 */
export function LessonRow({
  lesson,
  showDate = false,
  canCancel = false,
  showStudent = true,
  now = Date.now(),
}: {
  lesson: LessonWithNames;
  showDate?: boolean;
  canCancel?: boolean;
  showStudent?: boolean;
  now?: number;
}) {
  const start = lesson.starts_at.slice(11, 16);
  const end = lesson.ends_at.slice(11, 16);
  const overdue = lesson.status === "planned" && new Date(lesson.ends_at).getTime() < now;
  const meta = [
    lesson.kind === "code" ? "Code" : "Conduite",
    lesson.instructor?.full_name ?? "Sans moniteur",
    showStudent ? lesson.vehicle?.label : null,
  ].filter(Boolean);

  return (
    <div className="flex items-stretch gap-3 px-4 py-3.5 sm:px-5">
      <span className={cn("w-1 shrink-0 rounded-full", overdue ? "bg-amber-400" : BAR[lesson.status])} aria-hidden />
      <div className="w-12 shrink-0 pt-0.5">
        {showDate && <p className="text-[11px] font-bold uppercase text-muted">{dayShort(lesson.starts_at)}</p>}
        <p className="font-extrabold tabular-nums">{start}</p>
        <p className="text-xs text-muted tabular-nums">{end}</p>
      </div>
      <div className="flex min-w-0 flex-1 flex-col gap-2.5 sm:flex-row sm:items-center sm:justify-between sm:gap-4">
        <div className="min-w-0">
          {showStudent ? (
            lesson.student ? (
              <Link href={`/app/eleves/${lesson.student.id}`} className="block font-bold leading-snug hover:text-brand-700">
                {lesson.student.full_name}
              </Link>
            ) : (
              <p className="font-bold">Élève supprimé</p>
            )
          ) : (
            <p className="font-bold leading-snug">{lesson.kind === "code" ? "Leçon de code" : "Leçon de conduite"}</p>
          )}
          <p className="mt-0.5 flex flex-wrap items-center gap-x-1.5 text-xs text-muted">
            {(showStudent ? meta : meta.slice(1)).join(" · ")}
            {!showStudent && lesson.vehicle && (
              <span className="inline-flex items-center gap-1">
                · <Car className="h-3 w-3" /> {lesson.vehicle.label}
              </span>
            )}
          </p>
        </div>

        <LessonActions lessonId={lesson.id} status={lesson.status} canCancel={canCancel} overdue={overdue} />
      </div>
    </div>
  );
}
