import Link from "next/link";
import { cn } from "@/lib/utils";

/** Logotype : un volant stylisé dans un badge vert, le nom à côté. */
export function Logo({ href = "/", className, light = false }: { href?: string; className?: string; light?: boolean }) {
  return (
    <Link href={href} className={cn("inline-flex items-center gap-2.5 font-extrabold tracking-tight", className)}>
      <span className="relative grid h-9 w-9 place-items-center rounded-xl bg-brand-600 text-white shadow-lg shadow-brand-600/30">
        {/* Même volant que le favicon (src/app/icon.svg). */}
        <svg viewBox="10 10 44 44" className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth="5.5" strokeLinecap="round" aria-hidden>
          <circle cx="32" cy="32" r="18.5" />
          <path d="M32 37v13.5M27.4 30.2 14.5 26.4M36.6 30.2 49.5 26.4" />
          <circle cx="32" cy="32" r="5.2" fill="currentColor" stroke="none" />
        </svg>
        <span className="absolute -bottom-1 -right-1 h-3 w-3 rounded-full border-2 border-white bg-lane" />
      </span>
      <span className={cn("text-lg", light ? "text-white" : "text-ink")}>
        Sunu<span className={light ? "text-brand-400" : "text-brand-600"}>Permis</span>
      </span>
    </Link>
  );
}
