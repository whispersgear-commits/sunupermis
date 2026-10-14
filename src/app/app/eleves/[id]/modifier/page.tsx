import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { Card, PageHeader } from "@/components/app/ui";
import { StudentEditForm } from "@/components/app/student-edit-form";
import { createClient } from "@/lib/supabase/server";
import { requireStaff } from "@/lib/session";
import { can } from "@/lib/plans";
import { money } from "@/lib/format";
import type { Student } from "@/lib/types";

export const metadata: Metadata = { title: "Modifier l'élève" };

export default async function ModifierElevePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const ctx = await requireStaff();
  const agencies = can(ctx.school, "agencies") ? ctx.school.agencies ?? [] : [];
  const supabase = await createClient();
  const { data } = await supabase.from("students").select("*").eq("id", id).maybeSingle();
  if (!data) notFound();
  const s = data as Student;

  return (
    <>
      <Link href={`/app/eleves/${s.id}`} className="mb-4 inline-flex items-center gap-1.5 text-sm font-semibold text-muted hover:text-ink">
        <ArrowLeft className="h-4 w-4" /> {s.full_name}
      </Link>
      <PageHeader title="Modifier l'élève" description="Coordonnées, type de permis et suivi." />
      <Card className="max-w-2xl p-5 sm:p-6">
        <StudentEditForm student={s} agencies={agencies} />
        <p className="mt-5 border-t border-line pt-4 text-xs text-muted">
          Forfait : {money(s.package_price)}. Le forfait et l'échéancier ne se modifient pas ici, pour ne pas fausser les paiements déjà enregistrés.
        </p>
      </Card>
    </>
  );
}
