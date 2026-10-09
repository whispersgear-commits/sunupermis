"use client";

import { ActionForm, Submit } from "@/components/ui/form";
import { Field, Input, Select } from "@/components/ui/fields";
import { createLesson } from "@/app/app/actions";
import { todayIso } from "@/lib/format";

interface Option {
  id: string;
  label: string;
}

/** Formulaire « Planifier une leçon » (affiché dans un panneau). */
export function LessonForm({
  students,
  instructors,
  vehicles,
  defaultStudent,
  defaultDate,
}: {
  students: Option[];
  instructors: Option[];
  vehicles: Option[];
  defaultStudent?: string;
  defaultDate?: string;
}) {
  if (students.length === 0) {
    return <p className="rounded-2xl border border-line bg-bg p-5 text-sm text-muted">Inscrivez d'abord un élève pour planifier une leçon.</p>;
  }
  return (
    <ActionForm action={createLesson} className="grid grid-cols-2 gap-4">
      <Field label="Élève" className="col-span-2">
        <Select name="student_id" defaultValue={defaultStudent && students.some((s) => s.id === defaultStudent) ? defaultStudent : ""} required>
          <option value="" disabled>
            Choisir un élève…
          </option>
          {students.map((s) => (
            <option key={s.id} value={s.id}>
              {s.label}
            </option>
          ))}
        </Select>
      </Field>
      <Field label="Date">
        <Input name="date" type="date" required defaultValue={defaultDate ?? todayIso()} />
      </Field>
      <Field label="Heure">
        <Input name="start" type="time" required defaultValue="08:00" step={900} />
      </Field>
      <Field label="Type">
        <Select name="kind" defaultValue="driving">
          <option value="driving">Conduite</option>
          <option value="code">Code</option>
        </Select>
      </Field>
      <Field label="Durée">
        <Select name="duration" defaultValue="60">
          <option value="30">30 min</option>
          <option value="60">1 h</option>
          <option value="90">1 h 30</option>
          <option value="120">2 h</option>
        </Select>
      </Field>
      <Field label="Moniteur">
        <Select name="instructor_id" defaultValue={instructors[0]?.id ?? ""}>
          <option value="">Aucun</option>
          {instructors.map((i) => (
            <option key={i.id} value={i.id}>
              {i.label}
            </option>
          ))}
        </Select>
      </Field>
      <Field label="Voiture">
        <Select name="vehicle_id" defaultValue={vehicles[0]?.id ?? ""}>
          <option value="">Aucune</option>
          {vehicles.map((v) => (
            <option key={v.id} value={v.id}>
              {v.label}
            </option>
          ))}
        </Select>
      </Field>
      <p className="col-span-2 -mt-1 text-xs text-muted">Un moniteur ou une voiture déjà pris à cette heure est refusé automatiquement.</p>
      <Submit className="col-span-2">Planifier la leçon</Submit>
    </ActionForm>
  );
}
