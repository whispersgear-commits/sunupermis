import { createClient } from "@/lib/supabase/server";
import { requireStaff } from "@/lib/session";
import { periodRange } from "@/lib/periods";
import { METHOD_LABEL, type Payment } from "@/lib/types";

/**
 * Export des encaissements en CSV (s'ouvre dans Excel ou Google Sheets) :
 * pour le comptable ou le bilan du mois.
 */
export async function GET(request: Request) {
  const ctx = await requireStaff();
  const url = new URL(request.url);
  const range = periodRange(url.searchParams.get("periode") ?? undefined);
  const supabase = await createClient();
  let query = supabase.from("payments").select("*, student:students(full_name, phone)").order("paid_at", { ascending: false }).limit(5000);
  if (range.from) query = query.gte("paid_at", `${range.from}T00:00:00Z`);
  if (range.to) query = query.lt("paid_at", `${range.to}T00:00:00Z`);
  const { data } = await query;

  const cell = (v: string | number) => {
    const s = String(v);
    // Échappement CSV, et neutralisation des formules (=, +, -, @) pour Excel.
    const safe = /^[=+\-@]/.test(s) ? `'${s}` : s;
    return /[";\n]/.test(safe) ? `"${safe.replace(/"/g, '""')}"` : safe;
  };
  const rows = ((data ?? []) as (Payment & { student: { full_name: string; phone: string } | null })[]).map((p) =>
    [p.paid_at.slice(0, 10), p.paid_at.slice(11, 16), p.student?.full_name ?? "", p.student?.phone ?? "", p.amount, METHOD_LABEL[p.method], p.reference ?? ""].map(cell).join(";"),
  );
  const csv = "﻿" + ["Date;Heure;Élève;Téléphone;Montant (FCFA);Moyen;Référence", ...rows].join("\r\n");
  const slug = ctx.school.name.normalize("NFD").replace(/[^\w]+/g, "-").replace(/^-|-$/g, "").toLowerCase();
  return new Response(csv, {
    headers: {
      "content-type": "text/csv; charset=utf-8",
      "content-disposition": `attachment; filename="paiements-${slug}-${range.from ?? "tout"}.csv"`,
      "cache-control": "no-store",
    },
  });
}
