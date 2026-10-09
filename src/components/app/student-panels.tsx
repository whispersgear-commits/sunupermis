"use client";

import { motion } from "motion/react";
import { ActionForm, Submit } from "@/components/ui/form";
import { Input, Select } from "@/components/ui/fields";
import { addExam, addPayment } from "@/app/app/actions";
import { todayIso } from "@/lib/format";

/** Anneau de progression des leçons, qui se remplit à l'ouverture. */
export function ProgressRing({ value, total }: { value: number; total: number }) {
  const r = 34;
  const c = 2 * Math.PI * r;
  const ratio = total ? Math.min(1, value / total) : 0;
  return (
    <svg width="84" height="84" viewBox="0 0 84 84" className="-rotate-90" aria-hidden>
      <circle cx="42" cy="42" r={r} fill="none" stroke="var(--line)" strokeWidth="8" />
      <motion.circle
        cx="42"
        cy="42"
        r={r}
        fill="none"
        stroke="var(--color-brand-500)"
        strokeWidth="8"
        strokeLinecap="round"
        strokeDasharray={c}
        initial={{ strokeDashoffset: c }}
        animate={{ strokeDashoffset: c * (1 - ratio) }}
        transition={{ duration: 1.2, ease: [0.22, 1, 0.36, 1] }}
      />
    </svg>
  );
}

export function PaymentForm({ studentId, suggested }: { studentId: string; suggested: number }) {
  return (
    <ActionForm action={addPayment} resetOnSuccess className="grid grid-cols-2 gap-2 sm:grid-cols-[1fr_1fr_auto]">
      <input type="hidden" name="student_id" value={studentId} />
      <Input name="amount" inputMode="numeric" defaultValue={suggested > 0 ? suggested : ""} placeholder="Montant" required aria-label="Montant" />
      <Select name="method" defaultValue="wave" aria-label="Moyen de paiement">
        <option value="wave">Wave</option>
        <option value="orange_money">Orange Money</option>
        <option value="cash">Espèces</option>
        <option value="other">Autre</option>
      </Select>
      <Submit className="col-span-2 sm:col-span-1">Encaisser</Submit>
      <Input name="reference" placeholder="Référence de la transaction (facultatif)" className="col-span-2 sm:col-span-3" aria-label="Référence" />
    </ActionForm>
  );
}

export function ExamForm({ studentId }: { studentId: string }) {
  return (
    <ActionForm action={addExam} resetOnSuccess className="grid grid-cols-2 gap-2 sm:grid-cols-[1fr_1fr_auto]">
      <input type="hidden" name="student_id" value={studentId} />
      <Select name="kind" defaultValue="code" aria-label="Type d'examen">
        <option value="code">Code</option>
        <option value="driving">Conduite</option>
      </Select>
      <Input name="exam_date" type="date" defaultValue={todayIso()} required aria-label="Date" />
      <Submit variant="secondary" className="col-span-2 sm:col-span-1">
        Ajouter
      </Submit>
    </ActionForm>
  );
}
