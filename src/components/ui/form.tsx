"use client";

import { useActionState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { useFormStatus } from "react-dom";
import { AnimatePresence, m } from "motion/react";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { useSheet } from "./sheet";

/**
 * Formulaire relié à une action serveur. L'action rend `{ error }` ou
 * `{ success }` : l'erreur s'affiche au-dessus des champs (les saisies
 * restent), le succès part en notification.
 */

export interface FormState {
  error?: string;
  success?: string;
  /** Suite proposée dans la notification (ex. « Voir le reçu »). */
  link?: { label: string; href: string };
}

type Action = (state: FormState, fd: FormData) => Promise<FormState>;

export function ActionForm({
  action,
  children,
  className,
  resetOnSuccess = false,
  onSuccess,
}: {
  action: Action;
  children: React.ReactNode;
  className?: string;
  resetOnSuccess?: boolean;
  onSuccess?: () => void;
}) {
  const [state, formAction] = useActionState(action, {});
  const router = useRouter();
  const ref = useRef<HTMLFormElement>(null);
  // Les options sont lues au moment du succès, pas à chaque rendu : l'effet
  // ne doit se déclencher qu'à l'arrivée d'une nouvelle réponse du serveur.
  // Dans un panneau, un succès le referme.
  const sheet = useSheet();
  const options = useRef({ resetOnSuccess, onSuccess, sheet });
  options.current = { resetOnSuccess, onSuccess, sheet };

  useEffect(() => {
    if (state.success) {
      const link = state.link;
      toast.success(state.success, link ? { duration: 10000, action: { label: link.label, onClick: () => router.push(link.href) } } : undefined);
      if (options.current.resetOnSuccess) ref.current?.reset();
      options.current.onSuccess?.();
      options.current.sheet?.close();
    }
  }, [state, router]);

  return (
    <form ref={ref} action={formAction} className={className}>
      <AnimatePresence>
        {state.error && (
          <m.p
            key={state.error}
            role="alert"
            initial={{ opacity: 0, y: -6, height: 0 }}
            animate={{ opacity: 1, y: 0, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="mb-4 rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800"
          >
            {state.error}
          </m.p>
        )}
      </AnimatePresence>
      {children}
    </form>
  );
}

export function Submit({
  children,
  className,
  variant = "primary",
}: {
  children: React.ReactNode;
  className?: string;
  variant?: "primary" | "secondary";
}) {
  const { pending } = useFormStatus();
  return (
    <m.button
      type="submit"
      disabled={pending}
      whileTap={{ scale: 0.97 }}
      className={cn(
        "inline-flex h-11 items-center justify-center gap-2 rounded-xl px-5 text-sm font-semibold transition disabled:opacity-60",
        variant === "primary"
          ? "bg-brand-600 text-white shadow-lg shadow-brand-600/25 hover:bg-brand-700"
          : "border border-line bg-surface hover:border-brand-600 hover:text-brand-700",
        className,
      )}
    >
      {pending && <Loader2 className="h-4 w-4 animate-spin" />}
      {children}
    </m.button>
  );
}
