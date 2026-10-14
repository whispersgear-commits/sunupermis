import type { Metadata } from "next";
import { PendingButton } from "@/components/ui/pending-button";
import { Car, Plus, UserPlus } from "lucide-react";
import { Avatar, Badge, Card, Empty, PageHeader } from "@/components/app/ui";
import { AgencyPicker, InstructorForm, VehicleForm } from "@/components/app/team-forms";
import { ParamSelect } from "@/components/app/filters";
import { agencyFilter } from "@/lib/agencies";
import { InviteForm, InviteLinkActions } from "@/components/app/invite-panel";
import { Tabs } from "@/components/app/filters";
import { Sheet } from "@/components/ui/sheet";
import { createClient } from "@/lib/supabase/server";
import { requireStaff, siteOrigin } from "@/lib/session";
import { displayPhone } from "@/lib/phone";
import { shortDate } from "@/lib/format";
import { PLANS, userLimit } from "@/lib/plans";
import { ROLE_LABEL, type Instructor, type Invitation, type Member, type Vehicle } from "@/lib/types";
import { removeMember, revokeInvitation, toggleActive } from "../actions";

export const metadata: Metadata = { title: "Équipe" };

const ROLE_TONE = { owner: "good", secretary: "info", instructor: "warn" } as const;
const addButton = "inline-flex h-10 items-center gap-2 rounded-xl bg-brand-600 px-4 text-sm font-semibold text-white shadow-lg shadow-brand-600/20 transition hover:bg-brand-700";

function ToggleButton({ table, id, active }: { table: "instructors" | "vehicles"; id: string; active: boolean }) {
  return (
    <form action={toggleActive}>
      <input type="hidden" name="table" value={table} />
      <input type="hidden" name="id" value={id} />
      <input type="hidden" name="active" value={active ? "0" : "1"} />
      <PendingButton className="rounded-lg border border-line px-2.5 py-1.5 text-xs font-semibold text-muted transition hover:border-brand-500 hover:text-brand-700">{active ? "Désactiver" : "Réactiver"}</PendingButton>
    </form>
  );
}

export default async function EquipePage({ searchParams }: { searchParams: Promise<{ onglet?: string; inviter?: string; agence?: string }> }) {
  const params = await searchParams;
  const ctx = await requireStaff();
  const isOwner = ctx.role === "owner";
  const supabase = await createClient();
  const [{ data: instructors }, { data: vehicles }, { data: members }, { data: invitations }] = await Promise.all([
    supabase.from("instructors").select("*").order("active", { ascending: false }).order("full_name"),
    supabase.from("vehicles").select("*").order("active", { ascending: false }).order("label"),
    supabase.from("memberships").select("user_id, role, instructor_id, full_name, email, created_at").order("created_at"),
    isOwner
      ? supabase.from("invitations").select("*").is("accepted_at", null).eq("revoked", false).gt("expires_at", new Date().toISOString()).order("created_at", { ascending: false })
      : Promise.resolve({ data: [] }),
  ]);
  const origin = await siteOrigin();
  const limit = userLimit(ctx.school);
  const memberList = (members ?? []) as Member[];
  const pending = (invitations ?? []) as Invitation[];
  const agency = agencyFilter(ctx.school, params.agence);
  const agencyNames = agency.options.slice(1).map((o) => o.value);
  const instructorList = ((instructors ?? []) as Instructor[]).filter((i) => agency.keep(i.agency));
  const vehicleList = ((vehicles ?? []) as Vehicle[]).filter((v) => agency.keep(v.agency));
  const activeInstructors = instructorList.filter((i) => i.active);

  const tab = params.onglet === "moniteurs" || params.onglet === "voitures" ? params.onglet : "comptes";
  const tabs = [
    { href: "/app/equipe", label: "Comptes", count: memberList.length, active: tab === "comptes" },
    { href: `/app/equipe?onglet=moniteurs${agency.selected ? `&agence=${encodeURIComponent(agency.selected)}` : ""}`, label: "Moniteurs", count: activeInstructors.length, active: tab === "moniteurs" },
    { href: `/app/equipe?onglet=voitures${agency.selected ? `&agence=${encodeURIComponent(agency.selected)}` : ""}`, label: "Voitures", count: vehicleList.filter((v) => v.active).length, active: tab === "voitures" },
  ];

  const action =
    tab === "comptes" ? (
      isOwner && (
        <Sheet
          title="Inviter une personne"
          description="Une secrétaire ou un moniteur rejoint votre espace avec son propre compte."
          defaultOpen={Boolean(params.inviter)}
          triggerClassName={addButton}
          trigger={
            <>
              <UserPlus className="h-4 w-4" /> Inviter
            </>
          }
        >
          <InviteForm instructors={activeInstructors.map((i) => ({ id: i.id, full_name: i.full_name }))} />
        </Sheet>
      )
    ) : tab === "moniteurs" ? (
      <Sheet
        title="Ajouter un moniteur"
        triggerClassName={addButton}
        trigger={
          <>
            <Plus className="h-4 w-4" /> Moniteur
          </>
        }
      >
        <InstructorForm agencies={agencyNames} />
      </Sheet>
    ) : (
      <Sheet
        title="Ajouter une voiture"
        triggerClassName={addButton}
        trigger={
          <>
            <Plus className="h-4 w-4" /> Voiture
          </>
        }
      >
        <VehicleForm agencies={agencyNames} />
      </Sheet>
    );

  return (
    <>
      <PageHeader title="Équipe et voitures" description="Comptes de connexion, moniteurs et véhicules de l'auto-école." actions={action || undefined} />
      <Tabs id="equipe-onglet" variant="underline" className="mb-5" items={tabs} />
      {agency.enabled && tab !== "comptes" && (
        <div className="mb-4">
          <ParamSelect param="agence" label="Agence" options={agency.options} className="w-full sm:w-auto" />
        </div>
      )}

      {tab === "comptes" && (
        <div className="space-y-5">
          <Card>
            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-line px-5 py-4">
              <h2 className="font-bold">Comptes de connexion</h2>
              <Badge tone="info">{limit === null ? `${memberList.length} · illimité (accès offert)` : `${memberList.length} / ${limit} · ${PLANS[ctx.school.plan].name}`}</Badge>
            </div>
            <ul className="divide-y divide-line">
              {memberList.map((m) => (
                <li key={m.user_id} className="flex items-center gap-3 px-4 py-3.5 sm:px-5">
                  <Avatar name={m.full_name ?? m.email ?? "?"} />
                  <div className="min-w-0 flex-1">
                    <p className="flex flex-wrap items-center gap-x-2 font-bold">
                      <span className="truncate">{m.full_name ?? m.email}</span>
                      {m.user_id === ctx.userId && <span className="text-xs font-semibold text-muted">(vous)</span>}
                    </p>
                    <p className="truncate text-xs text-muted">{m.email}</p>
                    <p className="text-xs text-muted">depuis le {shortDate(m.created_at)}</p>
                  </div>
                  <div className="flex shrink-0 flex-col items-end gap-1.5">
                    <Badge tone={ROLE_TONE[m.role]}>{ROLE_LABEL[m.role]}</Badge>
                    {isOwner && m.user_id !== ctx.userId && (
                      <form action={removeMember}>
                        <input type="hidden" name="user_id" value={m.user_id} />
                        <PendingButton
                          confirm={`Retirer ${m.full_name ?? m.email ?? "ce compte"} de l'équipe ? Il ne pourra plus se connecter à l'auto-école.`}
                          className="text-xs font-semibold text-muted hover:text-red-600"
                        >
                          Retirer
                        </PendingButton>
                      </form>
                    )}
                  </div>
                </li>
              ))}
            </ul>
          </Card>

          {isOwner && (
            <Card delay={0.05}>
              <div className="border-b border-line px-5 py-4">
                <h2 className="font-bold">Invitations en attente</h2>
                <p className="mt-0.5 text-xs text-muted">Lien valable 7 jours, utilisable une seule fois. Un moniteur voit les élèves et son planning, jamais les paiements.</p>
              </div>
              {pending.length ? (
                <ul className="divide-y divide-line">
                  {pending.map((inv) => (
                    <li key={inv.id} className="flex flex-col gap-3 px-4 py-3.5 sm:flex-row sm:items-center sm:justify-between sm:px-5">
                      <div className="flex min-w-0 items-center gap-3">
                        <Avatar name={inv.label} size="sm" />
                        <div className="min-w-0">
                          <p className="truncate font-semibold">{inv.label}</p>
                          <p className="text-xs text-muted">
                            {ROLE_LABEL[inv.role]} · expire le {shortDate(inv.expires_at)}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 pl-12 sm:pl-0">
                        <InviteLinkActions url={`${origin}/rejoindre/${inv.token}`} label={inv.label} school={ctx.school.name} />
                        <form action={revokeInvitation}>
                          <input type="hidden" name="id" value={inv.id} />
                          <PendingButton className="h-8 px-2 text-xs font-semibold text-muted hover:text-red-600">Annuler</PendingButton>
                        </form>
                      </div>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="px-5 py-6 text-sm text-muted">Aucune invitation en attente. Appuyez sur « Inviter » pour ajouter une secrétaire ou un moniteur.</p>
              )}
            </Card>
          )}
        </div>
      )}

      {tab === "moniteurs" && (
        <Card>
          {instructorList.length ? (
            <ul className="divide-y divide-line">
              {instructorList.map((i) => {
                const hasAccount = memberList.some((m) => m.instructor_id === i.id);
                return (
                  <li key={i.id} className={`flex items-center gap-3 px-4 py-3.5 sm:px-5 ${i.active ? "" : "opacity-60"}`}>
                    <Avatar name={i.full_name} />
                    <div className="min-w-0 flex-1">
                      <p className="truncate font-bold">{i.full_name}</p>
                      <p className="truncate text-xs text-muted">{i.phone ? displayPhone(i.phone) : "Sans téléphone"}</p>
                    </div>
                    <div className="flex shrink-0 items-center gap-2">
                      {agency.enabled && <AgencyPicker table="instructors" id={i.id} current={i.agency} agencies={agencyNames} />}
                      {hasAccount ? <Badge tone="good">A son compte</Badge> : !i.active ? <Badge>Inactif</Badge> : null}
                      <ToggleButton table="instructors" id={i.id} active={i.active} />
                    </div>
                  </li>
                );
              })}
            </ul>
          ) : (
            <Empty title="Aucun moniteur">Ajoutez vos moniteurs pour les affecter aux leçons.</Empty>
          )}
        </Card>
      )}

      {tab === "voitures" && (
        <Card>
          {vehicleList.length ? (
            <ul className="divide-y divide-line">
              {vehicleList.map((v) => (
                <li key={v.id} className={`flex items-center gap-3 px-4 py-3.5 sm:px-5 ${v.active ? "" : "opacity-60"}`}>
                  <span className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-bg text-muted">
                    <Car className="h-5 w-5" />
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-bold">{v.label}</p>
                    <p className="truncate text-xs text-muted">
                      Catégorie {v.category}
                      {v.plate ? ` · ${v.plate}` : ""}
                    </p>
                  </div>
                  <div className="flex shrink-0 items-center gap-2">
                    {agency.enabled && <AgencyPicker table="vehicles" id={v.id} current={v.agency} agencies={agencyNames} />}
                    {!v.active && <Badge>Inactive</Badge>}
                    <ToggleButton table="vehicles" id={v.id} active={v.active} />
                  </div>
                </li>
              ))}
            </ul>
          ) : (
            <Empty title="Aucune voiture">Ajoutez vos voitures : le planning empêche qu'une voiture serve à deux leçons en même temps.</Empty>
          )}
        </Card>
      )}
    </>
  );
}
