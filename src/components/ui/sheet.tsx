"use client";

import { createContext, useContext, useEffect, useId, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { usePathname, useSearchParams } from "next/navigation";
import { AnimatePresence, motion } from "motion/react";
import { X } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * Panneau qui monte du bas de l'écran sur téléphone (là où tombe le pouce) et
 * s'ouvre en fenêtre centrée sur ordinateur. Les formulaires qu'il contient
 * le referment d'eux-mêmes après un succès (voir `ActionForm`).
 */

const SheetContext = createContext<{ close: () => void } | null>(null);

export function useSheet() {
  return useContext(SheetContext);
}

export function Sheet({
  trigger,
  title,
  description,
  children,
  defaultOpen = false,
  triggerClassName,
  wide = false,
}: {
  trigger: React.ReactNode;
  title: string;
  description?: string;
  children: React.ReactNode;
  defaultOpen?: boolean;
  triggerClassName?: string;
  wide?: boolean;
}) {
  const [open, setOpen] = useState(defaultOpen);
  const [mounted, setMounted] = useState(false);
  const titleId = useId();

  useEffect(() => setMounted(true), []);
  // Un lien suivi depuis le panneau le referme.
  const pathname = usePathname();
  const search = useSearchParams().toString();
  const location = `${pathname}?${search}`;
  const lastLocation = useRef(location);
  useEffect(() => {
    if (lastLocation.current !== location) setOpen(false);
    lastLocation.current = location;
  }, [location]);
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    const overflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = overflow;
      window.removeEventListener("keydown", onKey);
    };
  }, [open]);

  return (
    <>
      <button type="button" onClick={() => setOpen(true)} className={triggerClassName}>
        {trigger}
      </button>
      {mounted &&
        createPortal(
          <AnimatePresence>
            {open && (
              <div className="fixed inset-0 z-[60] flex items-end justify-center sm:items-center sm:p-6">
                <motion.div
                  className="absolute inset-0 bg-asphalt/50 backdrop-blur-sm"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  onClick={() => setOpen(false)}
                />
                <motion.div
                  role="dialog"
                  aria-modal="true"
                  aria-labelledby={titleId}
                  initial={{ y: "100%", opacity: 0.6 }}
                  animate={{ y: 0, opacity: 1 }}
                  exit={{ y: "100%", opacity: 0 }}
                  transition={{ type: "spring", stiffness: 380, damping: 36 }}
                  className={cn(
                    "relative max-h-[92dvh] w-full overflow-y-auto rounded-t-[28px] border border-line bg-surface pb-[max(1.25rem,env(safe-area-inset-bottom))] shadow-2xl sm:rounded-3xl sm:pb-0",
                    wide ? "sm:max-w-2xl" : "sm:max-w-lg",
                  )}
                >
                  <div className="sticky top-0 z-10 border-b border-line bg-surface/95 px-5 pb-4 pt-3 backdrop-blur sm:pt-5">
                    <div className="mx-auto mb-3 h-1.5 w-10 rounded-full bg-line sm:hidden" />
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <h2 id={titleId} className="text-lg font-extrabold tracking-tight">
                          {title}
                        </h2>
                        {description && <p className="mt-0.5 text-sm text-muted">{description}</p>}
                      </div>
                      <button
                        type="button"
                        onClick={() => setOpen(false)}
                        className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-bg text-muted transition hover:text-ink"
                        aria-label="Fermer"
                      >
                        <X className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                  <div className="p-5">
                    <SheetContext.Provider value={{ close: () => setOpen(false) }}>{children}</SheetContext.Provider>
                  </div>
                </motion.div>
              </div>
            )}
          </AnimatePresence>,
          document.body,
        )}
    </>
  );
}
