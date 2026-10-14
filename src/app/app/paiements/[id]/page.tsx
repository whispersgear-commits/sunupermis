import { redirect } from "next/navigation";

/** Un paiement s'ouvre sur son reçu. */
export default async function PaiementPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  redirect(`/app/paiements/${id}/recu`);
}
