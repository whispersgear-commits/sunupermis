import type { SupabaseClient } from "@supabase/supabase-js";
import { money, time, day } from "./format";
import { sendTemplate, TEMPLATES } from "./whatsapp-api";

/**
 * Rappels WhatsApp automatiques, pour une école.
 *
 * Utilisé par le bouton « Envoyer les rappels » (client de l'utilisateur
 * connecté, soumis à RLS) et par la tâche planifiée du soir (client de
 * service, une école à la fois). Le journal `message_log` porte un index
 * unique par leçon : même lancés deux fois, les rappels ne partent qu'une.
 */

export interface ReminderReport {
  sent: number;
  skipped: number;
  failed: number;
}

const first = (name: string) => name.trim().split(/\s+/)[0];

export async function sendLessonReminders(db: SupabaseClient, school: { id: string; name: string }, dateIso: string): Promise<ReminderReport> {
  const next = new Date(`${dateIso}T00:00:00Z`);
  next.setUTCDate(next.getUTCDate() + 1);

  const { data: lessons } = await db
    .from("lessons")
    .select("id, starts_at, student:students(id, full_name, phone), instructor:instructors(full_name)")
    .eq("school_id", school.id)
    .eq("status", "planned")
    .gte("starts_at", `${dateIso}T00:00:00Z`)
    .lt("starts_at", next.toISOString());

  const report: ReminderReport = { sent: 0, skipped: 0, failed: 0 };

  for (const lesson of (lessons ?? []) as unknown as {
    id: string;
    starts_at: string;
    student: { id: string; full_name: string; phone: string } | null;
    instructor: { full_name: string } | null;
  }[]) {
    if (!lesson.student) continue;

    // On réserve la ligne du journal AVANT d'envoyer : si elle existe déjà
    // (index unique), ce rappel est déjà parti ou en cours.
    const { data: log, error } = await db
      .from("message_log")
      .insert({ school_id: school.id, kind: "lesson_reminder", lesson_id: lesson.id, student_id: lesson.student.id, phone: lesson.student.phone })
      .select("id")
      .single();
    if (error || !log) {
      report.skipped += 1;
      continue;
    }

    const result = await sendTemplate(lesson.student.phone, TEMPLATES.lesson(), [
      first(lesson.student.full_name),
      `${day(lesson.starts_at)} à ${time(lesson.starts_at)}`,
      lesson.instructor?.full_name ?? "votre moniteur",
      school.name,
    ]);
    await db
      .from("message_log")
      .update(result.ok ? { status: "sent", provider_id: result.id } : { status: "failed", error: result.error })
      .eq("id", log.id);
    if (result.ok) report.sent += 1;
    else report.failed += 1;
  }
  return report;
}

/** Relance des retards de paiement, au plus une fois par semaine et par élève. */
export async function sendPaymentReminders(db: SupabaseClient, school: { id: string; name: string }): Promise<ReminderReport> {
  const report: ReminderReport = { sent: 0, skipped: 0, failed: 0 };

  const [{ data: balances }, { data: students }, { data: recent }] = await Promise.all([
    db.from("student_balances").select("*").eq("school_id", school.id),
    db.from("students").select("id, full_name, phone, status").eq("school_id", school.id).in("status", ["active", "code_ok"]),
    db
      .from("message_log")
      .select("student_id")
      .eq("school_id", school.id)
      .eq("kind", "payment_reminder")
      .gte("created_at", new Date(Date.now() - 7 * 86_400_000).toISOString()),
  ]);

  const recentlyReminded = new Set((recent ?? []).map((r) => r.student_id));
  const byId = new Map((students ?? []).map((s) => [s.id, s]));

  for (const b of (balances ?? []) as { student_id: string; balance: number; paid: number; due_to_date: number }[]) {
    const late = Math.min(b.balance, b.due_to_date - b.paid);
    const student = byId.get(b.student_id);
    if (late <= 0 || !student) continue;
    if (recentlyReminded.has(student.id)) {
      report.skipped += 1;
      continue;
    }

    const { data: log } = await db
      .from("message_log")
      .insert({ school_id: school.id, kind: "payment_reminder", student_id: student.id, phone: student.phone })
      .select("id")
      .single();
    if (!log) {
      report.failed += 1;
      continue;
    }
    const result = await sendTemplate(student.phone, TEMPLATES.payment(), [first(student.full_name), money(late), school.name]);
    await db
      .from("message_log")
      .update(result.ok ? { status: "sent", provider_id: result.id } : { status: "failed", error: result.error })
      .eq("id", log.id);
    if (result.ok) report.sent += 1;
    else report.failed += 1;
  }
  return report;
}
