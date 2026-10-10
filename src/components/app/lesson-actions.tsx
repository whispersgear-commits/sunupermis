"use client";

import { useOptimistic, useTransition } from "react";
import { Ban, Check, X } from "lucide-react";
import { toast } from "sonner";
import { markLesson } from "@/app/app/actions";
import { LESSON_STATUS_LABEL, type Lesson } from "@/lib/types";
import { Badge } from "./ui";

const TONE = { planned: "info", done: "good", missed: "bad", cancelled: "neutral" } as const;

/**
 * « Faite », « Absent », « Annuler ». Le nouveau statut s'affiche à
 * l'instant du clic ; le serveur confirme ensuite. En cas d'échec, l'ancien
 * statut revient et un message l'explique.
 */
export function LessonActions({ lessonId, status, canCancel, overdue }: { lessonId: string; status: Lesson["status"]; canCancel: boolean; overdue: boolean }) {
  const [shown, setShown] = useOptimistic(status);
  const [, startTransition] = useTransition();

  const mark = (next: Lesson["status"]) =>
    startTransition(async () => {
      setShown(next);
      const fd = new FormData();
      fd.set("lesson_id", lessonId);
      fd.set("status", next);
      const res = await markLesson(fd);
      if (res?.error) toast.error(res.error);
    });

  if (shown !== "planned") {
    return (
      <div className="shrink-0">
        <Badge tone={TONE[shown]}>{LESSON_STATUS_LABEL[shown]}</Badge>
      </div>
    );
  }
  return (
    <div className="flex shrink-0 items-center gap-1.5">
      {overdue && <span className="mr-1 hidden text-xs font-bold text-amber-600 sm:inline">À pointer</span>}
      <button
        type="button"
        onClick={() => mark("done")}
        className="inline-flex h-9 flex-1 items-center justify-center gap-1 rounded-xl bg-brand-600 px-3 text-xs font-bold text-white transition hover:bg-brand-700 active:scale-95 sm:flex-none"
      >
        <Check className="h-3.5 w-3.5" /> Faite
      </button>
      <button
        type="button"
        onClick={() => mark("missed")}
        className="inline-flex h-9 flex-1 items-center justify-center gap-1 rounded-xl border border-line bg-surface px-3 text-xs font-bold text-muted transition hover:border-red-300 hover:text-red-600 active:scale-95 sm:flex-none"
      >
        <X className="h-3.5 w-3.5" /> Absent
      </button>
      {canCancel && (
        <button
          type="button"
          onClick={() => mark("cancelled")}
          title="Annuler la leçon"
          aria-label="Annuler la leçon"
          className="inline-flex h-9 w-9 items-center justify-center rounded-xl border border-line bg-surface text-muted transition hover:border-red-300 hover:text-red-600 active:scale-95"
        >
          <Ban className="h-3.5 w-3.5" />
        </button>
      )}
    </div>
  );
}
