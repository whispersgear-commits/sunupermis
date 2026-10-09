import Link from "next/link";
import { Ban, Check, X } from "lucide-react";
import { markLesson } from "@/app/app/actions";
import { LESSON_STATUS_LABEL, type Lesson } from "@/lib/types";
import { Badge } from "./ui";

export interface LessonWithNames extends Lesson {
  student: { id: string; full_name: string; phone: string } | null;
  instructor: { full_name: string } | null;
  vehicle: { label: string } | null;
}

const TONE = { planned: "info", done: "good", missed: "bad", cancelled: "neutral" } as const;

/**
 * Une leçon, avec les boutons « Faite » et « Absent » tant qu'elle est prévue,
 * et « Annuler » pour le bureau (`canCancel`).
 */
export function LessonRow({ lesson, showDate = false, canCancel = false }: { lesson: LessonWithNames; showDate?: boolean; canCancel?: boolean }) {
  const start = lesson.starts_at.slice(11, 16);
  const end = lesson.ends_at.slice(11, 16);

  return (
    <div className="flex flex-wrap items-center gap-3 px-5 py-3.5">
      <div className="w-16 shrink-0">
        <p className="font-extrabold tabular-nums">{start}</p>
        <p className="text-xs text-muted tabular-nums">{end}</p>
      </div>
      <div className="min-w-0 flex-1">
        {lesson.student ? (
          <Link href={`/app/eleves/${lesson.student.id}`} className="block truncate font-semibold hover:text-brand-700">
            {lesson.student.full_name}
          </Link>
        ) : (
          <p className="font-semibold">Élève supprimé</p>
        )}
        <p className="truncate text-xs text-muted">
          {showDate && `${lesson.starts_at.slice(8, 10)}/${lesson.starts_at.slice(5, 7)} · `}
          {lesson.kind === "code" ? "Code" : "Conduite"} · {lesson.instructor?.full_name ?? "Sans moniteur"}
          {lesson.vehicle ? ` · ${lesson.vehicle.label}` : ""}
        </p>
      </div>
      {lesson.status === "planned" ? (
        <div className="flex gap-1.5">
          <form action={markLesson}>
            <input type="hidden" name="lesson_id" value={lesson.id} />
            <input type="hidden" name="status" value="done" />
            <button className="inline-flex h-9 items-center gap-1 rounded-xl bg-brand-600 px-3 text-xs font-bold text-white transition hover:bg-brand-700 active:scale-95">
              <Check className="h-3.5 w-3.5" /> Faite
            </button>
          </form>
          <form action={markLesson}>
            <input type="hidden" name="lesson_id" value={lesson.id} />
            <input type="hidden" name="status" value="missed" />
            <button className="inline-flex h-9 items-center gap-1 rounded-xl border border-line px-3 text-xs font-bold text-muted transition hover:border-red-300 hover:text-red-600 active:scale-95">
              <X className="h-3.5 w-3.5" /> Absent
            </button>
          </form>
          {canCancel && (
            <form action={markLesson}>
              <input type="hidden" name="lesson_id" value={lesson.id} />
              <input type="hidden" name="status" value="cancelled" />
              <button
                title="Annuler la leçon"
                aria-label="Annuler la leçon"
                className="inline-flex h-9 w-9 items-center justify-center rounded-xl border border-line text-muted transition hover:border-red-300 hover:text-red-600 active:scale-95"
              >
                <Ban className="h-3.5 w-3.5" />
              </button>
            </form>
          )}
        </div>
      ) : (
        <Badge tone={TONE[lesson.status]}>{LESSON_STATUS_LABEL[lesson.status]}</Badge>
      )}
    </div>
  );
}
