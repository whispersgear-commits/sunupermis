"use client";

import { useState } from "react";
import { motion } from "motion/react";
import { ActionForm, Submit } from "@/components/ui/form";
import { Field, Input, Select } from "@/components/ui/fields";
import { cn } from "@/lib/utils";
import { addExam, addPayment, addSupplement } from "@/app/app/actions";
import { groupDigits, todayIso } from "@/lib/format";

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

const METHODS = [
  { value: "wave", label: "Wave" },
  { value: "orange_money", label: "Orange Money" },
  { value: "cash", label: "Espèces" },
  { value: "other", label: "Autre" },
];

/**
 * Encaissement. Sur la fiche d'un élève, `studentId` est fixé ; depuis la page
 * Paiements, `students` permet de choisir l'élève.
 */
export function PaymentForm({
  studentId,
  suggested = 0,
  students,
}: {
  studentId?: string;
  suggested?: number;
  students?: { id: string; label: string; due: number }[];
}) {
  const [method, setMethod] = useState("wave");
  const [amount, setAmount] = useState(suggested > 0 ? groupDigits(suggested) : "");
  return (
    <ActionForm action={addPayment} resetOnSuccess onSuccess={() => setAmount("")} className="space-y-4">
      {studentId ? (
        <input type="hidden" name="student_id" value={studentId} />
      ) : (
        <Field label="Élève">
          <Select
            name="student_id"
            required
            defaultValue=""
            onChange={(e) => {
              const due = students?.find((s) => s.id === e.target.value)?.due ?? 0;
              setAmount(due > 0 ? groupDigits(due) : "");
            }}
          >
            <option value="" disabled>
              Choisir un élève…
            </option>
            {students?.map((s) => (
              <option key={s.id} value={s.id}>
                {s.label}
              </option>
            ))}
          </Select>
        </Field>
      )}
      <Field label="Montant (FCFA)">
        <Input
          name="amount"
          inputMode="numeric"
          value={amount}
          onChange={(e) => {
            const digits = e.target.value.replace(/\D/g, "");
            setAmount(digits ? groupDigits(Number(digits)) : "");
          }}
          placeholder="0"
          required
          className="h-14 text-2xl font-extrabold tracking-tight"
        />
      </Field>
      <div>
        <span className="mb-1.5 block text-sm font-semibold">Moyen de paiement</span>
        <input type="hidden" name="method" value={method} />
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
          {METHODS.map((m) => (
            <button
              key={m.value}
              type="button"
              onClick={() => setMethod(m.value)}
              aria-pressed={method === m.value}
              className={cn(
                "h-10 rounded-xl border text-sm font-semibold transition",
                method === m.value ? "border-brand-600 bg-brand-50 text-brand-700 dark:bg-brand-900/40 dark:text-brand-200" : "border-line text-muted hover:border-brand-400",
              )}
            >
              {m.label}
            </button>
          ))}
        </div>
      </div>
      {method !== "cash" && (
        <Field label="Référence de la transaction" hint="Facultatif : le numéro reçu par SMS">
          <Input name="reference" placeholder="Ex. TX123456" />
        </Field>
      )}
      <Submit className="w-full">Encaisser{amount ? ` ${amount} FCFA` : ""}</Submit>
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

/** Supplément au forfait : heures en plus, nouvelle présentation à l'examen… */
const SUPPLEMENT_IDEAS = ["Heures de conduite supplémentaires", "Nouvelle présentation au code", "Nouvelle présentation à la conduite", "Frais de dossier"];

export function SupplementForm({ studentId }: { studentId: string }) {
  const [amount, setAmount] = useState("");
  const [label, setLabel] = useState("");
  return (
    <ActionForm
      action={addSupplement}
      resetOnSuccess
      onSuccess={() => {
        setAmount("");
        setLabel("");
      }}
      className="space-y-4"
    >
      <input type="hidden" name="student_id" value={studentId} />
      <Field label="Motif">
        <Input name="label" required minLength={2} maxLength={80} value={label} onChange={(e) => setLabel(e.target.value)} placeholder="Ex. 5 heures de conduite en plus" />
      </Field>
      <div className="flex flex-wrap gap-2">
        {SUPPLEMENT_IDEAS.map((idea) => (
          <button
            key={idea}
            type="button"
            onClick={() => setLabel(idea)}
            className={cn("rounded-full border px-3 py-1 text-xs font-semibold transition", label === idea ? "border-brand-600 bg-brand-50 text-brand-700 dark:bg-brand-900/40 dark:text-brand-200" : "border-line text-muted hover:border-brand-400")}
          >
            {idea}
          </button>
        ))}
      </div>
      <Field label="Montant (FCFA)" hint="S'ajoute au forfait, avec une échéance due aujourd'hui.">
        <Input
          name="amount"
          inputMode="numeric"
          required
          value={amount}
          onChange={(e) => {
            const digits = e.target.value.replace(/\D/g, "");
            setAmount(digits ? groupDigits(Number(digits)) : "");
          }}
          placeholder="0"
        />
      </Field>
      <Submit variant="secondary" className="w-full">
        Ajouter le supplément{amount ? ` · ${amount} FCFA` : ""}
      </Submit>
    </ActionForm>
  );
}
