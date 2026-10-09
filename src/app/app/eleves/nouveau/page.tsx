import type { Metadata } from "next";
import { PageHeader } from "@/components/app/ui";
import { StudentForm } from "@/components/app/student-form";
import { requireStaff } from "@/lib/session";
import { createStudent } from "../../actions";

export const metadata: Metadata = { title: "Nouvel élève" };

export default async function NouvelElevePage() {
  await requireStaff();
  return (
    <>
      <PageHeader title="Nouvel élève" description="Le forfait est réparti automatiquement en échéances mensuelles." />
      <StudentForm action={createStudent} />
    </>
  );
}
