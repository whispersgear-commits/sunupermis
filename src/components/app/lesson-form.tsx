"use client";

import { useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { Plus, X } from "lucide-react";
import { ActionForm, Submit } from "@/components/ui/form";
import { Field, Input, Select } from "@/components/ui/fields";
import { createLesson } from "@/app/app/actions";
import { todayIso } from "@/lib/format";

interface Option {
  id: string;
  label: string;
}

/** Nouvelle leçon, dans un panneau qui se déplie. */
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
  const [open, setOpen] = useState(Boolean(defaultStudent));

  return (
    <div className="mb-6">
      <motion.button
        whileTap={{ scale: 0.97 }}
        onClick={() => setOpen((o) => !o)}
        className="inline-flex h-11 items-center gap-2 rounded-xl bg-brand-600 px-5 text-sm font-semibold text-white shadow-lg shadow-brand-600/20 hover:bg-brand-700"
      >
        <motion.span animate={{ rotate: open ? 45 : 0 }}>{open ? <X className="h-4 w-4" /> : <Plus className="h-4 w-4" />}</motion.span>
        {open ? "Fermer" : "Planifier une leçon"}
      </motion.button>

      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
            className="overflow-hidden"
          >
            {students.length === 0 ? (
              <p className="mt-4 rounded-2xl border border-line bg-surface p-5 text-sm text-muted">Inscrivez d'abord un élève.</p>
            ) : (
              <ActionForm action={createLesson} className="mt-4 grid gap-4 rounded-3xl border border-line bg-surface p-5 sm:grid-cols-2 lg:grid-cols-4">
                <Field label="Élève" className="sm:col-span-2">
                  <Select name="student_id" defaultValue={defaultStudent ?? ""} required>
                    <option value="" disabled>
                      Choisir…
                    </option>
                    {students.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.label}
                      </option>
                    ))}
                  </Select>
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
                <Field label="Date">
                  <Input name="date" type="date" required defaultValue={defaultDate ?? todayIso()} />
                </Field>
                <Field label="Heure">
                  <Input name="start" type="time" required defaultValue="08:00" step={900} />
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
                <div className="sm:col-span-2 lg:col-span-4">
                  <Submit>Planifier</Submit>
                </div>
              </ActionForm>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
