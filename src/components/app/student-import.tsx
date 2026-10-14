"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { AlertTriangle, CheckCircle2, Download, FileSpreadsheet, Loader2, Upload } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { groupDigits } from "@/lib/format";
import { normalizePhone } from "@/lib/phone";
import { importStudents, type ImportRow } from "@/app/app/actions";

/**
 * Import d'élèves depuis Excel ou un CSV. Le fichier est lu dans le
 * navigateur : on montre ce qui sera importé, ligne par ligne, avant
 * d'envoyer quoi que ce soit.
 */

type Field = keyof ImportRow;

const COLUMNS: { field: Field; label: string; aliases: string[] }[] = [
  { field: "full_name", label: "Nom complet", aliases: ["nom", "nom complet", "eleve", "élève", "prenom et nom", "name"] },
  { field: "phone", label: "Téléphone", aliases: ["telephone", "téléphone", "tel", "tél", "numero", "numéro", "whatsapp", "phone", "contact"] },
  { field: "license", label: "Permis", aliases: ["permis", "categorie", "catégorie", "type de permis"] },
  { field: "price", label: "Prix du forfait", aliases: ["prix", "forfait", "prix du forfait", "montant", "tarif"] },
  { field: "paid", label: "Déjà payé", aliases: ["deja paye", "déjà payé", "paye", "payé", "verse", "versé", "avance", "acompte"] },
  { field: "hours", label: "Leçons prévues", aliases: ["lecons", "leçons", "lecons prevues", "leçons prévues", "heures", "heures de conduite"] },
  { field: "agency", label: "Agence", aliases: ["agence", "site", "succursale"] },
  { field: "notes", label: "Notes", aliases: ["notes", "note", "remarque", "remarques", "observations"] },
];

const fold = (s: string) =>
  s
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9 ]/g, " ")
    .replace(/\s+/g, " ")
    .trim();

const toNumber = (v: unknown) => Number(String(v ?? "").replace(/[^\d]/g, "")) || 0;

/** CSV séparé par « ; » ou « , », avec guillemets. */
function parseCsv(text: string): string[][] {
  const firstLine = text.split(/\r?\n/)[0] ?? "";
  const sep = (firstLine.match(/;/g)?.length ?? 0) >= (firstLine.match(/,/g)?.length ?? 0) ? ";" : ",";
  const rows: string[][] = [];
  let row: string[] = [];
  let cell = "";
  let quoted = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (quoted) {
      if (c === '"' && text[i + 1] === '"') {
        cell += '"';
        i++;
      } else if (c === '"') quoted = false;
      else cell += c;
    } else if (c === '"') quoted = true;
    else if (c === sep) {
      row.push(cell);
      cell = "";
    } else if (c === "\n" || c === "\r") {
      if (c === "\r" && text[i + 1] === "\n") i++;
      row.push(cell);
      rows.push(row);
      row = [];
      cell = "";
    } else cell += c;
  }
  if (cell || row.length) {
    row.push(cell);
    rows.push(row);
  }
  return rows.filter((r) => r.some((x) => x.trim()));
}

type Checked = ImportRow & { line: number; problems: string[] };

function toRows(table: unknown[][], existingPhones: Set<string>): Checked[] {
  if (table.length === 0) return [];
  // En-têtes reconnus par leur nom ; sinon, les colonnes du modèle dans l'ordre.
  const header = table[0].map((h) => fold(String(h ?? "")));
  const index = new Map<Field, number>();
  for (const col of COLUMNS) {
    const i = header.findIndex((h) => col.aliases.map(fold).includes(h));
    if (i >= 0) index.set(col.field, i);
  }
  const hasHeader = index.has("full_name") || index.has("phone");
  if (!hasHeader) COLUMNS.forEach((c, i) => index.set(c.field, i));
  const body = hasHeader ? table.slice(1) : table;
  const seen = new Set<string>();
  return body.map((cells, n) => {
    const get = (f: Field) => (index.has(f) ? cells[index.get(f)!] : undefined);
    const row: Checked = {
      line: n + (hasHeader ? 2 : 1),
      full_name: String(get("full_name") ?? "").trim(),
      phone: String(get("phone") ?? "").trim(),
      license: String(get("license") ?? "B").trim() || "B",
      price: toNumber(get("price")),
      paid: toNumber(get("paid")),
      hours: toNumber(get("hours")) || 20,
      agency: String(get("agency") ?? "").trim() || undefined,
      notes: String(get("notes") ?? "").trim() || undefined,
      problems: [],
    };
    const phone = normalizePhone(row.phone);
    if (row.full_name.length < 2) row.problems.push("nom manquant");
    if (!phone) row.problems.push("numéro invalide");
    else if (existingPhones.has(phone)) row.problems.push("déjà inscrit");
    else if (seen.has(phone)) row.problems.push("en double dans le fichier");
    if (phone) seen.add(phone);
    if ((row.paid ?? 0) > (row.price ?? 0)) row.problems.push("payé > forfait");
    return row;
  });
}

function downloadTemplate() {
  const lines = [
    COLUMNS.map((c) => c.label).join(";"),
    "Awa Diop;77 123 45 67;B;250000;100000;20;;Disponible le soir",
    "Moussa Ndiaye;78 765 43 21;B;250000;0;20;;",
  ];
  const blob = new Blob(["﻿" + lines.join("\r\n")], { type: "text/csv;charset=utf-8" });
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = "modele-import-eleves-sunupermis.csv";
  a.click();
  URL.revokeObjectURL(a.href);
}

export function StudentImport({ existingPhones, agencies }: { existingPhones: string[]; agencies: string[] }) {
  const router = useRouter();
  const [rows, setRows] = useState<Checked[] | null>(null);
  const [fileName, setFileName] = useState("");
  const [reading, setReading] = useState(false);
  const [pending, start] = useTransition();

  async function onFile(file: File) {
    setReading(true);
    setFileName(file.name);
    try {
      let table: unknown[][];
      if (/\.xlsx$/i.test(file.name)) {
        // Première feuille du classeur.
        const { default: readXlsxFile } = await import("read-excel-file/browser");
        const sheets = (await readXlsxFile(file)) as unknown as { data: unknown[][] }[];
        table = sheets[0]?.data ?? [];
      } else if (/\.(csv|txt)$/i.test(file.name)) {
        table = parseCsv(await file.text());
      } else {
        toast.error("Format non pris en charge : choisissez un fichier Excel (.xlsx) ou CSV.");
        setRows(null);
        return;
      }
      const checked = toRows(table, new Set(existingPhones));
      if (checked.length === 0) toast.error("Le fichier est vide.");
      setRows(checked);
    } catch {
      toast.error("Fichier illisible. Enregistrez-le en .xlsx ou .csv puis réessayez.");
      setRows(null);
    } finally {
      setReading(false);
    }
  }

  const valid = rows?.filter((r) => r.problems.length === 0) ?? [];
  const invalid = (rows?.length ?? 0) - valid.length;

  function submit() {
    start(async () => {
      const res = await importStudents(
        valid.map((r) => ({ full_name: r.full_name, phone: r.phone, license: r.license, price: r.price, paid: r.paid, hours: r.hours, agency: r.agency, notes: r.notes })),
      );
      if (res.error) {
        toast.error(res.error);
        return;
      }
      toast.success(`${res.created} élève${(res.created ?? 0) > 1 ? "s" : ""} importé${(res.created ?? 0) > 1 ? "s" : ""}${res.skipped ? ` · ${res.skipped} ignoré${res.skipped > 1 ? "s" : ""}` : ""}.`);
      router.push("/app/eleves?filtre=tous");
    });
  }

  return (
    <div className="space-y-6">
      <section className="rounded-3xl border border-line bg-surface p-5 sm:p-6">
        <h2 className="font-bold">1. Préparez votre fichier</h2>
        <p className="mt-1 text-sm text-muted">
          Une ligne par élève. Colonnes reconnues : {COLUMNS.map((c) => c.label).join(", ")}. Seuls le nom et le téléphone sont obligatoires
          {agencies.length > 0 ? ` ; l'agence doit être l'une des vôtres (${agencies.join(", ")}).` : "."}
        </p>
        <button
          type="button"
          onClick={downloadTemplate}
          className="mt-4 inline-flex h-10 items-center gap-2 rounded-xl border border-line px-4 text-sm font-semibold transition hover:border-brand-600 hover:text-brand-700"
        >
          <Download className="h-4 w-4" /> Télécharger le modèle
        </button>
      </section>

      <section className="rounded-3xl border border-line bg-surface p-5 sm:p-6">
        <h2 className="font-bold">2. Choisissez le fichier</h2>
        <label
          className={cn(
            "mt-4 flex cursor-pointer flex-col items-center justify-center gap-2 rounded-2xl border-2 border-dashed border-line bg-bg px-4 py-10 text-center transition hover:border-brand-500",
            reading && "pointer-events-none opacity-60",
          )}
          onDragOver={(e) => e.preventDefault()}
          onDrop={(e) => {
            e.preventDefault();
            const f = e.dataTransfer.files[0];
            if (f) onFile(f);
          }}
        >
          {reading ? <Loader2 className="h-8 w-8 animate-spin text-brand-600" /> : <FileSpreadsheet className="h-8 w-8 text-brand-600" />}
          <span className="font-semibold">{fileName || "Fichier Excel (.xlsx) ou CSV"}</span>
          <span className="text-xs text-muted">Touchez pour choisir, ou glissez le fichier ici</span>
          <input
            type="file"
            accept=".xlsx,.csv,text/csv,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
            className="sr-only"
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) onFile(f);
              e.target.value = "";
            }}
          />
        </label>
      </section>

      {rows && rows.length > 0 && (
        <section className="overflow-hidden rounded-3xl border border-line bg-surface">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-line px-5 py-4">
            <div>
              <h2 className="font-bold">3. Vérifiez avant d'importer</h2>
              <p className="text-sm text-muted">
                <span className="font-semibold text-brand-700">{valid.length} prêt{valid.length > 1 ? "s" : ""}</span>
                {invalid > 0 && (
                  <>
                    {" · "}
                    <span className="font-semibold text-red-600">
                      {invalid} ligne{invalid > 1 ? "s" : ""} ignorée{invalid > 1 ? "s" : ""}
                    </span>
                  </>
                )}
              </p>
            </div>
            <button
              type="button"
              onClick={submit}
              disabled={pending || valid.length === 0}
              className="inline-flex h-11 items-center gap-2 rounded-xl bg-brand-600 px-5 text-sm font-semibold text-white shadow-lg shadow-brand-600/25 transition hover:bg-brand-700 disabled:opacity-50"
            >
              {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
              Importer {valid.length} élève{valid.length > 1 ? "s" : ""}
            </button>
          </div>
          <div className="max-h-[480px] overflow-auto">
            <table className="w-full min-w-[640px] text-sm">
              <thead className="sticky top-0 bg-bg text-left text-xs uppercase tracking-wide text-muted">
                <tr>
                  <th className="px-4 py-2">Ligne</th>
                  <th className="px-4 py-2">Élève</th>
                  <th className="px-4 py-2">Téléphone</th>
                  <th className="px-4 py-2 text-right">Forfait</th>
                  <th className="px-4 py-2 text-right">Déjà payé</th>
                  <th className="px-4 py-2">État</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {rows.map((r) => (
                  <tr key={r.line} className={r.problems.length ? "bg-red-50/60 dark:bg-red-900/10" : ""}>
                    <td className="px-4 py-2 text-muted">{r.line}</td>
                    <td className="px-4 py-2 font-semibold">{r.full_name || "—"}</td>
                    <td className="px-4 py-2">{r.phone || "—"}</td>
                    <td className="whitespace-nowrap px-4 py-2 text-right">{r.price ? `${groupDigits(r.price)} FCFA` : "—"}</td>
                    <td className="whitespace-nowrap px-4 py-2 text-right">{r.paid ? `${groupDigits(r.paid)} FCFA` : "—"}</td>
                    <td className="px-4 py-2">
                      {r.problems.length ? (
                        <span className="inline-flex items-center gap-1 text-xs font-semibold text-red-600">
                          <AlertTriangle className="h-3.5 w-3.5" /> {r.problems.join(", ")}
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-xs font-semibold text-brand-700">
                          <CheckCircle2 className="h-3.5 w-3.5" /> OK
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="border-t border-line px-5 py-3 text-xs text-muted">
            Ce qui a déjà été payé est enregistré comme un paiement « Reprise à l'import », avec son reçu. Les élèves déjà inscrits (même numéro) ne sont pas
            recréés.
          </p>
        </section>
      )}
    </div>
  );
}
