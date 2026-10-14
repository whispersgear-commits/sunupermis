import type { Metadata } from "next";
import Link from "next/link";
import { ChevronRight, UserPlus } from "lucide-react";
import { Avatar, Badge, ButtonLink, Card, Empty, PageHeader, ProgressBar } from "@/components/app/ui";
import { ParamSelect, SearchBox, Tabs } from "@/components/app/filters";
import { createClient } from "@/lib/supabase/server";
import { requireContext } from "@/lib/session";
import { money } from "@/lib/format";
import { displayPhone } from "@/lib/phone";
import { fold, withParams } from "@/lib/url";
import { agencyFilter } from "@/lib/agencies";
import { STATUS_LABEL, type Balance, type Student } from "@/lib/types";

export const metadata: Metadata = { title: "Élèves" };

const STATUS_TONE = { active: "info", code_ok: "warn", licensed: "good", dropped: "neutral" } as const;
type Params = { q?: string; filtre?: string; tri?: string; agence?: string };

export default async function ElevesPage({ searchParams }: { searchParams: Promise<Params> }) {
  const params = await searchParams;
  const ctx = await requireContext();
  const isStaff = ctx.role !== "instructor";
  const supabase = await createClient();

  const [{ data: students }, { data: balances }] = await Promise.all([
    supabase.from("students").select("*").order("full_name").limit(1000),
    supabase.from("student_balances").select("*"),
  ]);
  const balanceOf = new Map(((balances ?? []) as Balance[]).map((b) => [b.student_id, b]));
  const all = ((students ?? []) as Student[]).map((s) => {
    const b = balanceOf.get(s.id);
    return {
      ...s,
      hours: b?.driving_lessons_done ?? 0,
      rest: b ? Math.max(0, b.balance) : s.package_price,
      late: b ? Math.max(0, Math.min(b.balance, b.due_to_date - b.paid)) : 0,
    };
  });

  // Recherche : nom (sans tenir compte des accents) ou numéro.
  const term = fold(params.q?.trim() ?? "");
  const digits = (params.q ?? "").replace(/\D/g, "");
  const agency = agencyFilter(ctx.school, params.agence);
  const searched = all.filter((s) => agency.keep(s.agency)).filter((s) => !term || fold(s.full_name).includes(term) || (digits.length >= 3 && s.phone.includes(digits)));

  const FILTERS = [
    { key: "", label: "En cours", test: (s: (typeof all)[number]) => s.status === "active" || s.status === "code_ok" },
    { key: "code", label: "Code obtenu", test: (s: (typeof all)[number]) => s.status === "code_ok" },
    ...(isStaff ? [{ key: "retard", label: "En retard", test: (s: (typeof all)[number]) => s.late > 0 && s.status !== "dropped", tone: "bad" as const }] : []),
    { key: "permis", label: "Permis obtenu", test: (s: (typeof all)[number]) => s.status === "licensed" },
    { key: "abandon", label: "Abandons", test: (s: (typeof all)[number]) => s.status === "dropped" },
    { key: "tous", label: "Tous", test: () => true },
  ];
  const filter = FILTERS.find((f) => f.key === (params.filtre ?? "")) ?? FILTERS[0];
  const tri = params.tri ?? "nom";
  const list = searched.filter(filter.test).sort((a, b) => {
    if (tri === "recent") return b.created_at.localeCompare(a.created_at);
    if (tri === "reste") return b.rest - a.rest;
    if (tri === "retard") return b.late - a.late;
    if (tri === "progression") return b.hours / (b.hours_planned || 1) - a.hours / (a.hours_planned || 1);
    return a.full_name.localeCompare(b.full_name, "fr");
  });

  // Tri alphabétique : une lettre en tête de chaque groupe, comme un répertoire.
  const groups: { letter: string | null; items: typeof list }[] = [];
  for (const s of list) {
    const letter = tri === "nom" ? fold(s.full_name)[0]?.toUpperCase() ?? "#" : null;
    const last = groups[groups.length - 1];
    if (last && last.letter === letter) last.items.push(s);
    else groups.push({ letter, items: [s] });
  }

  const current = { q: params.q, filtre: params.filtre, tri: params.tri, agence: params.agence };
  const sortOptions = [
    { value: "", label: "Nom (A → Z)" },
    { value: "recent", label: "Inscription récente" },
    { value: "progression", label: "Progression" },
    ...(isStaff
      ? [
          { value: "reste", label: "Reste à payer" },
          { value: "retard", label: "Retard de paiement" },
        ]
      : []),
  ];

  return (
    <>
      <PageHeader
        title="Élèves"
        description={`${all.filter((s) => s.status === "active" || s.status === "code_ok").length} en formation · ${all.length} au total`}
        actions={
          isStaff ? (
            <ButtonLink href="/app/eleves/nouveau">
              <UserPlus className="h-4 w-4" /> Nouvel élève
            </ButtonLink>
          ) : undefined
        }
      />

      <div className="mb-4 flex flex-col gap-2 sm:flex-row">
        <SearchBox placeholder="Nom ou téléphone" className="sm:max-w-md sm:flex-1" />
        {agency.enabled && <ParamSelect param="agence" label="Agence" options={agency.options} className="w-full sm:w-auto" />}
        <ParamSelect param="tri" label="Trier par" options={sortOptions} className="w-full sm:w-auto" />
      </div>
      <Tabs
        id="eleves-filtre"
        className="mb-5"
        items={FILTERS.map((f) => ({
          href: withParams("/app/eleves", current, { filtre: f.key || null }),
          label: f.label,
          count: searched.filter(f.test).length,
          active: f.key === filter.key,
          tone: "tone" in f ? f.tone : undefined,
        }))}
      />

      <Card>
        {isStaff && list.length > 0 && (
          <div className="hidden grid-cols-[minmax(0,1fr)_140px_160px_190px_20px] gap-4 border-b border-line px-5 py-3 text-xs font-bold uppercase tracking-wide text-muted md:grid">
            <span>Élève</span>
            <span>Statut</span>
            <span>Leçons de conduite</span>
            <span className="text-right">Reste à payer</span>
            <span />
          </div>
        )}
        {list.length ? (
          groups.map((g, gi) => (
            <div key={`${g.letter}-${gi}`}>
              {g.letter && <p className="sticky top-14 z-10 border-b border-line bg-bg/95 px-5 py-1.5 text-xs font-extrabold text-muted backdrop-blur lg:top-16">{g.letter}</p>}
              <ul className="divide-y divide-line">
                {g.items.map((s) => (
                  <li key={s.id}>
                    <Link
                      href={`/app/eleves/${s.id}`}
                      className="grid grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-x-3 gap-y-2 px-4 py-3.5 transition hover:bg-bg sm:px-5 md:grid-cols-[minmax(0,1fr)_140px_160px_190px_20px] md:gap-4"
                    >
                      <span className="col-span-2 flex min-w-0 items-center gap-3 md:col-span-1">
                        <Avatar name={s.full_name} />
                        <span className="min-w-0 md:block">
                          <span className="block truncate font-bold">{s.full_name}</span>
                          <span className="block truncate text-xs text-muted">
                            {displayPhone(s.phone)} · Permis {s.license}
                            {agency.enabled && s.agency && !agency.selected && ` · ${s.agency}`}
                          </span>
                        </span>
                      </span>
                      <span className="hidden md:block">
                        <Badge tone={STATUS_TONE[s.status]}>{STATUS_LABEL[s.status]}</Badge>
                      </span>
                      <span className="hidden md:block">
                        <span className="mb-1 flex justify-between text-xs text-muted">
                          <span>
                            {s.hours}/{s.hours_planned} h
                          </span>
                          <span>{s.hours_planned ? Math.min(100, Math.round((s.hours / s.hours_planned) * 100)) : 0} %</span>
                        </span>
                        <ProgressBar value={s.hours} total={s.hours_planned} />
                      </span>
                      <span className="hidden text-right text-sm font-bold md:block">
                        {!isStaff ? null : s.rest > 0 ? (
                          <>
                            <span className={s.late > 0 ? "text-red-600" : ""}>{money(s.rest)}</span>
                            {s.late > 0 && <span className="block text-[11px] font-semibold text-red-600">dont {money(s.late)} en retard</span>}
                          </>
                        ) : (
                          <span className="text-brand-700">Soldé</span>
                        )}
                      </span>
                      <ChevronRight className="hidden h-4 w-4 text-muted md:block" />

                      {/* Téléphone : statut et reste sur la ligne, progression dessous */}
                      <span className="col-start-3 row-start-1 flex flex-col items-end gap-1 md:hidden">
                        <Badge tone={STATUS_TONE[s.status]}>{STATUS_LABEL[s.status]}</Badge>
                        {isStaff &&
                          (s.rest > 0 ? (
                            <span className={`text-xs font-bold ${s.late > 0 ? "text-red-600" : "text-muted"}`}>{money(s.rest)}</span>
                          ) : (
                            <span className="text-xs font-bold text-brand-700">Soldé</span>
                          ))}
                      </span>
                      <span className="col-span-3 flex items-center gap-3 pl-14 md:hidden">
                        <span className="flex-1">
                          <ProgressBar value={s.hours} total={s.hours_planned} />
                        </span>
                        <span className="text-xs font-semibold text-muted tabular-nums">
                          {s.hours}/{s.hours_planned} h
                        </span>
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))
        ) : (
          <Empty title={term ? "Aucun élève trouvé" : all.length ? "Aucun élève dans cette liste" : "Aucun élève pour l'instant"}>
            {term ? `Aucun résultat pour « ${params.q} ».` : !all.length && isStaff ? "Inscrivez votre premier élève : son échéancier est créé automatiquement." : null}
          </Empty>
        )}
      </Card>
      {list.length > 0 && (
        <p className="mt-3 text-center text-xs text-muted">
          {list.length} élève{list.length > 1 ? "s" : ""} affiché{list.length > 1 ? "s" : ""}
        </p>
      )}
    </>
  );
}
