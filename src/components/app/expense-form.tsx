"use client";

import { useState } from "react";
import { ActionForm, Submit } from "@/components/ui/form";
import { Field, Input, Select } from "@/components/ui/fields";
import { cn } from "@/lib/utils";
import { groupDigits, todayIso } from "@/lib/format";
import { addExpense } from "@/app/app/actions";
import { EXPENSE_CATEGORIES, type Expense } from "@/lib/types";

/** Saisie d'une dépense : catégorie en un geste, montant, date. */
export function ExpenseForm({ vehicles, agencies }: { vehicles: { id: string; label: string }[]; agencies: string[] }) {
  const [category, setCategory] = useState<Expense["category"]>("fuel");
  const [amount, setAmount] = useState("");
  const withVehicle = category === "fuel" || category === "maintenance";
  return (
    <ActionForm action={addExpense} resetOnSuccess onSuccess={() => setAmount("")} className="space-y-4">
      <input type="hidden" name="category" value={category} />
      <div>
        <span className="mb-1.5 block text-sm font-semibold">Catégorie</span>
        <div className="grid grid-cols-2 gap-2">
          {EXPENSE_CATEGORIES.map((c) => (
            <button
              key={c.key}
              type="button"
              onClick={() => setCategory(c.key)}
              aria-pressed={category === c.key}
              className={cn(
                "flex items-center gap-2 rounded-xl border px-3 py-2.5 text-left text-sm font-semibold transition",
                category === c.key ? "border-brand-600 bg-brand-50 text-brand-800 dark:bg-brand-900/40 dark:text-brand-100" : "border-line text-muted hover:border-brand-400",
              )}
            >
              <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ background: c.color }} />
              {c.label}
            </button>
          ))}
        </div>
      </div>
      <Field label="Montant (FCFA)">
        <Input
          name="amount"
          inputMode="numeric"
          required
          value={amount}
          onChange={(e) => {
            const d = e.target.value.replace(/\D/g, "");
            setAmount(d ? groupDigits(Number(d)) : "");
          }}
          placeholder="0"
          className="h-14 text-2xl font-extrabold tracking-tight"
        />
      </Field>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Date">
          <Input name="spent_on" type="date" defaultValue={todayIso()} max={todayIso()} required />
        </Field>
        {withVehicle && vehicles.length > 0 && (
          <Field label="Voiture" hint="Facultatif">
            <Select name="vehicle_id" defaultValue="">
              <option value="">—</option>
              {vehicles.map((v) => (
                <option key={v.id} value={v.id}>
                  {v.label}
                </option>
              ))}
            </Select>
          </Field>
        )}
        {agencies.length > 0 && (
          <Field label="Agence">
            <Select name="agency" defaultValue={agencies[0]}>
              {agencies.map((a) => (
                <option key={a} value={a}>
                  {a}
                </option>
              ))}
            </Select>
          </Field>
        )}
      </div>
      <Field label="Détail" hint="Facultatif : « Plein Clio blanche », « Salaire Modou, octobre »…">
        <Input name="label" maxLength={120} />
      </Field>
      <Submit className="w-full">Enregistrer la dépense{amount ? ` · ${amount} FCFA` : ""}</Submit>
    </ActionForm>
  );
}
