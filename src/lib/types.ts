export type Role = "owner" | "secretary" | "instructor";

export interface School {
  id: string;
  name: string;
  city: string | null;
  phone: string | null;
  address: string | null;
  plan: "essentiel" | "pro" | "multi";
  trial_ends_at: string;
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
}

export interface Vehicle {
  id: string;
  label: string;
  plate: string | null;
  category: string;
  active: boolean;
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
}

export interface Installment {
  id: string;
  student_id: string;
  due_date: string;
  amount: number;
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
