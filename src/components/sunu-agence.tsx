import Image from "next/image";
import { cn } from "@/lib/utils";

/** Signature du groupe : SunuPermis est un produit Sunu Agence. */
export function SunuAgence({ className }: { className?: string }) {
  return (
    <span className={cn("inline-flex items-center gap-2 text-xs text-muted", className)}>
      Un produit
      <Image src="/brand/sunu-agence-baobab.png" alt="" width={22} height={22} className="h-[22px] w-[22px] rounded-full" />
      <span className="font-semibold text-[#2D6A4F] dark:text-[#74C69D]">Sunu Agence</span>
    </span>
  );
}
