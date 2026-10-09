"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { addMonths, formatISO } from "date-fns";
import { createClient } from "@/lib/supabase/server";
import { requireContext, requireStaff } from "@/lib/session";
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
    await supabase.from("installments").insert(rows);
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

export async function markLesson(fd: FormData) {
  await requireContext();
  const status = text(fd, "status");
  const supabase = await createClient();
  if (status === "cancelled") {
    await supabase.from("lessons").update({ status }).eq("id", text(fd, "lesson_id"));
  } else {
    // Passe par la fonction de la base : un moniteur ne peut marquer que ses
    // propres leçons, et seulement « faite » ou « absent ».
    await supabase.rpc("mark_lesson", { lesson: text(fd, "lesson_id"), new_status: status });
  }
  revalidatePath("/app", "layout");
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
