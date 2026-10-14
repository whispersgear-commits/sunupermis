import { NextResponse } from "next/server";
import { timingSafeEqual } from "crypto";
import { createAdminClient } from "@/lib/supabase/admin";
import { accessOf, can } from "@/lib/plans";
import { sendLessonReminders, sendPaymentReminders } from "@/lib/reminders";
import { whatsappConfigured } from "@/lib/whatsapp-api";
import type { School } from "@/lib/types";

/**
 * Rappels du soir, appelés chaque jour à 18 h (heure de Dakar) par la tâche
 * planifiée Netlify (`netlify/functions/rappels-quotidiens.mts`).
 *
 * Protégé par un secret partagé : sans lui, n'importe qui pourrait
 * déclencher des envois en masse.
 */
export const dynamic = "force-dynamic";

function authorized(header: string | null): boolean {
  const secret = process.env.CRON_SECRET;
  if (!secret || !header) return false;
  const a = Buffer.from(header);
  const b = Buffer.from(`Bearer ${secret}`);
  return a.length === b.length && timingSafeEqual(a, b);
}

export async function POST(request: Request) {
  if (!authorized(request.headers.get("authorization"))) {
    return NextResponse.json({ error: "non autorisé" }, { status: 401 });
  }
  if (!whatsappConfigured() || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
    return NextResponse.json({ skipped: "WhatsApp ou clé de service non configurés" });
  }

  const db = createAdminClient();
  const { data: schools } = await db.from("schools").select("*").eq("whatsapp_auto", true);
  const tomorrow = new Date(Date.now() + 86_400_000).toISOString().slice(0, 10);

  const results = [];
  for (const school of (schools ?? []) as School[]) {
    if (!accessOf(school).active || !can(school, "autoReminders")) continue;
    const lessons = await sendLessonReminders(db, school, tomorrow);
    const payments = await sendPaymentReminders(db, school);
    results.push({ school: school.id, lessons, payments });
  }
  return NextResponse.json({ schools: results.length, results });
}
