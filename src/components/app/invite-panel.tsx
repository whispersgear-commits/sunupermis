"use client";

import { useState } from "react";
import { AnimatePresence, m } from "motion/react";
import { Check, Copy, MessageCircle } from "lucide-react";
import { ActionForm, Submit } from "@/components/ui/form";
import { Field, Input, Select } from "@/components/ui/fields";
import { createInvitation } from "@/app/app/actions";

export function InviteForm({ instructors }: { instructors: { id: string; full_name: string }[] }) {
  const [role, setRole] = useState("secretary");
  return (
    <ActionForm action={createInvitation} resetOnSuccess className="space-y-4">
      <Field label="Nom de la personne">
        <Input name="label" placeholder="Ex. Ndeye Fall" required autoFocus />
      </Field>
      <div>
        <span className="mb-1.5 block text-sm font-semibold">Rôle</span>
        <input type="hidden" name="role" value={role} />
        <div className="grid grid-cols-2 gap-2">
          {[
            { value: "secretary", label: "Secrétaire", hint: "Élèves, paiements, planning" },
            { value: "instructor", label: "Moniteur", hint: "Ses leçons, sans l'argent" },
          ].map((r) => (
            <button
              key={r.value}
              type="button"
              onClick={() => setRole(r.value)}
              aria-pressed={role === r.value}
              className={`rounded-2xl border p-3 text-left transition ${role === r.value ? "border-brand-600 bg-brand-50 dark:bg-brand-900/40" : "border-line hover:border-brand-400"}`}
            >
              <span className="block font-bold">{r.label}</span>
              <span className="block text-xs text-muted">{r.hint}</span>
            </button>
          ))}
        </div>
      </div>
      <AnimatePresence initial={false}>
        {role === "instructor" && (
          <m.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }} className="overflow-hidden">
            <Field label="Fiche moniteur" hint="Pour qu'il voie seulement ses propres leçons">
              <Select name="instructor_id" defaultValue={instructors[0]?.id ?? ""}>
                <option value="">Sans fiche moniteur</option>
                {instructors.map((i) => (
                  <option key={i.id} value={i.id}>
                    {i.full_name}
                  </option>
                ))}
              </Select>
            </Field>
          </m.div>
        )}
      </AnimatePresence>
      <Submit className="w-full">Créer le lien d'invitation</Submit>
    </ActionForm>
  );
}

/** Copier ou envoyer sur WhatsApp le lien d'une invitation. */
export function InviteLinkActions({ url, label, school }: { url: string; label: string; school: string }) {
  const [copied, setCopied] = useState(false);
  const message = `Bonjour ${label.split(" ")[0]}, voici votre accès à l'espace ${school} sur SunuPermis : ${url}`;
  return (
    <div className="flex gap-1.5">
      <button
        type="button"
        onClick={async () => {
          await navigator.clipboard.writeText(url);
          setCopied(true);
          setTimeout(() => setCopied(false), 1800);
        }}
        className="inline-flex h-8 items-center gap-1.5 rounded-lg border border-line px-2.5 text-xs font-semibold hover:border-brand-500"
      >
        {copied ? <Check className="h-3.5 w-3.5 text-brand-600" /> : <Copy className="h-3.5 w-3.5" />}
        {copied ? "Copié" : "Copier"}
      </button>
      <a
        href={`https://wa.me/?text=${encodeURIComponent(message)}`}
        target="_blank"
        rel="noopener noreferrer"
        className="inline-flex h-8 items-center gap-1.5 rounded-lg bg-[#25D366] px-2.5 text-xs font-semibold text-asphalt"
      >
        <MessageCircle className="h-3.5 w-3.5" /> Envoyer
      </a>
    </div>
  );
}
