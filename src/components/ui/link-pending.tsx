"use client";

import { useLinkStatus } from "next/link";
import { cn } from "@/lib/utils";

/**
 * À placer dans un `<Link>` : un point qui pulse dès le toucher, le temps
 * que la page suivante arrive. Le clic n'a jamais l'air ignoré.
 */
export function LinkPending({ className }: { className?: string }) {
  const { pending } = useLinkStatus();
  return <span aria-hidden className={cn("pointer-events-none h-1.5 w-1.5 rounded-full bg-current transition-opacity", pending ? "animate-pulse opacity-100" : "opacity-0", className)} />;
}
