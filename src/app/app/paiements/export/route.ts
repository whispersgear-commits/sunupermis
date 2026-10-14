import { createClient } from "@/lib/supabase/server";
import { requireStaff } from "@/lib/session";
import { periodRange } from "@/lib/periods";
import { METHOD_LABEL, type Payment } from "@/lib/types";
import { receiptLabel } from "@/lib/receipts";
import { can } from "@/lib/plans";

/**
 * Export des encaissements en CSV (s'ouvre dans Excel ou Google Sheets) :
 * pour le comptable ou le bilan du mois.
 */
export async function GET(request: Request) {
  const ctx = await requireStaff();
  const url = new URL(request.url);
  // Export réservé aux formules Pro et Multi-agences.
  if (!can(ctx.school, "export")) return Response.redirect(new URL("/app/abonnement?fonction=export", url), 303);
  const multi = can(ctx.school, "agencies") && (ctx.school.agencies ?? []).length > 0;
  const agency = multi ? url.searchParams.get("agence") : null;
  const range = periodRange(url.searchParams.get("periode") ?? undefined);
  const supabase = await createClient();
  let query = supabase.from("payments").select("*, student:students!inner(full_name, phone, agency)").order("paid_at", { ascending: false }).limit(5000);
  if (range.from) query = query.gte("paid_at", `${range.from}T00:00:00Z`);
  if (range.to) query = query.lt("paid_at", `${range.to}T00:00:00Z`);
  if (agency) query = query.eq("student.agency", agency);
  const { data } = await query;

  const cell = (v: string | number) => {
    const s = String(v);
    // Échappement CSV, et neutralisation des formules (=, +, -, @) pour Excel.
    const safe = /^[=+\-@]/.test(s) ? `'${s}` : s;
    return /[";\n]/.test(safe) ? `"${safe.replace(/"/g, '""')}"` : safe;
  };
  const rows = ((data ?? []) as (Payment & { student: { full_name: string; phone: string; agency: string | null } | null })[]).map((p) =>
    [
      ...(multi ? [p.student?.agency ?? ""] : []),
      receiptLabel(p.receipt_no, p.paid_at),
      p.paid_at.slice(0, 10),
      p.paid_at.slice(11, 16),
      p.student?.full_name ?? "",
      p.student?.phone ?? "",
      p.amount,
      METHOD_LABEL[p.method],
      p.reference ?? "",
      p.cancelled_at ? `Annulé : ${p.cancel_reason ?? ""}` : "Valide",
    ]
      .map(cell)
      .join(";"),
  );
  const csv = "﻿" + [`${multi ? "Agence;" : ""}N° reçu;Date;Heure;Élève;Téléphone;Montant (FCFA);Moyen;Référence;Statut`, ...rows].join("\r\n");
  const slug = ctx.school.name.normalize("NFD").replace(/[^\w]+/g, "-").replace(/^-|-$/g, "").toLowerCase();
  return new Response(csv, {
    headers: {
      "content-type": "text/csv; charset=utf-8",
      "content-disposition": `attachment; filename="paiements-${slug}${agency ? `-${agency.normalize("NFD").replace(/[^\w]+/g, "-").toLowerCase()}` : ""}-${range.from ?? "tout"}.csv"`,
      "cache-control": "no-store",
    },
  });
}
