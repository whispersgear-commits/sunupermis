import type { Metadata } from "next";
import Link from "next/link";
import { AlertTriangle, CalendarClock, Download, MessageCircle, Plus, Send, Wallet } from "lucide-react";
import { Avatar, Card, Empty, PageHeader, Stat } from "@/components/app/ui";
import { ParamSelect, SearchBox, Tabs } from "@/components/app/filters";
import { PaymentForm } from "@/components/app/student-panels";
import { Sheet } from "@/components/ui/sheet";
import { ActionForm, Submit } from "@/components/ui/form";
import { createClient } from "@/lib/supabase/server";
import { requireStaff } from "@/lib/session";
import { addDaysIso, dayMonth, dayShort, longDay, money, todayIso, weekday } from "@/lib/format";
import { displayPhone } from "@/lib/phone";
import { paymentReminder, waLink } from "@/lib/whatsapp";
import { whatsappConfigured } from "@/lib/whatsapp-api";
import { PERIODS, periodRange } from "@/lib/periods";
import { fold, withParams } from "@/lib/url";
import { cn } from "@/lib/utils";
import { METHOD_LABEL, type Balance, type Installment, type Payment } from "@/lib/types";
import { sendRemindersNow } from "../actions";

export const metadata: Metadata = { title: "Paiements" };

type Params = { onglet?: string; periode?: string; methode?: string; q?: string; encaisser?: string };
const METHOD_COLOR: Record<Payment["method"], string> = { wave: "bg-sky-500", orange_money: "bg-orange-500", cash: "bg-brand-500", other: "bg-slate-400" };

export default async function PaiementsPage({ searchParams }: { searchParams: Promise<Params> }) {
  const params = await searchParams;
  const ctx = await requireStaff();
  const supabase = await createClient();
  const range = periodRange(params.periode);
  const today = todayIso();

  let paymentsQuery = supabase.from("payments").select("*, student:students(id, full_name, phone)").order("paid_at", { ascending: false }).limit(1000);
  if (range.from) paymentsQuery = paymentsQuery.gte("paid_at", `${range.from}T00:00:00Z`);
  if (range.to) paymentsQuery = paymentsQuery.lt("paid_at", `${range.to}T00:00:00Z`);

  const [{ data: payments }, { data: balances }, { data: students }, { data: installments }] = await Promise.all([
    paymentsQuery,
    supabase.from("student_balances").select("*"),
    supabase.from("students").select("id, full_name, phone, status").neq("status", "dropped").order("full_name"),
    supabase.from("installments").select("*").order("due_date"),
  ]);

  const studentMap = new Map((students ?? []).map((s) => [s.id, s]));
  const balanceRows = (balances ?? []) as Balance[];
  const balanceOf = new Map(balanceRows.map((b) => [b.student_id, b]));
  const term = fold(params.q?.trim() ?? "");
  const matches = (name: string | undefined) => !term || fold(name ?? "").includes(term);

  // Retards
  const overdue = balanceRows
    .map((b) => ({ ...b, late: Math.min(b.balance, b.due_to_date - b.paid), s: studentMap.get(b.student_id) }))
    .filter((b) => b.late > 0 && b.s)
    .sort((a, b) => b.late - a.late);
  const lateTotal = overdue.reduce((sum, b) => sum + b.late, 0);

  // Échéances des 30 prochains jours encore non couvertes par les paiements.
  const horizon = addDaysIso(today, 30);
  const byStudent = new Map<string, Installment[]>();
  for (const i of (installments ?? []) as Installment[]) byStudent.set(i.student_id, [...(byStudent.get(i.student_id) ?? []), i]);
  const upcoming: { id: string; student_id: string; due_date: string; amount: number }[] = [];
  for (const [sid, list] of byStudent) {
    if (!studentMap.has(sid)) continue;
    let left = balanceOf.get(sid)?.paid ?? 0;
    for (const i of list) {
      const covered = Math.min(i.amount, Math.max(0, left));
      left -= covered;
      if (covered < i.amount && i.due_date >= today && i.due_date <= horizon) upcoming.push({ id: i.id, student_id: sid, due_date: i.due_date, amount: i.amount - covered });
    }
  }
  upcoming.sort((a, b) => a.due_date.localeCompare(b.due_date));
  const upcomingTotal = upcoming.reduce((sum, i) => sum + i.amount, 0);

  // Encaissements de la période, filtrés
  const allPayments = (payments ?? []) as (Payment & { student: { id: string; full_name: string; phone: string } | null })[];
  const periodTotal = allPayments.reduce((sum, p) => sum + p.amount, 0);
  const byMethod = (Object.keys(METHOD_LABEL) as Payment["method"][])
    .map((m) => ({ m, total: allPayments.filter((p) => p.method === m).reduce((sum, p) => sum + p.amount, 0) }))
    .filter((x) => x.total > 0);
  const list = allPayments.filter((p) => (!params.methode || p.method === params.methode) && matches(p.student?.full_name));
  const days: { day: string; items: typeof list; total: number }[] = [];
  for (const p of list) {
    const d = p.paid_at.slice(0, 10);
    const last = days[days.length - 1];
    if (last?.day === d) {
      last.items.push(p);
      last.total += p.amount;
    } else days.push({ day: d, items: [p], total: p.amount });
  }

  const tab = params.onglet === "retards" || params.onglet === "a-venir" ? params.onglet : "encaissements";
  const current = { ...params, encaisser: undefined };
  const href = (changes: Record<string, string | null>) => withParams("/app/paiements", current, changes);
  const overdueShown = overdue.filter((b) => matches(b.s?.full_name));
  const upcomingShown = upcoming.filter((i) => matches(studentMap.get(i.student_id)?.full_name));

  const studentOptions = (students ?? []).map((s) => {
    const b = balanceOf.get(s.id);
    const late = b ? Math.max(0, Math.min(b.balance, b.due_to_date - b.paid)) : 0;
    return { id: s.id, label: `${s.full_name}${b && b.balance > 0 ? ` · reste ${money(b.balance)}` : ""}`, due: late > 0 ? late : Math.max(0, b?.balance ?? 0) };
  });

  return (
    <>
      <PageHeader
        title="Paiements"
        description="Encaissements, retards et échéances."
        actions={
          <>
            <a href={`/app/paiements/export${params.periode ? `?periode=${params.periode}` : ""}`} className="inline-flex h-10 items-center gap-2 rounded-xl border border-line bg-surface px-4 text-sm font-semibold transition hover:border-brand-600 hover:text-brand-700">
              <Download className="h-4 w-4" /> <span className="hidden sm:inline">Exporter</span> CSV
            </a>
            <Sheet
              title="Encaisser un paiement"
              defaultOpen={Boolean(params.encaisser)}
              triggerClassName="inline-flex h-10 items-center gap-2 rounded-xl bg-brand-600 px-4 text-sm font-semibold text-white shadow-lg shadow-brand-600/20 transition hover:bg-brand-700"
              trigger={
                <>
                  <Plus className="h-4 w-4" /> Encaisser
                </>
              }
            >
              <PaymentForm students={studentOptions} />
            </Sheet>
          </>
        }
      />

      <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-3">
        <Stat label={`Encaissé · ${range.label.toLowerCase()}`} value={periodTotal} format="money" icon={<Wallet className="h-4 w-4" />} tone="brand" hint={`${allPayments.length} paiement${allPayments.length > 1 ? "s" : ""}`} />
        <Stat label="En retard" value={lateTotal} format="money" icon={<AlertTriangle className="h-4 w-4" />} tone="bad" hint={`${overdue.length} élève${overdue.length > 1 ? "s" : ""}`} delay={0.05} href={href({ onglet: "retards" })} />
        <div className="col-span-2 lg:col-span-1">
          <Stat label="À encaisser sous 30 jours" value={upcomingTotal} format="money" icon={<CalendarClock className="h-4 w-4" />} hint={`${upcoming.length} échéance${upcoming.length > 1 ? "s" : ""}`} delay={0.1} href={href({ onglet: "a-venir" })} />
        </div>
      </div>

      <div className="mt-6 space-y-3">
        <Tabs
          id="paiements-onglet"
          variant="underline"
          items={[
            { href: href({ onglet: null }), label: "Encaissements", active: tab === "encaissements" },
            { href: href({ onglet: "retards" }), label: "En retard", count: overdue.length, tone: "bad", active: tab === "retards" },
            { href: href({ onglet: "a-venir" }), label: "À venir", count: upcoming.length, active: tab === "a-venir" },
          ]}
        />
        <div className="flex flex-col gap-2 sm:flex-row">
          <SearchBox placeholder="Rechercher un élève" className="sm:max-w-xs sm:flex-1" />
          {tab === "encaissements" && (
            <div className="grid grid-cols-2 gap-2 sm:flex">
              <ParamSelect param="periode" label="Période" options={PERIODS.map((p) => ({ value: p.key, label: p.label }))} />
              <ParamSelect param="methode" label="Moyen" options={[{ value: "", label: "Tous les moyens" }, ...(Object.keys(METHOD_LABEL) as Payment["method"][]).map((m) => ({ value: m, label: METHOD_LABEL[m] }))]} />
            </div>
          )}
        </div>
      </div>

      {tab === "encaissements" && (
        <div className="mt-5 grid gap-5 lg:grid-cols-3">
          <Card className="lg:col-span-2">
            {days.length ? (
              days.map((d) => (
                <section key={d.day}>
                  <div className="flex items-center justify-between border-b border-line bg-bg/60 px-5 py-2 text-xs font-bold first:rounded-t-3xl">
                    <span className="uppercase text-muted first-letter:uppercase">{d.day === today ? "Aujourd'hui" : longDay(d.day)}</span>
                    <span className="text-brand-700">{money(d.total)}</span>
                  </div>
                  <ul className="divide-y divide-line">
                    {d.items.map((p) => (
                      <li key={p.id} className="flex items-center gap-3 px-5 py-3">
                        <Avatar name={p.student?.full_name ?? "?"} size="sm" />
                        <div className="min-w-0 flex-1">
                          {p.student ? (
                            <Link href={`/app/eleves/${p.student.id}?onglet=paiements`} className="block truncate font-semibold hover:text-brand-700">
                              {p.student.full_name}
                            </Link>
                          ) : (
                            <p className="font-semibold">Élève supprimé</p>
                          )}
                          <p className="flex items-center gap-1.5 truncate text-xs text-muted">
                            <span className={cn("h-2 w-2 shrink-0 rounded-full", METHOD_COLOR[p.method])} />
                            {METHOD_LABEL[p.method]} · {p.paid_at.slice(11, 16)}
                            {p.reference ? ` · ${p.reference}` : ""}
                          </p>
                        </div>
                        <span className="shrink-0 font-bold text-brand-700 tabular-nums">+{money(p.amount)}</span>
                      </li>
                    ))}
                  </ul>
                </section>
              ))
            ) : (
              <Empty title="Aucun encaissement">{term || params.methode ? "Aucun paiement ne correspond aux filtres." : `Aucun paiement sur la période « ${range.label.toLowerCase()} ».`}</Empty>
            )}
          </Card>
          <Card className="h-fit p-5" delay={0.05}>
            <p className="text-sm font-semibold text-muted">Répartition · {range.label.toLowerCase()}</p>
            {byMethod.length ? (
              <>
                <div className="mt-4 flex h-3 overflow-hidden rounded-full">
                  {byMethod.map((x) => (
                    <span key={x.m} className={METHOD_COLOR[x.m]} style={{ width: `${(x.total / periodTotal) * 100}%` }} />
                  ))}
                </div>
                <ul className="mt-4 space-y-2.5 text-sm">
                  {byMethod.map((x) => (
                    <li key={x.m} className="flex items-center justify-between gap-3">
                      <span className="flex items-center gap-2">
                        <span className={cn("h-2.5 w-2.5 rounded-full", METHOD_COLOR[x.m])} />
                        {METHOD_LABEL[x.m]}
                      </span>
                      <span className="font-semibold tabular-nums">
                        {money(x.total)} <span className="text-xs text-muted">· {Math.round((x.total / periodTotal) * 100)} %</span>
                      </span>
                    </li>
                  ))}
                </ul>
              </>
            ) : (
              <p className="mt-3 text-sm text-muted">Rien à afficher.</p>
            )}
          </Card>
        </div>
      )}

      {tab === "retards" && (
        <Card className="mt-5">
          {whatsappConfigured() && overdue.length > 0 && (
            <ActionForm action={sendRemindersNow} className="flex flex-col gap-2 border-b border-line p-4 sm:flex-row sm:items-center sm:justify-between sm:px-5">
              <input type="hidden" name="payments" value="only" />
              <p className="text-sm text-muted">Chaque élève en retard reçoit une relance WhatsApp (une fois par semaine au plus).</p>
              <Submit className="h-10 shrink-0">
                <Send className="h-4 w-4" /> Relancer tout le monde
              </Submit>
            </ActionForm>
          )}
          {overdueShown.length ? (
            <ul className="divide-y divide-line">
              {overdueShown.map((b) => (
                <li key={b.student_id} className="flex items-center gap-3 px-4 py-3.5 sm:px-5">
                  <Avatar name={b.s!.full_name} size="sm" />
                  <div className="min-w-0 flex-1">
                    <Link href={`/app/eleves/${b.student_id}?onglet=paiements`} className="block truncate font-semibold hover:text-brand-700">
                      {b.s!.full_name}
                    </Link>
                    <p className="truncate text-xs text-muted">
                      {displayPhone(b.s!.phone)} · reste {money(b.balance)}
                    </p>
                  </div>
                  <span className="shrink-0 text-right">
                    <span className="block font-extrabold text-red-600 tabular-nums">{money(b.late)}</span>
                    <span className="text-[11px] text-muted">en retard</span>
                  </span>
                  <a
                    href={waLink(b.s!.phone, paymentReminder(b.s!.full_name, ctx.school.name, b.late))}
                    target="_blank"
                    rel="noopener noreferrer"
                    aria-label={`Relancer ${b.s!.full_name} sur WhatsApp`}
                    title="Relancer sur WhatsApp"
                    className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-[#25D366] text-white transition hover:brightness-95"
                  >
                    <MessageCircle className="h-4 w-4" />
                  </a>
                </li>
              ))}
            </ul>
          ) : (
            <Empty title="Aucun retard">{term ? "Aucun élève ne correspond." : "Tous les élèves sont à jour de leurs échéances. 👏"}</Empty>
          )}
        </Card>
      )}

      {tab === "a-venir" && (
        <Card className="mt-5">
          {upcomingShown.length ? (
            <ul className="divide-y divide-line">
              {upcomingShown.map((i) => {
                const s = studentMap.get(i.student_id)!;
                return (
                  <li key={i.id} className="flex items-center gap-3 px-4 py-3.5 sm:px-5">
                    <span className="w-14 shrink-0 text-center">
                      <span className="block text-[11px] font-bold uppercase text-muted">{weekday(i.due_date).slice(0, 3)}</span>
                      <span className="block font-extrabold">{dayShort(i.due_date)}</span>
                    </span>
                    <div className="min-w-0 flex-1">
                      <Link href={`/app/eleves/${s.id}?onglet=paiements`} className="block truncate font-semibold hover:text-brand-700">
                        {s.full_name}
                      </Link>
                      <p className="text-xs text-muted">{i.due_date === today ? "Aujourd'hui" : `Échéance du ${dayMonth(i.due_date)}`}</p>
                    </div>
                    <span className="shrink-0 font-bold tabular-nums">{money(i.amount)}</span>
                  </li>
                );
              })}
            </ul>
          ) : (
            <Empty title="Aucune échéance dans les 30 jours" />
          )}
        </Card>
      )}

      {tab === "retards" && overdue.length > 0 && <p className="mt-3 text-center text-xs text-muted">Total en retard : {money(lateTotal)}</p>}
      {tab === "encaissements" && list.length > 0 && (
        <p className="mt-3 text-center text-xs text-muted">
          {list.length} paiement{list.length > 1 ? "s" : ""} · {money(list.reduce((s, p) => s + p.amount, 0))}
        </p>
      )}
    </>
  );
}
