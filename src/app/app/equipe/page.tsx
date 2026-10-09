import type { Metadata } from "next";
import { Badge, Card, CardTitle, PageHeader } from "@/components/app/ui";
import { InstructorForm, VehicleForm } from "@/components/app/team-forms";
import { createClient } from "@/lib/supabase/server";
import { requireStaff } from "@/lib/session";
import { displayPhone } from "@/lib/phone";
import type { Instructor, Vehicle } from "@/lib/types";
import { toggleActive } from "../actions";

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
  await requireStaff();
  const supabase = await createClient();
  const [{ data: instructors }, { data: vehicles }] = await Promise.all([
    supabase.from("instructors").select("*").order("full_name"),
    supabase.from("vehicles").select("*").order("label"),
  ]);

  return (
    <>
      <PageHeader title="Équipe et voitures" description="Le planning refuse de mettre un moniteur ou une voiture sur deux leçons à la fois." />
      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardTitle title="Moniteurs" action={<Badge tone="good">{(instructors ?? []).filter((i) => i.active).length}</Badge>} />
          <div className="border-b border-line p-5">
            <InstructorForm />
          </div>
          <ul className="divide-y divide-line">
            {((instructors ?? []) as Instructor[]).map((i) => (
              <li key={i.id} className="flex items-center justify-between px-5 py-3">
                <span className={i.active ? "" : "opacity-50"}>
                  <span className="block font-semibold">{i.full_name}</span>
                  <span className="text-xs text-muted">{i.phone ? displayPhone(i.phone) : "Sans téléphone"}</span>
                </span>
                <ToggleButton table="instructors" id={i.id} active={i.active} />
              </li>
            ))}
            {!instructors?.length && <li className="px-5 py-6 text-sm text-muted">Ajoutez votre premier moniteur.</li>}
          </ul>
        </Card>

        <Card delay={0.05}>
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
