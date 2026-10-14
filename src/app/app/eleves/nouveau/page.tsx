import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { PageHeader } from "@/components/app/ui";
import { StudentForm } from "@/components/app/student-form";
import { requireStaff } from "@/lib/session";
import { can } from "@/lib/plans";
import { createStudent } from "../../actions";

export const metadata: Metadata = { title: "Nouvel élève" };

export default async function NouvelElevePage() {
  const ctx = await requireStaff();
  const agencies = can(ctx.school, "agencies") ? ctx.school.agencies ?? [] : [];
  return (
    <>
      <Link href="/app/eleves" className="mb-4 inline-flex items-center gap-1.5 text-sm font-semibold text-muted hover:text-ink">
        <ArrowLeft className="h-4 w-4" /> Élèves
      </Link>
      <PageHeader title="Nouvel élève" description="Le forfait est réparti automatiquement en échéances mensuelles." />
      <StudentForm action={createStudent} agencies={agencies} />
    </>
  );
}
