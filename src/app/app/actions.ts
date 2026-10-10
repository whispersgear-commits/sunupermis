"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { addMonths, formatISO } from "date-fns";
import { createClient } from "@/lib/supabase/server";
import { requireContext, requireOwner, requireStaff, siteOrigin } from "@/lib/session";
import { PLANS, planPrice, userLimit, type PlanId } from "@/lib/plans";
import { createCheckout, waveConfigured } from "@/lib/wave";
import { whatsappConfigured } from "@/lib/whatsapp-api";
import { sendLessonReminders, sendPaymentReminders } from "@/lib/reminders";
import { normalizePhone } from "@/lib/phone";
import { parseAmount } from "@/lib/format";
import type { FormState } from "@/components/ui/form";

/**
 * Écritures de l'espace auto-école.
 *
 * Chaque action relit le contexte (une action serveur est un point d'entrée
 * HTTP à part entière). La base vérifie elle-même, par RLS, que l'école visée
 * est bien celle de l'utilisateur : `school_id` ne vient jamais du formulaire.
 */

const text = (fd: FormData, k: string) => String(fd.get(k) ?? "").trim();

// ---------------------------------------------------------------------------
// Élèves
// ---------------------------------------------------------------------------

export async function createStudent(_s: FormState, fd: FormData): Promise<FormState> {
  const ctx = await requireStaff();
  const fullName = text(fd, "full_name");
  const phone = normalizePhone(text(fd, "phone"));
  const price = parseAmount(fd.get("package_price"));
  const parts = Math.min(12, Math.max(1, parseAmount(fd.get("installments")) || 1));
  const firstDue = text(fd, "first_due") || formatISO(new Date(), { representation: "date" });

  if (fullName.length < 2) return { error: "Indiquez le nom de l'élève." };
  if (!phone) return { error: "Numéro WhatsApp invalide." };

  const supabase = await createClient();
  const { data: student, error } = await supabase
    .from("students")
    .insert({
      school_id: ctx.school.id,
      full_name: fullName,
      phone,
      license: text(fd, "license") || "B",
      package_price: price,
      hours_planned: parseAmount(fd.get("hours_planned")) || 20,
      notes: text(fd, "notes") || null,
    })
    .select("id")
    .single();
  if (error || !student) return { error: "Enregistrement impossible." };

  // Échéancier : le forfait réparti en parts égales, une par mois. Le reste
  // de la division tombe sur la première échéance, pour que le total soit
  // exact au franc près.
  if (price > 0) {
    const base = Math.floor(price / parts);
    const rest = price - base * parts;
    const rows = Array.from({ length: parts }, (_, i) => ({
      school_id: ctx.school.id,
      student_id: student.id,
      due_date: formatISO(addMonths(new Date(firstDue), i), { representation: "date" }),
      amount: base + (i === 0 ? rest : 0),
    }));
    const { error: scheduleError } = await supabase.from("installments").insert(rows);
    if (scheduleError) return { error: "Élève créé, mais l'échéancier n'a pas pu être enregistré." };
  }

  const initial = parseAmount(fd.get("initial_payment"));
  if (initial > 0) {
    await supabase.from("payments").insert({
      school_id: ctx.school.id,
      student_id: student.id,
      amount: initial,
      method: text(fd, "initial_method") || "cash",
      created_by: ctx.userId,
    });
  }

  revalidatePath("/app", "layout");
  redirect(`/app/eleves/${student.id}?nouveau=1`);
}

/** Coordonnées et suivi d'un élève. Le forfait et l'échéancier ne bougent pas ici. */
export async function updateStudent(_s: FormState, fd: FormData): Promise<FormState> {
  const ctx = await requireStaff();
  const id = text(fd, "student_id");
  const fullName = text(fd, "full_name");
  const phone = normalizePhone(text(fd, "phone"));
  if (fullName.length < 2) return { error: "Indiquez le nom de l'élève." };
  if (!phone) return { error: "Numéro WhatsApp invalide." };
  const license = text(fd, "license");
  const supabase = await createClient();
  const { error } = await supabase
    .from("students")
    .update({
      full_name: fullName,
      phone,
      license: ["A", "B", "C", "D", "E"].includes(license) ? license : "B",
      hours_planned: Math.max(0, parseAmount(fd.get("hours_planned"))),
      notes: text(fd, "notes") || null,
    })
    .eq("id", id)
    .eq("school_id", ctx.school.id);
  if (error) return { error: "Modification impossible." };
  revalidatePath("/app", "layout");
  redirect(`/app/eleves/${id}`);
}

export async function updateStudentStatus(fd: FormData) {
  const ctx = await requireStaff();
  const supabase = await createClient();
  await supabase
    .from("students")
    .update({ status: text(fd, "status") })
    .eq("id", text(fd, "student_id"))
    .eq("school_id", ctx.school.id);
  revalidatePath(`/app/eleves/${text(fd, "student_id")}`);
}

// ---------------------------------------------------------------------------
// Paiements et examens
// ---------------------------------------------------------------------------

export async function addPayment(_s: FormState, fd: FormData): Promise<FormState> {
  const ctx = await requireStaff();
  const amount = parseAmount(fd.get("amount"));
  if (amount <= 0) return { error: "Montant invalide." };
  const method = text(fd, "method");
  if (!["cash", "wave", "orange_money", "other"].includes(method)) return { error: "Moyen de paiement invalide." };

  const supabase = await createClient();
  const { error } = await supabase.from("payments").insert({
    school_id: ctx.school.id,
    student_id: text(fd, "student_id"),
    amount,
    method,
    reference: text(fd, "reference") || null,
    created_by: ctx.userId,
  });
  if (error) return { error: "Paiement non enregistré." };
  revalidatePath("/app", "layout");
  return { success: "Paiement enregistré." };
}

export async function addExam(_s: FormState, fd: FormData): Promise<FormState> {
  const ctx = await requireStaff();
  const date = text(fd, "exam_date");
  if (!date) return { error: "Choisissez une date." };
  const supabase = await createClient();
  const { error } = await supabase.from("exams").insert({
    school_id: ctx.school.id,
    student_id: text(fd, "student_id"),
    kind: text(fd, "kind") === "driving" ? "driving" : "code",
    exam_date: date,
  });
  if (error) return { error: "Examen non enregistré." };
  revalidatePath(`/app/eleves/${text(fd, "student_id")}`);
  return { success: "Examen ajouté." };
}

export async function setExamResult(fd: FormData) {
  const ctx = await requireStaff();
  const supabase = await createClient();
  await supabase
    .from("exams")
    .update({ result: text(fd, "result") })
    .eq("id", text(fd, "exam_id"))
    .eq("school_id", ctx.school.id);
  revalidatePath(`/app/eleves/${text(fd, "student_id")}`);
}

// ---------------------------------------------------------------------------
// Leçons
// ---------------------------------------------------------------------------

export async function createLesson(_s: FormState, fd: FormData): Promise<FormState> {
  const ctx = await requireStaff();
  const date = text(fd, "date");
  const start = text(fd, "start");
  const minutes = Math.min(240, Math.max(30, parseAmount(fd.get("duration")) || 60));
  if (!date || !start) return { error: "Choisissez la date et l'heure." };
  if (!text(fd, "student_id")) return { error: "Choisissez un élève." };

  // Le Sénégal est à UTC+0 toute l'année : l'heure saisie est l'heure UTC.
  const startsAt = new Date(`${date}T${start}:00Z`);
  const endsAt = new Date(startsAt.getTime() + minutes * 60_000);

  const supabase = await createClient();
  const { error } = await supabase.from("lessons").insert({
    school_id: ctx.school.id,
    student_id: text(fd, "student_id"),
    instructor_id: text(fd, "instructor_id") || null,
    vehicle_id: text(fd, "vehicle_id") || null,
    kind: text(fd, "kind") === "code" ? "code" : "driving",
    starts_at: startsAt.toISOString(),
    ends_at: endsAt.toISOString(),
  });
  if (error) {
    if (error.message.includes("instructor_overlap")) return { error: "Ce moniteur a déjà une leçon sur ce créneau." };
    if (error.message.includes("vehicle_overlap")) return { error: "Cette voiture est déjà réservée sur ce créneau." };
    return { error: "Leçon non enregistrée." };
  }
  revalidatePath("/app", "layout");
  return { success: "Leçon planifiée." };
}

export async function markLesson(fd: FormData): Promise<{ error?: string }> {
  const ctx = await requireContext();
  const status = text(fd, "status");
  const supabase = await createClient();
  let error: unknown = null;
  if (status === "cancelled") {
    if (ctx.role === "instructor") return { error: "Seul le bureau peut annuler une leçon." };
    ({ error } = await supabase.from("lessons").update({ status }).eq("id", text(fd, "lesson_id")).eq("school_id", ctx.school.id));
  } else {
    // Passe par la fonction de la base : un moniteur ne peut marquer que ses
    // propres leçons, et seulement « faite » ou « absent ».
    ({ error } = await supabase.rpc("mark_lesson", { lesson: text(fd, "lesson_id"), new_status: status }));
  }
  revalidatePath("/app", "layout");
  return error ? { error: "La leçon n'a pas pu être mise à jour. Réessayez." } : {};
}

// ---------------------------------------------------------------------------
// Équipe, voitures, école
// ---------------------------------------------------------------------------

export async function addInstructor(_s: FormState, fd: FormData): Promise<FormState> {
  const ctx = await requireStaff();
  const name = text(fd, "full_name");
  if (name.length < 2) return { error: "Indiquez le nom du moniteur." };
  const supabase = await createClient();
  const { error } = await supabase.from("instructors").insert({
    school_id: ctx.school.id,
    full_name: name,
    phone: normalizePhone(text(fd, "phone")),
  });
  if (error) return { error: "Moniteur non enregistré." };
  revalidatePath("/app/equipe");
  return { success: "Moniteur ajouté." };
}

export async function addVehicle(_s: FormState, fd: FormData): Promise<FormState> {
  const ctx = await requireStaff();
  const label = text(fd, "label");
  if (!label) return { error: "Indiquez le nom de la voiture." };
  const supabase = await createClient();
  const { error } = await supabase.from("vehicles").insert({
    school_id: ctx.school.id,
    label,
    plate: text(fd, "plate") || null,
    category: text(fd, "category") || "B",
  });
  if (error) return { error: "Voiture non enregistrée." };
  revalidatePath("/app/equipe");
  return { success: "Voiture ajoutée." };
}

export async function toggleActive(fd: FormData) {
  const ctx = await requireStaff();
  const table = text(fd, "table") === "vehicles" ? "vehicles" : "instructors";
  const supabase = await createClient();
  await supabase
    .from(table)
    .update({ active: text(fd, "active") === "1" })
    .eq("id", text(fd, "id"))
    .eq("school_id", ctx.school.id);
  revalidatePath("/app/equipe");
}

export async function updateSchool(_s: FormState, fd: FormData): Promise<FormState> {
  const ctx = await requireContext();
  if (ctx.role !== "owner") return { error: "Réservé au propriétaire de l'auto-école." };
  const name = text(fd, "name");
  if (name.length < 2) return { error: "Nom trop court." };
  const supabase = await createClient();
  const { error } = await supabase
    .from("schools")
    .update({
      name,
      city: text(fd, "city") || null,
      phone: normalizePhone(text(fd, "phone")),
      address: text(fd, "address") || null,
    })
    .eq("id", ctx.school.id);
  if (error) return { error: "Enregistrement impossible." };
  revalidatePath("/app", "layout");
  return { success: "Informations enregistrées." };
}

// ---------------------------------------------------------------------------
// Invitations et équipe (propriétaire)
// ---------------------------------------------------------------------------

export async function createInvitation(_s: FormState, fd: FormData): Promise<FormState> {
  const ctx = await requireOwner();
  const role = text(fd, "role") === "instructor" ? "instructor" : "secretary";
  const label = text(fd, "label");
  if (label.length < 2) return { error: "Indiquez le nom de la personne invitée." };

  const supabase = await createClient();
  const limit = userLimit(ctx.school);
  if (limit !== null) {
    const [{ count: members }, { count: pending }] = await Promise.all([
      supabase.from("memberships").select("user_id", { count: "exact", head: true }).eq("school_id", ctx.school.id),
      supabase
        .from("invitations")
        .select("id", { count: "exact", head: true })
        .eq("school_id", ctx.school.id)
        .is("accepted_at", null)
        .eq("revoked", false)
        .gt("expires_at", new Date().toISOString()),
    ]);
    if ((members ?? 0) + (pending ?? 0) >= limit) {
      return { error: `La formule ${PLANS[ctx.school.plan].name} permet ${limit} compte${limit > 1 ? "s" : ""}. Passez à la formule supérieure pour inviter quelqu'un.` };
    }
  }

  const { error } = await supabase.from("invitations").insert({
    school_id: ctx.school.id,
    role,
    label,
    instructor_id: role === "instructor" ? text(fd, "instructor_id") || null : null,
    created_by: ctx.userId,
  });
  if (error) return { error: "Invitation non créée." };
  revalidatePath("/app/equipe");
  return { success: "Invitation créée. Envoyez le lien par WhatsApp." };
}

export async function revokeInvitation(fd: FormData) {
  const ctx = await requireOwner();
  const supabase = await createClient();
  await supabase.from("invitations").update({ revoked: true }).eq("id", text(fd, "id")).eq("school_id", ctx.school.id);
  revalidatePath("/app/equipe");
}

export async function removeMember(fd: FormData) {
  const ctx = await requireOwner();
  const userId = text(fd, "user_id");
  if (userId === ctx.userId) return;
  const supabase = await createClient();
  await supabase.from("memberships").delete().eq("user_id", userId).eq("school_id", ctx.school.id);
  revalidatePath("/app/equipe");
}

// ---------------------------------------------------------------------------
// Abonnement (paiement Wave)
// ---------------------------------------------------------------------------

export async function startSubscription(_s: FormState, fd: FormData): Promise<FormState> {
  const ctx = await requireOwner();
  if (!waveConfigured()) return { error: "Le paiement en ligne n'est pas encore activé. Contactez-nous sur WhatsApp." };
  const plan = text(fd, "plan") as PlanId;
  if (!(plan in PLANS)) return { error: "Formule inconnue." };
  const months = text(fd, "months") === "12" ? 12 : 1;
  const amount = planPrice(plan, months);
  const origin = await siteOrigin();

  const checkout = await createCheckout({
    amount,
    clientReference: `${ctx.school.id}:${plan}:${months}`,
    successUrl: `${origin}/app/abonnement?paiement=ok`,
    errorUrl: `${origin}/app/abonnement?paiement=erreur`,
  });
  if (!checkout.ok) return { error: checkout.error };

  // La ligne « en attente » porte l'identifiant de session Wave : c'est par
  // lui, et seulement par lui, que le webhook confirmera le paiement.
  const supabase = await createClient();
  const { error } = await supabase.from("subscription_payments").insert({
    school_id: ctx.school.id,
    plan,
    months,
    amount,
    provider_ref: checkout.id,
    created_by: ctx.userId,
  });
  if (error) return { error: "Paiement non enregistré. Réessayez." };
  redirect(checkout.url);
}

// ---------------------------------------------------------------------------
// WhatsApp automatique
// ---------------------------------------------------------------------------

export async function setWhatsappAuto(fd: FormData) {
  const ctx = await requireOwner();
  const supabase = await createClient();
  await supabase.from("schools").update({ whatsapp_auto: text(fd, "on") === "1" }).eq("id", ctx.school.id);
  revalidatePath("/app", "layout");
}

export async function sendRemindersNow(_s: FormState, fd: FormData): Promise<FormState> {
  const ctx = await requireStaff();
  if (!whatsappConfigured()) return { error: "L'envoi automatique WhatsApp n'est pas encore configuré." };
  const supabase = await createClient();
  const date = text(fd, "date") || new Date(Date.now() + 86_400_000).toISOString().slice(0, 10);
  // « payments=only » : relances de paiement seules (page Paiements).
  const none = { sent: 0, skipped: 0, failed: 0 };
  const mode = text(fd, "payments");
  const lessons = mode === "only" ? none : await sendLessonReminders(supabase, ctx.school, date);
  const payments = mode === "1" || mode === "only" ? await sendPaymentReminders(supabase, ctx.school) : none;
  revalidatePath("/app");
  const sent = lessons.sent + payments.sent;
  const failed = lessons.failed + payments.failed;
  if (failed && !sent) return { error: `${failed} message${failed > 1 ? "s" : ""} non envoyé${failed > 1 ? "s" : ""}. Vérifiez la configuration WhatsApp.` };
  return { success: `${sent} message${sent > 1 ? "s" : ""} envoyé${sent > 1 ? "s" : ""}${lessons.skipped ? ` · ${lessons.skipped} déjà envoyé${lessons.skipped > 1 ? "s" : ""}` : ""}${failed ? ` · ${failed} en échec` : ""}.` };
}
