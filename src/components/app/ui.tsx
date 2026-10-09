"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { animate, motion, useInView } from "motion/react";
import { cn } from "@/lib/utils";
import { money } from "@/lib/format";

const ease = [0.22, 1, 0.36, 1] as const;

export function PageHeader({ title, description, actions }: { title: React.ReactNode; description?: React.ReactNode; actions?: React.ReactNode }) {
  return (
    <motion.header
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.45, ease }}
      className="mb-8 flex flex-wrap items-end justify-between gap-4"
    >
      <div className="min-w-0">
        <h1 className="text-2xl font-extrabold tracking-tight sm:text-3xl">{title}</h1>
        {description && <p className="mt-1.5 text-muted">{description}</p>}
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
      transition={{ duration: 0.5, delay, ease }}
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
  const [shown, setShown] = useState(0);
  useEffect(() => {
    if (!inView) return;
    const controls = animate(0, value, { duration: 1.1, ease, onUpdate: (v) => setShown(Math.round(v)) });
    return () => controls.stop();
  }, [inView, value]);
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
      transition={{ duration: 0.5, delay, ease }}
      whileHover={{ y: -4 }}
      className={cn(
        "h-full rounded-3xl border p-5",
        tone === "brand" ? "border-brand-600 bg-brand-600 text-white" : "border-line bg-surface",
      )}
    >
      <div className="flex items-center justify-between">
        <p className={cn("text-sm font-semibold", tone === "brand" ? "text-brand-50" : "text-muted")}>{label}</p>
        <span className={cn("grid h-9 w-9 place-items-center rounded-xl", tone === "brand" ? "bg-white/15" : tone === "bad" ? "bg-red-50 text-red-600" : "bg-brand-50 text-brand-700")}>
          {icon}
        </span>
      </div>
      <p className={cn("mt-3 text-2xl font-extrabold tracking-tight sm:text-3xl", tone === "bad" && value > 0 && "text-red-600", tone === "good" && "text-brand-700")}>
        <AnimatedNumber value={value} format={format} />
      </p>
      {hint && <p className={cn("mt-1 text-xs", tone === "brand" ? "text-brand-50/80" : "text-muted")}>{hint}</p>}
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
      variants={{ hidden: {}, show: { transition: { staggerChildren: 0.05 } } }}
    >
      {children}
    </motion.ul>
  );
}

export function StaggerItem({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <motion.li
      className={className}
      variants={{ hidden: { opacity: 0, y: 10 }, show: { opacity: 1, y: 0, transition: { duration: 0.35, ease } } }}
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
