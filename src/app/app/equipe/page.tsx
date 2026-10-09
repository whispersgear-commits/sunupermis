import type { Metadata } from "next";
import { Badge, Card, CardTitle, PageHeader } from "@/components/app/ui";
import { InstructorForm, VehicleForm } from "@/components/app/team-forms";
import { InviteForm, InviteLinkActions } from "@/components/app/invite-panel";
import { createClient } from "@/lib/supabase/server";
import { requireStaff, siteOrigin } from "@/lib/session";
import { displayPhone } from "@/lib/phone";
import { shortDate } from "@/lib/format";
import { PLANS, userLimit } from "@/lib/plans";
import { ROLE_LABEL, type Instructor, type Invitation, type Member, type Vehicle } from "@/lib/types";
import { removeMember, revokeInvitation, toggleActive } from "../actions";

export const metadata: Metadata = { title: "Équipe" };

function ToggleButton({ table, id, active }: { table: "instructors" | "vehicles"; id: string; active: boolean }) {
  return (
    <form action={toggleActive}>
      <input type="hidden" name="table" value={table} />
      <input type="hidden" name="id" value={id} />
      <input type="hidden" name="active" value={active ? "0" : "1"} />
      <button className="text-xs font-semibold text-muted hover:text-brand-700">{active ? "Désactiver" : "Réactiver"}</button>
    </form>
  );
}

export default async function EquipePage() {
  const ctx = await requireStaff();
  const isOwner = ctx.role === "owner";
  const supabase = await createClient();
  const [{ data: instructors }, { data: vehicles }, { data: members }, { data: invitations }] = await Promise.all([
    supabase.from("instructors").select("*").order("full_name"),
    supabase.from("vehicles").select("*").order("label"),
    supabase.from("memberships").select("user_id, role, instructor_id, full_name, email, created_at").order("created_at"),
    isOwner
      ? supabase.from("invitations").select("*").is("accepted_at", null).eq("revoked", false).gt("expires_at", new Date().toISOString()).order("created_at", { ascending: false })
      : Promise.resolve({ data: [] }),
  ]);
  const origin = await siteOrigin();
  const limit = userLimit(ctx.school);
  const memberList = (members ?? []) as Member[];
  const pending = (invitations ?? []) as Invitation[];
  const activeInstructors = ((instructors ?? []) as Instructor[]).filter((i) => i.active);

  return (
    <>
      <PageHeader title="Équipe et voitures" description="Comptes de connexion, moniteurs et voitures de l'auto-école." />

      <Card className="mb-6">
        <CardTitle
          title="Comptes de connexion"
          action={<Badge tone="info">{limit === null ? `${memberList.length} · illimité pendant l'essai` : `${memberList.length} / ${limit} (${PLANS[ctx.school.plan].name})`}</Badge>}
        />
        <ul className="divide-y divide-line">
          {memberList.map((m) => (
            <li key={m.user_id} className="flex flex-wrap items-center justify-between gap-3 px-5 py-3">
              <span className="min-w-0">
                <span className="block truncate font-semibold">
                  {m.full_name ?? m.email} {m.user_id === ctx.userId && <span className="text-xs text-muted">(vous)</span>}
                </span>
                <span className="text-xs text-muted">
                  {m.email} · depuis le {shortDate(m.created_at)}
                </span>
              </span>
              <span className="flex items-center gap-3">
                <Badge tone={m.role === "owner" ? "good" : m.role === "secretary" ? "info" : "warn"}>{ROLE_LABEL[m.role]}</Badge>
                {isOwner && m.user_id !== ctx.userId && (
                  <form action={removeMember}>
                    <input type="hidden" name="user_id" value={m.user_id} />
                    <button className="text-xs font-semibold text-muted hover:text-red-600">Retirer</button>
                  </form>
                )}
              </span>
            </li>
          ))}
        </ul>

        {isOwner && (
          <div className="space-y-4 border-t border-line p-5">
            <div>
              <p className="mb-2 text-sm font-semibold">Inviter une secrétaire ou un moniteur</p>
              <InviteForm instructors={activeInstructors.map((i) => ({ id: i.id, full_name: i.full_name }))} />
              <p className="mt-2 text-xs text-muted">
                Le lien est valable 7 jours et ne sert qu'une fois. La personne crée son compte avec, puis arrive directement dans votre espace. Un moniteur voit les élèves et son planning, jamais les paiements.
              </p>
            </div>
            {pending.length > 0 && (
              <ul className="divide-y divide-line rounded-2xl border border-line">
                {pending.map((inv) => (
                  <li key={inv.id} className="flex flex-wrap items-center justify-between gap-3 px-4 py-3">
                    <span className="min-w-0">
                      <span className="block font-semibold">{inv.label}</span>
                      <span className="text-xs text-muted">
                        {ROLE_LABEL[inv.role]} · en attente · expire le {shortDate(inv.expires_at)}
                      </span>
                    </span>
                    <span className="flex items-center gap-2">
                      <InviteLinkActions url={`${origin}/rejoindre/${inv.token}`} label={inv.label} school={ctx.school.name} />
                      <form action={revokeInvitation}>
                        <input type="hidden" name="id" value={inv.id} />
                        <button className="text-xs font-semibold text-muted hover:text-red-600">Annuler</button>
                      </form>
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}
      </Card>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card delay={0.05}>
          <CardTitle title="Moniteurs" action={<Badge tone="good">{activeInstructors.length}</Badge>} />
          <div className="border-b border-line p-5">
            <InstructorForm />
          </div>
          <ul className="divide-y divide-line">
            {((instructors ?? []) as Instructor[]).map((i) => (
              <li key={i.id} className="flex items-center justify-between px-5 py-3">
                <span className={i.active ? "" : "opacity-50"}>
                  <span className="block font-semibold">{i.full_name}</span>
                  <span className="text-xs text-muted">
                    {i.phone ? displayPhone(i.phone) : "Sans téléphone"}
                    {memberList.some((m) => m.instructor_id === i.id) ? " · a son compte" : ""}
                  </span>
                </span>
                <ToggleButton table="instructors" id={i.id} active={i.active} />
              </li>
            ))}
            {!instructors?.length && <li className="px-5 py-6 text-sm text-muted">Ajoutez votre premier moniteur.</li>}
          </ul>
        </Card>

        <Card delay={0.1}>
          <CardTitle title="Voitures" action={<Badge tone="good">{(vehicles ?? []).filter((v) => v.active).length}</Badge>} />
          <div className="border-b border-line p-5">
            <VehicleForm />
          </div>
          <ul className="divide-y divide-line">
            {((vehicles ?? []) as Vehicle[]).map((v) => (
              <li key={v.id} className="flex items-center justify-between px-5 py-3">
                <span className={v.active ? "" : "opacity-50"}>
                  <span className="block font-semibold">{v.label}</span>
                  <span className="text-xs text-muted">
                    Catégorie {v.category}
                    {v.plate ? ` · ${v.plate}` : ""}
                  </span>
                </span>
                <ToggleButton table="vehicles" id={v.id} active={v.active} />
              </li>
            ))}
            {!vehicles?.length && <li className="px-5 py-6 text-sm text-muted">Ajoutez votre première voiture.</li>}
          </ul>
        </Card>
      </div>
    </>
  );
}
