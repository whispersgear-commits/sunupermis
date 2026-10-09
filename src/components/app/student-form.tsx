"use client";

import { useMemo, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { ActionForm, Submit, type FormState } from "@/components/ui/form";
import { Field, Input, Select, Textarea } from "@/components/ui/fields";
import { dayMonth, groupDigits, money, todayIso } from "@/lib/format";

/**
 * Inscription d'un élève. L'échéancier se dessine en direct pendant qu'on
 * tape le prix et le nombre de tranches : la secrétaire voit ce que l'élève
 * va payer, et quand, avant d'enregistrer.
 */
export function StudentForm({ action }: { action: (s: FormState, fd: FormData) => Promise<FormState> }) {
  const [price, setPrice] = useState("150 000");
  const [parts, setParts] = useState("3");
  const [first, setFirst] = useState(todayIso());

  const schedule = useMemo(() => {
    const total = Number(price.replace(/\D/g, "")) || 0;
    const n = Math.min(12, Math.max(1, Number(parts) || 1));
    if (!total) return [];
    const base = Math.floor(total / n);
    const rest = total - base * n;
    return Array.from({ length: n }, (_, i) => {
      const d = new Date(`${first}T00:00:00Z`);
      d.setUTCMonth(d.getUTCMonth() + i);
      return { date: d.toISOString().slice(0, 10), amount: base + (i === 0 ? rest : 0) };
    });
  }, [price, parts, first]);

  return (
    <ActionForm action={action} className="grid gap-6 lg:grid-cols-5">
      <div className="space-y-6 lg:col-span-3">
        <section className="rounded-3xl border border-line bg-surface p-6">
          <h2 className="mb-4 font-bold">L'élève</h2>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Nom complet" className="sm:col-span-2">
              <Input name="full_name" required placeholder="Awa Fall" autoFocus />
            </Field>
            <Field label="Téléphone WhatsApp">
              <Input name="phone" type="tel" required placeholder="77 123 45 67" />
            </Field>
            <Field label="Type de permis">
              <Select name="license" defaultValue="B">
                <option value="B">B · Voiture</option>
                <option value="A">A · Moto</option>
                <option value="C">C · Poids lourd</option>
                <option value="D">D · Transport de personnes</option>
                <option value="E">E · Remorque</option>
              </Select>
            </Field>
            <Field label="Leçons de conduite prévues">
              <Input name="hours_planned" type="number" min={0} defaultValue={20} />
            </Field>
            <Field label="Notes" className="sm:col-span-2">
              <Textarea name="notes" placeholder="Disponibilités, remarques…" />
            </Field>
          </div>
        </section>

        <section className="rounded-3xl border border-line bg-surface p-6">
          <h2 className="mb-4 font-bold">Forfait et paiement</h2>
          <div className="grid gap-4 sm:grid-cols-3">
            <Field label="Prix du forfait (FCFA)">
              <Input name="package_price" inputMode="numeric" value={price} onChange={(e) => {
                  const digits = e.target.value.replace(/\D/g, "");
                  setPrice(digits ? groupDigits(Number(digits)) : "");
                }} />
            </Field>
            <Field label="Nombre de tranches">
              <Select name="installments" value={parts} onChange={(e) => setParts(e.target.value)}>
                {[1, 2, 3, 4, 5, 6].map((n) => (
                  <option key={n} value={n}>
                    {n === 1 ? "Paiement unique" : `${n} fois`}
                  </option>
                ))}
              </Select>
            </Field>
            <Field label="Première échéance">
              <Input name="first_due" type="date" value={first} onChange={(e) => setFirst(e.target.value)} />
            </Field>
            <Field label="Payé aujourd'hui (FCFA)" hint="Facultatif">
              <Input name="initial_payment" inputMode="numeric" placeholder="0" />
            </Field>
            <Field label="Moyen">
              <Select name="initial_method" defaultValue="wave">
                <option value="wave">Wave</option>
                <option value="orange_money">Orange Money</option>
                <option value="cash">Espèces</option>
                <option value="other">Autre</option>
              </Select>
            </Field>
          </div>
        </section>
      </div>

      <aside className="lg:col-span-2">
        <div className="sticky top-24 rounded-3xl bg-asphalt p-6 text-white">
          <p className="text-sm font-semibold text-brand-200">Échéancier</p>
          <p className="mt-1 text-3xl font-extrabold">{money(Number(price.replace(/\D/g, "")) || 0)}</p>
          <ul className="mt-5 space-y-2">
            <AnimatePresence initial={false}>
              {schedule.map((row, i) => (
                <motion.li
                  key={`${i}-${row.date}`}
                  layout
                  initial={{ opacity: 0, x: 16 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -16 }}
                  transition={{ duration: 0.25, delay: i * 0.03 }}
                  className="flex items-center justify-between rounded-xl bg-white/5 px-4 py-2.5 text-sm"
                >
                  <span className="flex items-center gap-3">
                    <span className="grid h-6 w-6 place-items-center rounded-full bg-lane text-xs font-bold text-asphalt">{i + 1}</span>
                    {dayMonth(row.date)}
                  </span>
                  <span className="font-bold">{money(row.amount)}</span>
                </motion.li>
              ))}
            </AnimatePresence>
          </ul>
          <Submit className="mt-6 w-full bg-brand-500 hover:bg-brand-400">Inscrire l'élève</Submit>
        </div>
      </aside>
    </ActionForm>
  );
}
