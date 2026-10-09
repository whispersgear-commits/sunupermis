import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { PageHeader } from "@/components/app/ui";
import { StudentForm } from "@/components/app/student-form";
import { requireStaff } from "@/lib/session";
import { createStudent } from "../../actions";

export const metadata: Metadata = { title: "Nouvel élève" };

export default async function NouvelElevePage() {
  await requireStaff();
  return (
    <>
      <Link href="/app/eleves" className="mb-4 inline-flex items-center gap-1.5 text-sm font-semibold text-muted hover:text-ink">
        <ArrowLeft className="h-4 w-4" /> Élèves
      </Link>
      <PageHeader title="Nouvel élève" description="Le forfait est réparti automatiquement en échéances mensuelles." />
      <StudentForm action={createStudent} />
    </>
  );
}
