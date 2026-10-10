import Link from "next/link";
import { ChevronRight } from "lucide-react";
import { money } from "@/lib/format";
import { receiptLabel } from "@/lib/receipts";
import { METHOD_LABEL, type Payment } from "@/lib/types";
import { cn } from "@/lib/utils";
import { Avatar, Badge } from "./ui";

export const METHOD_COLOR: Record<Payment["method"], string> = { wave: "bg-sky-500", orange_money: "bg-orange-500", cash: "bg-brand-500", other: "bg-slate-400" };

/** Une ligne d'encaissement : touchée, elle ouvre le reçu. */
export function PaymentRow({ p, by }: { p: Payment & { student: { id: string; full_name: string } | null }; by?: string | null }) {
  const cancelled = Boolean(p.cancelled_at);
  return (
    <Link href={`/app/paiements/${p.id}/recu`} className="flex items-center gap-3 px-4 py-3 transition hover:bg-bg sm:px-5">
      <Avatar name={p.student?.full_name ?? "?"} size="sm" />
      <div className="min-w-0 flex-1">
        <p className={cn("truncate font-semibold", cancelled && "text-muted line-through")}>{p.student?.full_name ?? "Élève supprimé"}</p>
        <p className="flex items-center gap-1.5 truncate text-xs text-muted">
          <span className={cn("h-2 w-2 shrink-0 rounded-full", METHOD_COLOR[p.method])} />
          <span className="font-mono">{receiptLabel(p.receipt_no, p.paid_at).slice(9)}</span> · {METHOD_LABEL[p.method]} · {p.paid_at.slice(11, 16)}
          {by ? ` · ${by}` : ""}
        </p>
      </div>
      {cancelled ? <Badge tone="bad">Annulé</Badge> : null}
      <span className={cn("shrink-0 font-bold tabular-nums", cancelled ? "text-muted line-through" : "text-brand-700")}>+{money(p.amount)}</span>
      <ChevronRight className="hidden h-4 w-4 shrink-0 text-muted sm:block" />
    </Link>
  );
}
