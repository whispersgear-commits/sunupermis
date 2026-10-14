export type Role = "owner" | "secretary" | "instructor";

export interface School {
  id: string;
  name: string;
  city: string | null;
  phone: string | null;
  address: string | null;
  plan: "essentiel" | "pro" | "multi";
  trial_ends_at: string;
  paid_until: string | null;
  whatsapp_auto: boolean;
  /** Agences déclarées (formule Multi-agences). */
  agencies: string[];
}

export interface Student {
  id: string;
  full_name: string;
  phone: string;
  license: string;
  package_price: number;
  hours_planned: number;
  status: "active" | "code_ok" | "licensed" | "dropped";
  notes: string | null;
  created_at: string;
  file_no: number | null;
  agency: string | null;
}

export interface Balance {
  student_id: string;
  package_price: number;
  paid: number;
  balance: number;
  due_to_date: number;
  driving_lessons_done: number;
}

export interface Instructor {
  id: string;
  full_name: string;
  phone: string | null;
  active: boolean;
  agency?: string | null;
}

export interface Vehicle {
  id: string;
  label: string;
  plate: string | null;
  category: string;
  active: boolean;
  agency?: string | null;
}

export interface Lesson {
  id: string;
  student_id: string;
  instructor_id: string | null;
  vehicle_id: string | null;
  kind: "driving" | "code";
  starts_at: string;
  ends_at: string;
  status: "planned" | "done" | "missed" | "cancelled";
}

export interface Payment {
  id: string;
  student_id: string;
  amount: number;
  method: "cash" | "wave" | "orange_money" | "other";
  reference: string | null;
  paid_at: string;
  receipt_no: number | null;
  receipt_token: string;
  created_by: string | null;
  cancelled_at: string | null;
  cancel_reason: string | null;
}

export interface Installment {
  id: string;
  student_id: string;
  due_date: string;
  amount: number;
  /** Supplément ajouté au forfait (« Heures supplémentaires »…). */
  label?: string | null;
}

export interface Exam {
  id: string;
  student_id: string;
  kind: "code" | "driving";
  exam_date: string;
  result: "pending" | "passed" | "failed";
}

export const STATUS_LABEL: Record<Student["status"], string> = {
  active: "En formation",
  code_ok: "Code obtenu",
  licensed: "Permis obtenu",
  dropped: "Abandon",
};

export const METHOD_LABEL: Record<Payment["method"], string> = {
  cash: "Espèces",
  wave: "Wave",
  orange_money: "Orange Money",
  other: "Autre",
};

export const LESSON_STATUS_LABEL: Record<Lesson["status"], string> = {
  planned: "Prévue",
  done: "Faite",
  missed: "Absent",
  cancelled: "Annulée",
};

export interface Member {
  user_id: string;
  role: Role;
  instructor_id: string | null;
  full_name: string | null;
  email: string | null;
  created_at: string;
}

export interface Invitation {
  id: string;
  token: string;
  role: "secretary" | "instructor";
  instructor_id: string | null;
  label: string;
  created_at: string;
  expires_at: string;
  accepted_at: string | null;
  revoked: boolean;
}

export const ROLE_LABEL: Record<Role, string> = {
  owner: "Propriétaire",
  secretary: "Secrétaire",
  instructor: "Moniteur",
};

export interface Expense {
  id: string;
  spent_on: string;
  category: "fuel" | "salary" | "maintenance" | "rent" | "insurance" | "exam_fees" | "equipment" | "other";
  label: string | null;
  amount: number;
  agency: string | null;
  vehicle_id: string | null;
  created_by: string | null;
  created_at: string;
}

/** Catégories de dépenses, dans l'ordre d'affichage, avec leur couleur. */
export const EXPENSE_CATEGORIES: { key: Expense["category"]; label: string; color: string }[] = [
  { key: "fuel", label: "Carburant", color: "#f59e0b" },
  { key: "salary", label: "Salaires", color: "#0b8a5a" },
  { key: "maintenance", label: "Entretien et réparations", color: "#ef4444" },
  { key: "rent", label: "Loyer", color: "#6366f1" },
  { key: "insurance", label: "Assurance", color: "#0ea5e9" },
  { key: "exam_fees", label: "Frais d'examen", color: "#a855f7" },
  { key: "equipment", label: "Matériel et fournitures", color: "#14b8a6" },
  { key: "other", label: "Autre", color: "#64748b" },
];
export const EXPENSE_LABEL = Object.fromEntries(EXPENSE_CATEGORIES.map((c) => [c.key, c.label])) as Record<Expense["category"], string>;
