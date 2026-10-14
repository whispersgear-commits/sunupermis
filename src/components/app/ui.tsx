"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { animate, motion, useInView, useReducedMotion } from "motion/react";
import { cn } from "@/lib/utils";
import { money } from "@/lib/format";

const ease = [0.22, 1, 0.36, 1] as const;

export function PageHeader({ title, description, actions }: { title: React.ReactNode; description?: React.ReactNode; actions?: React.ReactNode }) {
  return (
    <motion.header
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25, ease }}
      className="mb-6 flex flex-wrap items-end justify-between gap-4 sm:mb-8"
    >
      <div className="min-w-0">
        <h1 className="text-[26px] font-extrabold leading-tight tracking-tight sm:text-3xl">{title}</h1>
        {description && <p className="mt-1 text-sm text-muted sm:text-base">{description}</p>}
      </div>
      {actions && <div className="flex flex-wrap gap-2">{actions}</div>}
    </motion.header>
  );
}

export function Card({ children, className, delay = 0 }: { children: React.ReactNode; className?: string; delay?: number }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, delay: Math.min(delay, 0.1), ease }}
      className={cn("rounded-3xl border border-line bg-surface", className)}
    >
      {children}
    </motion.div>
  );
}

export function CardTitle({ title, action }: { title: React.ReactNode; action?: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-3 border-b border-line px-5 py-4">
      <h2 className="font-bold">{title}</h2>
      {action}
    </div>
  );
}

/** Nombre qui s'anime de 0 à sa valeur quand la carte apparaît. */
/**
 * Les composants serveur ne peuvent pas passer de fonction à un composant
 * client : le format est donc désigné par un nom, pas fourni en fonction.
 */
export function AnimatedNumber({ value, format = "number" }: { value: number; format?: "number" | "money" }) {
  const ref = useRef<HTMLSpanElement>(null);
  const inView = useInView(ref, { once: true });
  const reduce = useReducedMotion();
  const [shown, setShown] = useState(0);
  useEffect(() => {
    if (!inView) return;
    // Mouvements réduits : la valeur s'affiche directement.
    if (reduce) {
      setShown(value);
      return;
    }
    const controls = animate(0, value, { duration: 0.6, ease, onUpdate: (v) => setShown(Math.round(v)) });
    return () => controls.stop();
  }, [inView, value, reduce]);
  return <span ref={ref}>{format === "money" ? money(shown) : shown}</span>;
}

export function Stat({
  label,
  value,
  format,
  hint,
  tone = "neutral",
  icon,
  delay = 0,
  href,
}: {
  label: string;
  value: number;
  format?: "number" | "money";
  hint?: string;
  tone?: "neutral" | "good" | "bad" | "brand";
  /** Un élément (`<Users />`), pas un composant : il traverse la frontière
   *  serveur/client, une fonction ne le peut pas. */
  icon: React.ReactNode;
  delay?: number;
  href?: string;
}) {
  const body = (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, delay: Math.min(delay, 0.1), ease }}
      whileHover={{ y: -4 }}
      className={cn(
        "h-full rounded-3xl border p-4 sm:p-5",
        tone === "brand" ? "border-brand-600 bg-brand-600 text-white" : "border-line bg-surface",
      )}
    >
      <div className="flex items-center justify-between">
        <p className={cn("text-xs font-semibold sm:text-sm", tone === "brand" ? "text-brand-50" : "text-muted")}>{label}</p>
        <span className={cn("grid h-8 w-8 shrink-0 place-items-center rounded-xl sm:h-9 sm:w-9", tone === "brand" ? "bg-white/15" : tone === "bad" ? "bg-red-50 text-red-600" : "bg-brand-50 text-brand-700")}>
          {icon}
        </span>
      </div>
      <p className={cn("mt-2 whitespace-nowrap text-lg font-extrabold tracking-tight tabular-nums sm:mt-3 sm:text-2xl xl:text-[28px]", tone === "bad" && value > 0 && "text-red-600", tone === "good" && "text-brand-700")}>
        <AnimatedNumber value={value} format={format} />
      </p>
      {hint && <p className={cn("mt-0.5 text-[11px] sm:text-xs", tone === "brand" ? "text-brand-50/80" : "text-muted")}>{hint}</p>}
    </motion.div>
  );
  return href ? <Link href={href}>{body}</Link> : body;
}

/** Liste dont les lignes apparaissent l'une après l'autre. */
export function StaggerList({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <motion.ul
      className={className}
      initial="hidden"
      animate="show"
      variants={{ hidden: {}, show: { transition: { staggerChildren: 0.025 } } }}
    >
      {children}
    </motion.ul>
  );
}

export function StaggerItem({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <motion.li
      className={className}
      variants={{ hidden: { opacity: 0, y: 6 }, show: { opacity: 1, y: 0, transition: { duration: 0.2, ease } } }}
    >
      {children}
    </motion.li>
  );
}

export function Badge({ children, tone = "neutral" }: { children: React.ReactNode; tone?: "neutral" | "good" | "warn" | "bad" | "info" }) {
  const tones = {
    neutral: "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300",
    good: "bg-brand-50 text-brand-700 dark:bg-brand-900/50 dark:text-brand-200",
    warn: "bg-amber-50 text-amber-800 dark:bg-amber-900/40 dark:text-amber-200",
    bad: "bg-red-50 text-red-700 dark:bg-red-900/40 dark:text-red-200",
    info: "bg-sky-50 text-sky-700 dark:bg-sky-900/40 dark:text-sky-200",
  };
  return <span className={cn("inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-bold", tones[tone])}>{children}</span>;
}

export function Empty({ title, children }: { title: string; children?: React.ReactNode }) {
  return (
    <div className="px-6 py-12 text-center">
      <motion.div
        initial={{ scale: 0.6, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ type: "spring", stiffness: 260, damping: 18 }}
        className="mx-auto mb-4 grid h-14 w-14 place-items-center rounded-2xl bg-brand-50 text-2xl dark:bg-brand-900/40"
      >
        🚗
      </motion.div>
      <p className="font-bold">{title}</p>
      {children && <div className="mt-1 text-sm text-muted">{children}</div>}
    </div>
  );
}

export function ButtonLink({ href, children, variant = "primary", className }: { href: string; children: React.ReactNode; variant?: "primary" | "secondary" | "whatsapp"; className?: string }) {
  const external = href.startsWith("http");
  return (
    <motion.span whileTap={{ scale: 0.97 }} className="inline-flex">
      <Link
        href={href}
        target={external ? "_blank" : undefined}
        rel={external ? "noopener noreferrer" : undefined}
        className={cn(
          "inline-flex h-10 items-center gap-2 rounded-xl px-4 text-sm font-semibold transition",
          variant === "primary" && "bg-brand-600 text-white shadow-lg shadow-brand-600/20 hover:bg-brand-700",
          variant === "secondary" && "border border-line bg-surface hover:border-brand-600 hover:text-brand-700",
          variant === "whatsapp" && "bg-[#25D366] text-white hover:brightness-95",
          className,
        )}
      >
        {children}
      </Link>
    </motion.span>
  );
}

const AVATAR_TONES = [
  "bg-brand-50 text-brand-700 dark:bg-brand-900/50 dark:text-brand-200",
  "bg-sky-50 text-sky-700 dark:bg-sky-900/40 dark:text-sky-200",
  "bg-amber-50 text-amber-800 dark:bg-amber-900/40 dark:text-amber-200",
  "bg-violet-50 text-violet-700 dark:bg-violet-900/40 dark:text-violet-200",
  "bg-rose-50 text-rose-700 dark:bg-rose-900/40 dark:text-rose-200",
  "bg-teal-50 text-teal-700 dark:bg-teal-900/40 dark:text-teal-200",
];

/** Initiales sur une couleur tirée du nom : la même personne garde sa couleur partout. */
export function Avatar({ name, size = "md" }: { name: string; size?: "sm" | "md" | "lg" }) {
  const initials = name
    .trim()
    .split(/\s+/)
    .map((p) => p[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();
  let hash = 0;
  for (const ch of name) hash = (hash * 31 + ch.charCodeAt(0)) >>> 0;
  return (
    <span
      aria-hidden
      className={cn(
        "grid shrink-0 place-items-center font-extrabold",
        AVATAR_TONES[hash % AVATAR_TONES.length],
        size === "sm" && "h-9 w-9 rounded-xl text-xs",
        size === "md" && "h-11 w-11 rounded-2xl text-sm",
        size === "lg" && "h-16 w-16 rounded-3xl text-xl",
      )}
    >
      {initials}
    </span>
  );
}

/** Barre de progression fine. */
export function ProgressBar({ value, total, tone = "brand" }: { value: number; total: number; tone?: "brand" | "bad" }) {
  const pct = total ? Math.min(100, Math.round((value / total) * 100)) : 0;
  return (
    <div className="h-1.5 overflow-hidden rounded-full bg-line">
      <motion.div
        className={cn("h-full rounded-full", tone === "bad" ? "bg-red-500" : "bg-gradient-to-r from-brand-500 to-brand-600")}
        initial={{ width: 0 }}
        animate={{ width: `${pct}%` }}
        transition={{ duration: 0.9, ease }}
      />
    </div>
  );
}
