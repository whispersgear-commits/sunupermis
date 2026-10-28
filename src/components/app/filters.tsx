"use client";

import Link from "next/link";
import { useEffect, useRef, useState, useTransition } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { m } from "motion/react";
import { Loader2, Search, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { inputClass } from "@/components/ui/fields";
import { LinkPending } from "@/components/ui/link-pending";

/**
 * Filtres portés par l'adresse de la page (`?q=…&statut=…`) : la page
 * serveur relit les paramètres et renvoie la liste filtrée. Une recherche se
 * partage donc par lien et survit au bouton « retour ».
 */

function useParamSetter() {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const [pending, startTransition] = useTransition();
  const set = (changes: Record<string, string | null>) => {
    const next = new URLSearchParams(params.toString());
    for (const [k, v] of Object.entries(changes)) {
      if (v === null || v === "") next.delete(k);
      else next.set(k, v);
    }
    const qs = next.toString();
    startTransition(() => router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false }));
  };
  return { set, pending, params };
}

/** Champ de recherche : la liste se met à jour pendant la frappe. */
export function SearchBox({ placeholder, param = "q", className }: { placeholder: string; param?: string; className?: string }) {
  const { set, pending, params } = useParamSetter();
  const [value, setValue] = useState(params.get(param) ?? "");
  const timer = useRef<ReturnType<typeof setTimeout>>(undefined);
  const setRef = useRef(set);
  setRef.current = set;

  useEffect(() => () => clearTimeout(timer.current), []);

  return (
    <div className={cn("relative", className)}>
      {pending ? (
        <Loader2 className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 animate-spin text-brand-600" />
      ) : (
        <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" />
      )}
      <input
        type="search"
        value={value}
        onChange={(e) => {
          const v = e.target.value;
          setValue(v);
          clearTimeout(timer.current);
          timer.current = setTimeout(() => setRef.current({ [param]: v.trim() || null }), 250);
        }}
        placeholder={placeholder}
        aria-label={placeholder}
        className={cn(inputClass, "pl-10 pr-10 [&::-webkit-search-cancel-button]:hidden")}
      />
      {value && (
        <button
          type="button"
          onClick={() => {
            setValue("");
            set({ [param]: null });
          }}
          className="absolute right-2 top-1/2 grid h-7 w-7 -translate-y-1/2 place-items-center rounded-full text-muted hover:bg-bg hover:text-ink"
          aria-label="Effacer la recherche"
        >
          <X className="h-4 w-4" />
        </button>
      )}
    </div>
  );
}

/** Liste déroulante reliée à un paramètre de l'adresse. */
export function ParamSelect({
  param,
  options,
  label,
  className,
}: {
  param: string;
  options: { value: string; label: string }[];
  label: string;
  className?: string;
}) {
  const { set, params, pending } = useParamSetter();
  return (
    <select
      aria-busy={pending || undefined}
      aria-label={label}
      value={params.get(param) ?? ""}
      onChange={(e) => set({ [param]: e.target.value || null })}
      className={cn(inputClass, "w-auto pr-8 font-semibold", pending && "animate-pulse", className)}
    >
      {options.map((o) => (
        <option key={o.value} value={o.value}>
          {o.label}
        </option>
      ))}
    </select>
  );
}

export interface TabItem {
  href: string;
  label: string;
  count?: number;
  active: boolean;
  tone?: "bad";
}

/**
 * Onglets ou pastilles de filtre. La pastille active glisse d'un onglet à
 * l'autre ; sur téléphone la rangée défile horizontalement.
 */
export function Tabs({ items, id, variant = "pills", className }: { items: TabItem[]; id: string; variant?: "pills" | "underline"; className?: string }) {
  return (
    <div className={cn("-mx-4 overflow-x-auto px-4 [scrollbar-width:none] sm:mx-0 sm:px-0", className)}>
      <div className={cn("flex w-max gap-1", variant === "underline" ? "border-b border-line" : "rounded-2xl border border-line bg-surface p-1")}>
        {items.map((t) => (
          <Link
            key={t.href}
            href={t.href}
            scroll={false}
            replace
            className={cn(
              "relative flex items-center gap-1.5 whitespace-nowrap text-sm font-semibold transition",
              variant === "pills" ? "rounded-xl px-3.5 py-2" : "px-3 pb-3 pt-1",
              t.active ? (variant === "pills" ? "text-white" : "text-brand-700 dark:text-brand-200") : "text-muted hover:text-ink",
            )}
          >
            {t.active &&
              (variant === "pills" ? (
                <m.span layoutId={`${id}-pill`} className="absolute inset-0 rounded-xl bg-asphalt dark:bg-brand-600" transition={{ type: "spring", stiffness: 420, damping: 34 }} />
              ) : (
                <m.span layoutId={`${id}-line`} className="absolute inset-x-2 -bottom-px h-0.5 rounded-full bg-brand-600" transition={{ type: "spring", stiffness: 420, damping: 34 }} />
              ))}
            <span className="relative">{t.label}</span>
            <LinkPending className="absolute right-1 top-1" />
            {t.count !== undefined && (
              <span
                className={cn(
                  "relative rounded-full px-1.5 text-[11px] font-bold tabular-nums",
                  t.active && variant === "pills" ? "bg-black/25 text-white" : t.tone === "bad" && t.count > 0 ? "bg-red-50 text-red-600 dark:bg-red-900/40 dark:text-red-200" : "bg-bg text-muted",
                )}
              >
                {t.count}
              </span>
            )}
          </Link>
        ))}
      </div>
    </div>
  );
}
