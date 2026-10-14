"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { addMonths, formatISO } from "date-fns";
import { createClient } from "@/lib/supabase/server";
import { requireContext, requireOwner, requireStaff } from "@/lib/session";
import { FEATURE_INFO, PLANS, can, userLimit, type Feature } from "@/lib/plans";
import { whatsappConfigured } from "@/lib/whatsapp-api";
import { sendLessonReminders, sendPaymentReminders } from "@/lib/reminders";
import { normalizePhone } from "@/lib/phone";
import { groupDigits, parseAmount } from "@/lib/format";
import type { FormState } from "@/components/ui/form";

/**
 * Écritures de l'espace auto-école.
 *
 * Chaque action relit le contexte (une action serveur est un point d'entrée
 * HTTP à part entière). La base vérifie elle-même, par RLS, que l'école visée
 * est bien celle de l'utilisateur : `school_id` ne vient jamais du formulaire.
 */

const text = (fd: FormData, k: string) => String(fd.get(k) ?? "").trim();

/** Message quand la formule n'inclut pas la fonction demandée. */
const notInPlan = (f: Feature) => `${FEATURE_INFO[f].label} : disponible avec la formule ${PLANS[FEATURE_INFO[f].plan].name}.`;

/** Agence choisie dans le formulaire, seulement si elle existe pour l'école. */
function agencyOf(school: { agencies?: string[] | null; plan: "essentiel" | "pro" | "multi"; trial_ends_at: string; paid_until: string | null }, fd: FormData): string | null {
  const a = String(fd.get("agency") ?? "").trim();
  return can(school, "agencies") && (school.agencies ?? []).includes(a) ? a : null;
}

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
  if (parseAmount(fd.get("initial_payment")) > price) return { error: "Le premier versement dépasse le prix du forfait." };

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
      agency: agencyOf(ctx.school, fd),
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
      ...(fd.has("agency") ? { agency: agencyOf(ctx.school, fd) } : {}),
    })
    .eq("id", id)
    .eq("school_id", ctx.school.id);
  if (error) return { error: "Modification impossible." };
  revalidatePath("/app", "layout");
  redirect(`/app/eleves/${id}`);
}

/**
 * Supplément au forfait (heures en plus, nouvelle présentation à l'examen…) :
 * le forfait augmente et une échéance du même montant est créée, due
 * aujourd'hui, avec son libellé.
 */
export async function addSupplement(_s: FormState, fd: FormData): Promise<FormState> {
  const ctx = await requireStaff();
  const id = text(fd, "student_id");
  const amount = parseAmount(fd.get("amount"));
  const label = text(fd, "label").slice(0, 80);
  if (amount <= 0) return { error: "Montant invalide." };
  if (label.length < 2) return { error: "Indiquez le motif du supplément." };
  const supabase = await createClient();
  const { data: student } = await supabase.from("students").select("package_price").eq("id", id).eq("school_id", ctx.school.id).maybeSingle();
  if (!student) return { error: "Élève introuvable." };
  const { error } = await supabase
    .from("students")
    .update({ package_price: student.package_price + amount })
    .eq("id", id)
    .eq("school_id", ctx.school.id);
  if (error) return { error: "Supplément non enregistré." };
  const { error: dueError } = await supabase.from("installments").insert({
    school_id: ctx.school.id,
    student_id: id,
    due_date: formatISO(new Date(), { representation: "date" }),
    amount,
    label,
  });
  if (dueError) {
    // On remet le forfait comme avant : pas de forfait sans échéance.
    await supabase.from("students").update({ package_price: student.package_price }).eq("id", id).eq("school_id", ctx.school.id);
    return { error: "Supplément non enregistré." };
  }
  revalidatePath("/app", "layout");
  return { success: `Supplément ajouté : ${label} · ${groupDigits(amount)} FCFA.` };
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
  // Pas plus que le reste à payer : une erreur de frappe (un zéro de trop)
  // fausserait la caisse. Un supplément s'ajoute d'abord au forfait.
  const { data: balance } = await supabase.from("student_balances").select("balance").eq("student_id", text(fd, "student_id")).maybeSingle();
  if (!balance) return { error: "Choisissez un élève." };
  if (balance.balance <= 0) return { error: "Cet élève a déjà tout réglé. Pour un nouveau frais, ajoutez d'abord un supplément sur sa fiche." };
  if (amount > balance.balance) {
    return { error: `Le montant dépasse le reste à payer (${groupDigits(balance.balance)} FCFA). Pour un frais en plus, ajoutez d'abord un supplément sur la fiche de l'élève.` };
  }
  // Numéro de reçu, date et encaisseur sont fixés par la base.
  const { data, error } = await supabase
    .from("payments")
    .insert({
      school_id: ctx.school.id,
      student_id: text(fd, "student_id"),
      amount,
      method,
      reference: text(fd, "reference") || null,
    })
    .select("id, receipt_no")
    .single();
  if (error || !data) return { error: "Paiement non enregistré." };
  revalidatePath("/app", "layout");
  return {
    success: `Paiement enregistré · reçu n° ${String(data.receipt_no).padStart(4, "0")}`,
    link: { label: "Voir le reçu", href: `/app/paiements/${data.id}/recu` },
  };
}

/** Annulation d'un paiement : propriétaire seulement, motif obligatoire, trace conservée. */
export async function cancelPayment(_s: FormState, fd: FormData): Promise<FormState> {
  await requireOwner();
  const reason = text(fd, "reason");
  if (reason.length < 3) return { error: "Indiquez le motif de l'annulation." };
  const supabase = await createClient();
  const { error } = await supabase.rpc("cancel_payment", { payment: text(fd, "payment_id"), reason });
  if (error) return { error: error.message.includes("déjà") ? "Ce paiement est déjà annulé." : "Annulation impossible." };
  revalidatePath("/app", "layout");
  return { success: "Paiement annulé. Le reçu porte désormais la mention « ANNULÉ »." };
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
    if (error.message.includes("student_overlap")) return { error: "Cet élève a déjà une leçon sur ce créneau." };
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
    agency: agencyOf(ctx.school, fd),
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
    agency: agencyOf(ctx.school, fd),
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
// WhatsApp automatique
// ---------------------------------------------------------------------------

export async function setWhatsappAuto(fd: FormData) {
  const ctx = await requireOwner();
  const on = text(fd, "on") === "1";
  // Les rappels automatiques sont réservés aux formules Pro et Multi-agences.
  if (on && !can(ctx.school, "autoReminders")) return;
  const supabase = await createClient();
  await supabase.from("schools").update({ whatsapp_auto: on }).eq("id", ctx.school.id);
  revalidatePath("/app", "layout");
}

// ---------------------------------------------------------------------------
// Agences (formule Multi-agences)
// ---------------------------------------------------------------------------

export async function addAgency(_s: FormState, fd: FormData): Promise<FormState> {
  const ctx = await requireOwner();
  if (!can(ctx.school, "agencies")) return { error: notInPlan("agencies") };
  const name = text(fd, "name").replace(/\s+/g, " ").slice(0, 40);
  if (name.length < 2) return { error: "Indiquez le nom de l'agence." };
  const list = ctx.school.agencies ?? [];
  if (list.some((a) => a.toLowerCase() === name.toLowerCase())) return { error: "Cette agence existe déjà." };
  if (list.length >= 20) return { error: "20 agences au plus." };
  const supabase = await createClient();
  const { error } = await supabase.from("schools").update({ agencies: [...list, name] }).eq("id", ctx.school.id);
  if (error) return { error: "Agence non enregistrée." };
  // Première agence : les élèves existants y sont rattachés.
  if (list.length === 0) {
    await Promise.all(
      (["students", "instructors", "vehicles", "expenses"] as const).map((t) => supabase.from(t).update({ agency: name }).eq("school_id", ctx.school.id).is("agency", null)),
    );
  }
  revalidatePath("/app", "layout");
  return { success: `Agence « ${name} » ajoutée.` };
}

export async function removeAgency(fd: FormData) {
  const ctx = await requireOwner();
  if (!can(ctx.school, "agencies")) return;
  const name = text(fd, "name");
  const supabase = await createClient();
  await supabase.from("schools").update({ agencies: (ctx.school.agencies ?? []).filter((a) => a !== name) }).eq("id", ctx.school.id);
  // Les élèves de l'agence retirée restent, sans agence.
  await Promise.all(
    (["students", "instructors", "vehicles", "expenses"] as const).map((t) => supabase.from(t).update({ agency: null }).eq("school_id", ctx.school.id).eq("agency", name)),
  );
  revalidatePath("/app", "layout");
}

export async function sendRemindersNow(_s: FormState, fd: FormData): Promise<FormState> {
  const ctx = await requireStaff();
  if (!can(ctx.school, "autoReminders")) return { error: notInPlan("autoReminders") };
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

// ---------------------------------------------------------------------------
// Import d'élèves (fichier Excel ou CSV, lu dans le navigateur)
// ---------------------------------------------------------------------------

export interface ImportRow {
  full_name: string;
  phone: string;
  license?: string;
  price?: number;
  paid?: number;
  hours?: number;
  agency?: string;
  notes?: string;
}

/**
 * Enregistre les élèves d'un fichier. Tout est revérifié ici : le navigateur
 * a déjà prévenu des erreurs, mais seul le serveur fait foi. Les numéros
 * déjà inscrits sont ignorés (pas de doublon si on importe deux fois).
 * Ce qui a déjà été payé devient un paiement « reprise », avec son reçu.
 */
export async function importStudents(rows: ImportRow[]): Promise<{ error?: string; created?: number; skipped?: number }> {
  const ctx = await requireStaff();
  if (!Array.isArray(rows) || rows.length === 0) return { error: "Aucun élève à importer." };
  if (rows.length > 500) return { error: "500 élèves au plus par fichier." };
  const supabase = await createClient();
  const { data: existing } = await supabase.from("students").select("phone");
  const seen = new Set((existing ?? []).map((s) => s.phone));
  const agencies = can(ctx.school, "agencies") ? ctx.school.agencies ?? [] : [];

  const clean: (ImportRow & { phone: string })[] = [];
  let skipped = 0;
  for (const r of rows) {
    const name = String(r.full_name ?? "").trim().replace(/\s+/g, " ").slice(0, 120);
    const phone = normalizePhone(String(r.phone ?? ""));
    if (name.length < 2 || !phone || seen.has(phone)) {
      skipped++;
      continue;
    }
    seen.add(phone);
    const price = Math.max(0, Math.round(Number(r.price) || 0));
    const license = String(r.license ?? "B").trim().toUpperCase().slice(0, 1);
    const agency = agencies.includes(String(r.agency ?? "").trim()) ? String(r.agency).trim() : agencies[0];
    clean.push({
      full_name: name,
      phone,
      license: ["A", "B", "C", "D", "E"].includes(license) ? license : "B",
      price,
      paid: Math.min(price, Math.max(0, Math.round(Number(r.paid) || 0))),
      hours: Math.min(200, Math.max(0, Math.round(Number(r.hours) || 20))),
      agency,
      notes: r.notes ? String(r.notes).slice(0, 500) : undefined,
    });
  }
  if (clean.length === 0) return { error: "Aucun élève valable : noms ou numéros manquants, ou déjà inscrits.", skipped };

  const { data: created, error } = await supabase
    .from("students")
    .insert(
      clean.map((r) => ({
        school_id: ctx.school.id,
        full_name: r.full_name,
        phone: r.phone,
        license: r.license,
        package_price: r.price,
        hours_planned: r.hours,
        notes: r.notes ?? null,
        agency: r.agency ?? null,
      })),
    )
    .select("id, phone");
  if (error || !created) return { error: "Import impossible. Vérifiez le fichier et réessayez." };

  // Ce qui a déjà été payé avant SunuPermis : un paiement « reprise » par élève.
  const idOf = new Map(created.map((s) => [s.phone, s.id]));
  const payments = clean
    .filter((r) => (r.paid ?? 0) > 0 && idOf.has(r.phone))
    .map((r) => ({ school_id: ctx.school.id, student_id: idOf.get(r.phone)!, amount: r.paid!, method: "other", reference: "Reprise à l'import" }));
  if (payments.length) await supabase.from("payments").insert(payments);

  revalidatePath("/app", "layout");
  return { created: created.length, skipped };
}

// ---------------------------------------------------------------------------
// Dépenses
// ---------------------------------------------------------------------------

const EXPENSE_KEYS = ["fuel", "salary", "maintenance", "rent", "insurance", "exam_fees", "equipment", "other"];

export async function addExpense(_s: FormState, fd: FormData): Promise<FormState> {
  const ctx = await requireStaff();
  const amount = parseAmount(fd.get("amount"));
  const category = text(fd, "category");
  const date = text(fd, "spent_on") || formatISO(new Date(), { representation: "date" });
  if (amount <= 0) return { error: "Montant invalide." };
  if (!EXPENSE_KEYS.includes(category)) return { error: "Choisissez une catégorie." };
  if (date > formatISO(new Date(), { representation: "date" })) return { error: "La date ne peut pas être dans le futur." };
  const supabase = await createClient();
  const { error } = await supabase.from("expenses").insert({
    school_id: ctx.school.id,
    spent_on: date,
    category,
    amount,
    label: text(fd, "label").slice(0, 120) || null,
    vehicle_id: text(fd, "vehicle_id") || null,
    agency: agencyOf(ctx.school, fd),
  });
  if (error) return { error: "Dépense non enregistrée." };
  revalidatePath("/app", "layout");
  return { success: `Dépense enregistrée · ${groupDigits(amount)} FCFA.` };
}

/** Suppression d'une dépense saisie par erreur : propriétaire seulement. */
export async function deleteExpense(fd: FormData) {
  const ctx = await requireOwner();
  const supabase = await createClient();
  await supabase.from("expenses").delete().eq("id", text(fd, "expense_id")).eq("school_id", ctx.school.id);
  revalidatePath("/app", "layout");
}

/** Change l'agence d'un moniteur ou d'une voiture (formule Multi-agences). */
export async function setResourceAgency(fd: FormData) {
  const ctx = await requireStaff();
  const table = text(fd, "table") === "vehicles" ? "vehicles" : "instructors";
  const supabase = await createClient();
  await supabase.from(table).update({ agency: agencyOf(ctx.school, fd) }).eq("id", text(fd, "id")).eq("school_id", ctx.school.id);
  revalidatePath("/app", "layout");
}
