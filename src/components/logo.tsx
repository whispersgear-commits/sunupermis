import Link from "next/link";
import { cn } from "@/lib/utils";

/** Logotype : un volant stylisé dans un badge vert, le nom à côté. */
export function Logo({ href = "/", className, light = false }: { href?: string; className?: string; light?: boolean }) {
  return (
    <Link href={href} className={cn("inline-flex items-center gap-2.5 font-extrabold tracking-tight", className)}>
      <span className="relative grid h-9 w-9 place-items-center rounded-xl bg-brand-600 text-white shadow-lg shadow-brand-600/30">
        <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2.2" aria-hidden>
          <circle cx="12" cy="12" r="8.5" />
          <circle cx="12" cy="12" r="2.2" />
          <path d="M12 14.2v6.3M9.9 11.4 4 9.5M14.1 11.4 20 9.5" />
        </svg>
        <span className="absolute -bottom-1 -right-1 h-3 w-3 rounded-full border-2 border-white bg-lane" />
      </span>
      <span className={cn("text-lg", light ? "text-white" : "text-ink")}>
        Sunu<span className="text-brand-600">Permis</span>
      </span>
    </Link>
  );
}
