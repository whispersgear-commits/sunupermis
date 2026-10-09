import type { Metadata } from "next";
import Link from "next/link";
import { startOfMonth } from "date-fns";
import { MessageCircle, Wallet, AlertTriangle, TrendingUp } from "lucide-react";
import { Badge, ButtonLink, Card, CardTitle, Empty, PageHeader, Stat, StaggerItem, StaggerList } from "@/components/app/ui";
import { createClient } from "@/lib/supabase/server";
import { requireStaff } from "@/lib/session";
import { money, shortDate } from "@/lib/format";
import { displayPhone } from "@/lib/phone";
import { paymentReminder, waLink } from "@/lib/whatsapp";
import { METHOD_LABEL, type Balance, type Payment } from "@/lib/types";

export const metadata: Metadata = { title: "Paiements" };

export default async function PaiementsPage() {
  const ctx = await requireStaff();
  const supabase = await createClient();

  const [{ data: payments }, { data: balances }, { data: students }] = await Promise.all([
    supabase.from("payments").select("*, student:students(id, full_name)").order("paid_at", { ascending: false }).limit(100),
    supabase.from("student_balances").select("*"),
    supabase.from("students").select("id, full_name, phone").neq("status", "dropped"),
  ]);

  const names = new Map((students ?? []).map((s) => [s.id, s]));
  const rows = (balances ?? []) as Balance[];
  const overdue = rows
    .map((b) => ({ ...b, late: Math.min(b.balance, b.due_to_date - b.paid), s: names.get(b.student_id) }))
    .filter((b) => b.late > 0 && b.s)
    .sort((a, b) => b.late - a.late);
  const outstanding = rows.filter((b) => names.has(b.student_id)).reduce((sum, b) => sum + Math.max(0, b.balance), 0);
  const monthStart = startOfMonth(new Date()).toISOString();
  const list = (payments ?? []) as (Payment & { student: { id: string; full_name: string } | null })[];
  const month = list.filter((p) => p.paid_at >= monthStart).reduce((sum, p) => sum + p.amount, 0);

  return (
    <>
      <PageHeader title="Paiements" description="Encaissements, retards et relances." />

      <div className="grid gap-3 sm:grid-cols-3 sm:gap-4">
        <Stat label="Encaissé ce mois" value={month} format="money" icon={<Wallet className="h-4 w-4" />} tone="brand" />
        <Stat label="En retard" value={overdue.reduce((s, b) => s + b.late, 0)} format="money" icon={<AlertTriangle className="h-4 w-4" />} tone="bad" delay={0.05} />
        <Stat label="Reste à encaisser (total)" value={outstanding} format="money" icon={<TrendingUp className="h-4 w-4" />} delay={0.1} hint="Échéances à venir comprises" />
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        <Card delay={0.1}>
          <CardTitle title="En retard" action={<Badge tone="bad">{overdue.length}</Badge>} />
          {overdue.length ? (
            <StaggerList className="divide-y divide-line">
              {overdue.map((b) => (
                <StaggerItem key={b.student_id} className="flex items-center justify-between gap-3 px-5 py-3">
                  <div className="min-w-0">
                    <Link href={`/app/eleves/${b.student_id}`} className="block truncate font-semibold hover:text-brand-700">
                      {b.s!.full_name}
                    </Link>
                    <p className="text-xs text-muted">
                      {displayPhone(b.s!.phone)} · <span className="font-semibold text-red-600">{money(b.late)}</span>
                    </p>
                  </div>
                  <ButtonLink variant="whatsapp" className="h-9 px-3" href={waLink(b.s!.phone, paymentReminder(b.s!.full_name, ctx.school.name, b.late))}>
                    <MessageCircle className="h-4 w-4" /> Relancer
                  </ButtonLink>
                </StaggerItem>
              ))}
            </StaggerList>
          ) : (
            <Empty title="Aucun retard">Tous les élèves sont à jour de leurs échéances.</Empty>
          )}
        </Card>

        <Card delay={0.15}>
          <CardTitle title="Derniers encaissements" />
          {list.length ? (
            <StaggerList className="divide-y divide-line">
              {list.map((p) => (
                <StaggerItem key={p.id} className="flex items-center justify-between gap-3 px-5 py-3 text-sm">
                  <div className="min-w-0">
                    <p className="truncate font-semibold">{p.student?.full_name ?? "Élève supprimé"}</p>
                    <p className="text-xs text-muted">
                      {shortDate(p.paid_at)} · {METHOD_LABEL[p.method]}
                    </p>
                  </div>
                  <span className="font-bold text-brand-700">+{money(p.amount)}</span>
                </StaggerItem>
              ))}
            </StaggerList>
          ) : (
            <Empty title="Aucun encaissement">Les paiements s'enregistrent depuis la fiche de chaque élève.</Empty>
          )}
        </Card>
      </div>
    </>
  );
}
