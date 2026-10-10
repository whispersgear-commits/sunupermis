"use client";

import { useFormStatus } from "react-dom";
import { Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * Bouton d'envoi qui réagit tout de suite : il se désactive et affiche un
 * indicateur pendant que le serveur travaille. Quand un formulaire a
 * plusieurs boutons (`name` / `value`), seul celui qui a été touché tourne.
 */
export function PendingButton({
  children,
  className,
  name,
  value,
  ...rest
}: Omit<React.ButtonHTMLAttributes<HTMLButtonElement>, "value" | "type"> & { name?: string; value?: string }) {
  const { pending, data } = useFormStatus();
  const mine = pending && (!name || data?.get(name) === value);
  return (
    <button
      name={name}
      value={value}
      {...rest}
      disabled={pending}
      aria-busy={mine || undefined}
      className={cn("relative transition active:scale-95 disabled:cursor-wait", pending && !mine && "opacity-60", className)}
    >
      <span className={cn("inline-flex items-center justify-center gap-1.5", mine && "invisible")}>{children}</span>
      {mine && (
        <span className="absolute inset-0 grid place-items-center">
          <Loader2 className="h-4 w-4 animate-spin" />
        </span>
      )}
    </button>
  );
}
