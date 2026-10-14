import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { PageHeader } from "@/components/app/ui";
import { StudentImport } from "@/components/app/student-import";
import { createClient } from "@/lib/supabase/server";
import { requireStaff } from "@/lib/session";
import { can } from "@/lib/plans";

export const metadata: Metadata = { title: "Importer des élèves" };

export default async function ImporterPage() {
  const ctx = await requireStaff();
  const supabase = await createClient();
  const { data } = await supabase.from("students").select("phone");
  return (
    <>
      <Link href="/app/eleves" className="mb-4 inline-flex items-center gap-1.5 text-sm font-semibold text-muted hover:text-ink">
        <ArrowLeft className="h-4 w-4" /> Élèves
      </Link>
      <PageHeader title="Importer des élèves" description="Reprenez vos élèves depuis Excel en une fois, sans tout retaper." />
      <div className="max-w-4xl">
        <StudentImport existingPhones={(data ?? []).map((s) => s.phone)} agencies={can(ctx.school, "agencies") ? ctx.school.agencies ?? [] : []} />
      </div>
    </>
  );
}
