import type { Metadata } from "next";
import { Plus, Receipt, Scale, Trash2, TrendingDown, Wallet } from "lucide-react";
import { Card, CardTitle, Empty, PageHeader, Stat } from "@/components/app/ui";
import { ParamSelect } from "@/components/app/filters";
import { ExpenseForm } from "@/components/app/expense-form";
import { Sheet } from "@/components/ui/sheet";
import { PendingButton } from "@/components/ui/pending-button";
import { createClient } from "@/lib/supabase/server";
import { requireStaff } from "@/lib/session";
import { agencyFilter } from "@/lib/agencies";
import { PERIODS, periodRange } from "@/lib/periods";
import { dayMonth, longDay, money } from "@/lib/format";
import { EXPENSE_CATEGORIES, EXPENSE_LABEL, type Expense } from "@/lib/types";
import { deleteExpense } from "../actions";

export const metadata: Metadata = { title: "Dépenses" };

type Params = { periode?: string; agence?: string; ajouter?: string };

/**
 * Dépenses et résultat : ce qui est entré (encaissements), ce qui est sorti
 * (carburant, salaires…), et ce qui reste.
 */
export default async function DepensesPage({ searchParams }: { searchParams: Promise<Params> }) {
  const params = await searchParams;
  const ctx = await requireStaff();
  const isOwner = ctx.role === "owner";
  const supabase = await createClient();
  const range = periodRange(params.periode);
  const agency = agencyFilter(ctx.school, params.agence);

  let expensesQuery = supabase.from("expenses").select("*").order("spent_on", { ascending: false }).order("created_at", { ascending: false }).limit(1000);
  let paymentsQuery = supabase.from("payments").select("amount, student:students(agency)").is("cancelled_at", null).limit(5000);
  if (range.from) {
    expensesQuery = expensesQuery.gte("spent_on", range.from);
    paymentsQuery = paymentsQuery.gte("paid_at", `${range.from}T00:00:00Z`);
  }
  if (range.to) {
    expensesQuery = expensesQuery.lt("spent_on", range.to);
    paymentsQuery = paymentsQuery.lt("paid_at", `${range.to}T00:00:00Z`);
  }
  const [{ data: expenses }, { data: payments }, { data: vehicles }] = await Promise.all([
    expensesQuery,
    paymentsQuery,
    supabase.from("vehicles").select("id, label").eq("active", true).order("label"),
  ]);

  const list = ((expenses ?? []) as Expense[]).filter((e) => agency.keep(e.agency));
  const income = ((payments ?? []) as unknown as { amount: number; student: { agency: string | null } | null }[])
    .filter((p) => agency.keep(p.student?.agency))
    .reduce((sum, p) => sum + p.amount, 0);
  const spent = list.reduce((sum, e) => sum + e.amount, 0);
  const result = income - spent;
  const byCategory = EXPENSE_CATEGORIES.map((c) => ({ ...c, total: list.filter((e) => e.category === c.key).reduce((s, e) => s + e.amount, 0) }))
    .filter((c) => c.total > 0)
    .sort((a, b) => b.total - a.total);
  const vehicleName = new Map((vehicles ?? []).map((v) => [v.id, v.label]));

  // Regroupement par jour, comme les encaissements.
  const days: { day: string; items: Expense[]; total: number }[] = [];
  for (const e of list) {
    const last = days[days.length - 1];
    if (last?.day === e.spent_on) {
      last.items.push(e);
      last.total += e.amount;
    } else days.push({ day: e.spent_on, items: [e], total: e.amount });
  }

  return (
    <>
      <PageHeader
        title="Dépenses"
        description="Ce qui sort de la caisse, et le résultat de l'auto-école."
        actions={
          <Sheet
            title="Ajouter une dépense"
            defaultOpen={Boolean(params.ajouter)}
            triggerClassName="inline-flex h-10 items-center gap-2 rounded-xl bg-brand-600 px-4 text-sm font-semibold text-white shadow-lg shadow-brand-600/20 transition hover:bg-brand-700"
            trigger={
              <>
                <Plus className="h-4 w-4" /> Dépense
              </>
            }
          >
            <ExpenseForm vehicles={vehicles ?? []} agencies={agency.enabled ? agency.options.slice(1).map((o) => o.value) : []} />
          </Sheet>
        }
      />

      <div className="mb-4 flex flex-col gap-2 sm:flex-row">
        <ParamSelect param="periode" label="Période" options={PERIODS.map((p) => ({ value: p.key, label: p.label }))} className="w-full sm:w-auto" />
        {agency.enabled && <ParamSelect param="agence" label="Agence" options={agency.options} className="w-full sm:w-auto" />}
      </div>

      <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-3">
        <Stat label={`Encaissé · ${range.label.toLowerCase()}`} value={income} format="money" icon={<Wallet className="h-4 w-4" />} tone="brand" />
        <Stat label="Dépenses" value={spent} format="money" icon={<TrendingDown className="h-4 w-4" />} tone="bad" hint={`${list.length} dépense${list.length > 1 ? "s" : ""}`} delay={0.05} />
        <div className="col-span-2 lg:col-span-1">
          <Stat
            label="Résultat"
            value={result}
            format="money"
            icon={<Scale className="h-4 w-4" />}
            tone={result >= 0 ? "good" : "bad"}
            hint={result >= 0 ? "Encaissé moins dépenses" : "Les dépenses dépassent les encaissements"}
            delay={0.1}
          />
        </div>
      </div>

      <div className="mt-6 grid gap-5 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          {days.length ? (
            <ul>
              {days.map((d) => (
                <li key={d.day}>
                  <div className="flex items-center justify-between bg-bg px-5 py-2 text-xs font-bold uppercase tracking-wide text-muted">
                    <span className="first-letter:uppercase">{longDay(`${d.day}T00:00:00Z`)}</span>
                    <span className="whitespace-nowrap">{money(d.total)}</span>
                  </div>
                  <ul className="divide-y divide-line">
                    {d.items.map((e) => {
                      const cat = EXPENSE_CATEGORIES.find((c) => c.key === e.category)!;
                      return (
                        <li key={e.id} className="flex items-center gap-3 px-5 py-3">
                          <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl" style={{ background: `${cat.color}1f`, color: cat.color }}>
                            <Receipt className="h-4 w-4" />
                          </span>
                          <span className="min-w-0 flex-1">
                            <span className="block truncate font-semibold">{e.label || EXPENSE_LABEL[e.category]}</span>
                            <span className="block truncate text-xs text-muted">
                              {EXPENSE_LABEL[e.category]}
                              {e.vehicle_id && vehicleName.get(e.vehicle_id) ? ` · ${vehicleName.get(e.vehicle_id)}` : ""}
                              {agency.enabled && e.agency && !agency.selected ? ` · ${e.agency}` : ""}
                            </span>
                          </span>
                          <span className="whitespace-nowrap font-bold text-red-600 dark:text-red-400">− {money(e.amount)}</span>
                          {isOwner && (
                            <form action={deleteExpense}>
                              <input type="hidden" name="expense_id" value={e.id} />
                              <PendingButton
                                confirm={`Supprimer cette dépense de ${money(e.amount)} ?`}
                                aria-label="Supprimer la dépense"
                                className="grid h-8 w-8 place-items-center rounded-lg text-muted transition hover:bg-red-50 hover:text-red-600"
                              >
                                <Trash2 className="h-4 w-4" />
                              </PendingButton>
                            </form>
                          )}
                        </li>
                      );
                    })}
                  </ul>
                </li>
              ))}
            </ul>
          ) : (
            <Empty title="Aucune dépense sur cette période">Ajoutez le carburant, les salaires ou les réparations pour voir votre vrai résultat.</Empty>
          )}
        </Card>

        <Card className="h-fit" delay={0.05}>
          <CardTitle title={`Répartition · ${range.label.toLowerCase()}`} />
          {byCategory.length ? (
            <div className="space-y-4 p-5">
              <div className="flex h-3 overflow-hidden rounded-full bg-bg">
                {byCategory.map((c) => (
                  <span key={c.key} style={{ width: `${(c.total / spent) * 100}%`, background: c.color }} />
                ))}
              </div>
              <ul className="space-y-2 text-sm">
                {byCategory.map((c) => (
                  <li key={c.key} className="flex items-center justify-between gap-3">
                    <span className="flex items-center gap-2">
                      <span className="h-2.5 w-2.5 rounded-full" style={{ background: c.color }} />
                      {c.label}
                    </span>
                    <span className="whitespace-nowrap font-semibold">
                      {money(c.total)} <span className="text-xs text-muted">· {Math.round((c.total / spent) * 100)} %</span>
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          ) : (
            <p className="px-5 py-6 text-sm text-muted">Rien à répartir pour l'instant.</p>
          )}
          <p className="border-t border-line px-5 py-3 text-xs text-muted">
            Les dépenses du {dayMonth(range.from ?? "2026-01-01")} à aujourd'hui sont comparées aux encaissements de la même période.
          </p>
        </Card>
      </div>
    </>
  );
}
