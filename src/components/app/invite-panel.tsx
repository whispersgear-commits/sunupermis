"use client";

import { useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { Check, Copy, MessageCircle } from "lucide-react";
import { ActionForm, Submit } from "@/components/ui/form";
import { Input, Select } from "@/components/ui/fields";
import { createInvitation } from "@/app/app/actions";

export function InviteForm({ instructors }: { instructors: { id: string; full_name: string }[] }) {
  const [role, setRole] = useState("secretary");
  return (
    <ActionForm action={createInvitation} resetOnSuccess className="grid gap-2 sm:grid-cols-[1fr_auto_auto_auto]">
      <Input name="label" placeholder="Nom de la personne" required aria-label="Nom de la personne invitée" />
      <Select name="role" value={role} onChange={(e) => setRole(e.target.value)} aria-label="Rôle">
        <option value="secretary">Secrétaire</option>
        <option value="instructor">Moniteur</option>
      </Select>
      <AnimatePresence initial={false}>
        {role === "instructor" && (
          <motion.div initial={{ opacity: 0, width: 0 }} animate={{ opacity: 1, width: "auto" }} exit={{ opacity: 0, width: 0 }} className="overflow-hidden">
            <Select name="instructor_id" defaultValue={instructors[0]?.id ?? ""} aria-label="Fiche moniteur">
              <option value="">Sans fiche moniteur</option>
              {instructors.map((i) => (
                <option key={i.id} value={i.id}>
                  {i.full_name}
                </option>
              ))}
            </Select>
          </motion.div>
        )}
      </AnimatePresence>
      <Submit>Créer le lien</Submit>
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
        className="inline-flex h-8 items-center gap-1.5 rounded-lg bg-[#25D366] px-2.5 text-xs font-semibold text-white"
      >
        <MessageCircle className="h-3.5 w-3.5" /> Envoyer
      </a>
    </div>
  );
}
