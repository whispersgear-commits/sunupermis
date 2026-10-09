"use client";

import { useActionState, useEffect, useRef } from "react";
import { useFormStatus } from "react-dom";
import { AnimatePresence, motion } from "motion/react";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

/**
 * Formulaire relié à une action serveur. L'action rend `{ error }` ou
 * `{ success }` : l'erreur s'affiche au-dessus des champs (les saisies
 * restent), le succès part en notification.
 */

export interface FormState {
  error?: string;
  success?: string;
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
  const ref = useRef<HTMLFormElement>(null);
  // Les options sont lues au moment du succès, pas à chaque rendu : l'effet
  // ne doit se déclencher qu'à l'arrivée d'une nouvelle réponse du serveur.
  const options = useRef({ resetOnSuccess, onSuccess });
  options.current = { resetOnSuccess, onSuccess };

  useEffect(() => {
    if (state.success) {
      toast.success(state.success);
      if (options.current.resetOnSuccess) ref.current?.reset();
      options.current.onSuccess?.();
    }
  }, [state]);

  return (
    <form ref={ref} action={formAction} className={className}>
      <AnimatePresence>
        {state.error && (
          <motion.p
            key={state.error}
            role="alert"
            initial={{ opacity: 0, y: -6, height: 0 }}
            animate={{ opacity: 1, y: 0, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="mb-4 rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800"
          >
            {state.error}
          </motion.p>
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
    <motion.button
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
    </motion.button>
  );
}
