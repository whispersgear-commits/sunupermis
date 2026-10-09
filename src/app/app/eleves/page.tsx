import type { Metadata } from "next";
import Link from "next/link";
import { Search } from "lucide-react";
import { Badge, ButtonLink, Card, Empty, PageHeader, StaggerItem, StaggerList } from "@/components/app/ui";
import { inputClass } from "@/components/ui/fields";
import { createClient } from "@/lib/supabase/server";
import { requireContext } from "@/lib/session";
import { money } from "@/lib/format";
import { displayPhone } from "@/lib/phone";
import { STATUS_LABEL, type Balance, type Student } from "@/lib/types";

export const metadata: Metadata = { title: "Élèves" };

const STATUS_TONE = { active: "info", code_ok: "warn", licensed: "good", dropped: "neutral" } as const;

export default async function ElevesPage({ searchParams }: { searchParams: Promise<{ q?: string }> }) {
  const { q = "" } = await searchParams;
  await requireContext();
  const supabase = await createClient();

  let query = supabase.from("students").select("*").order("created_at", { ascending: false }).limit(300);
  const term = q.trim().replace(/[,()%*\\]/g, " ");
  if (term) {
    const digits = term.replace(/\D/g, "");
    query = digits.length >= 4 ? query.or(`full_name.ilike.%${term}%,phone.ilike.%${digits}%`) : query.ilike("full_name", `%${term}%`);
  }
  const [{ data: students }, { data: balances }] = await Promise.all([query, supabase.from("student_balances").select("*")]);
  const balanceOf = new Map(((balances ?? []) as Balance[]).map((b) => [b.student_id, b]));
  const list = (students ?? []) as Student[];

  return (
    <>
      <PageHeader title="Élèves" description={`${list.length} élève${list.length > 1 ? "s" : ""}`} actions={<ButtonLink href="/app/eleves/nouveau">+ Nouvel élève</ButtonLink>} />

      <form className="relative mb-5 max-w-md">
        <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" />
        <input name="q" defaultValue={q} placeholder="Nom ou téléphone" className={`${inputClass} pl-10`} />
      </form>

      <Card>
        {list.length ? (
          <StaggerList className="divide-y divide-line">
            {list.map((s) => {
              const b = balanceOf.get(s.id);
              const hours = b?.driving_lessons_done ?? 0;
              const progress = s.hours_planned ? Math.min(100, Math.round((hours / s.hours_planned) * 100)) : 0;
              return (
                <StaggerItem key={s.id}>
                  <Link href={`/app/eleves/${s.id}`} className="flex flex-wrap items-center gap-4 px-5 py-4 transition hover:bg-bg">
                    <span className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-brand-50 font-extrabold text-brand-700 dark:bg-brand-900/40 dark:text-brand-200">
                      {s.full_name.split(" ").map((p) => p[0]).slice(0, 2).join("").toUpperCase()}
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="truncate font-bold">{s.full_name}</p>
                      <p className="text-xs text-muted">
                        {displayPhone(s.phone)} · Permis {s.license}
                      </p>
                    </div>
                    <div className="hidden w-40 sm:block">
                      <div className="flex justify-between text-xs text-muted">
                        <span>Leçons</span>
                        <span>
                          {hours}/{s.hours_planned}
                        </span>
                      </div>
                      <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-line">
                        <div className="h-full rounded-full bg-brand-500" style={{ width: `${progress}%` }} />
                      </div>
                    </div>
                    <div className="text-right">
                      <Badge tone={STATUS_TONE[s.status]}>{STATUS_LABEL[s.status]}</Badge>
                      <p className={`mt-1 text-xs font-semibold ${b && b.balance > 0 ? "text-red-600" : "text-brand-700"}`}>
                        {b && b.balance > 0 ? `Reste ${money(b.balance)}` : "Soldé"}
                      </p>
                    </div>
                  </Link>
                </StaggerItem>
              );
            })}
          </StaggerList>
        ) : (
          <Empty title={q ? "Aucun élève trouvé" : "Aucun élève pour l'instant"}>
            {!q && "Inscrivez votre premier élève : son échéancier est créé automatiquement."}
          </Empty>
        )}
      </Card>
    </>
  );
}
