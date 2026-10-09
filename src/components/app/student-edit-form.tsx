"use client";

import { ActionForm, Submit } from "@/components/ui/form";
import { Field, Input, Select, Textarea } from "@/components/ui/fields";
import { updateStudent } from "@/app/app/actions";
import { displayPhone } from "@/lib/phone";
import type { Student } from "@/lib/types";

export function StudentEditForm({ student }: { student: Student }) {
  return (
    <ActionForm action={updateStudent} className="grid gap-4 sm:grid-cols-2">
      <input type="hidden" name="student_id" value={student.id} />
      <Field label="Nom complet" className="sm:col-span-2">
        <Input name="full_name" required defaultValue={student.full_name} />
      </Field>
      <Field label="Téléphone WhatsApp">
        <Input name="phone" type="tel" required defaultValue={displayPhone(student.phone)} />
      </Field>
      <Field label="Type de permis">
        <Select name="license" defaultValue={student.license}>
          <option value="B">B · Voiture</option>
          <option value="A">A · Moto</option>
          <option value="C">C · Poids lourd</option>
          <option value="D">D · Transport de personnes</option>
          <option value="E">E · Remorque</option>
        </Select>
      </Field>
      <Field label="Leçons de conduite prévues">
        <Input name="hours_planned" type="number" min={0} defaultValue={student.hours_planned} />
      </Field>
      <Field label="Notes" className="sm:col-span-2">
        <Textarea name="notes" defaultValue={student.notes ?? ""} placeholder="Disponibilités, remarques…" />
      </Field>
      <div className="sm:col-span-2">
        <Submit className="w-full sm:w-auto">Enregistrer les modifications</Submit>
      </div>
    </ActionForm>
  );
}
