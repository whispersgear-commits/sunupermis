type Props = { className?: string; light?: boolean };

/** Signature « Un produit Sunu Agence » : le baobab de la maison mère, à placer en bas de page. */
export function SunuAgenceBadge({ className = "", light = false }: Props) {
  return (
    <span className={`inline-flex items-center gap-2 ${className}`} title="Sunu Agence">
      <svg viewBox="0 0 32 32" className="h-6 w-6 shrink-0" aria-hidden>
        <circle cx="16" cy="16" r="16" fill={light ? "#ffffff" : "#F4EBD9"} fillOpacity={light ? 0.12 : 1} />
        <g stroke="#8B5E34" strokeWidth="1.6" strokeLinecap="round" fill="none">
          <path d="M14.5 14 L8.5 10.5" />
          <path d="M15.5 13.5 L12.5 7.5" />
          <path d="M16 13.5 V7" />
          <path d="M16.5 13.5 L19.5 7.5" />
          <path d="M17.5 14 L23.5 10.5" />
        </g>
        <g fill={light ? "#74C69D" : "#2D6A4F"}>
          <circle cx="8" cy="10" r="2.4" />
          <circle cx="12" cy="7" r="2.4" />
          <circle cx="16" cy="6" r="2.6" />
          <circle cx="20" cy="7" r="2.4" />
          <circle cx="24" cy="10" r="2.4" />
        </g>
        <path d="M12 26 C10.8 22.5 11.2 18 13 15.5 L14 13.5 H18 L19 15.5 C20.8 18 21.2 22.5 20 26 Z" fill="#8B5E34" />
      </svg>
      <span className="leading-tight">
        <span className={`block text-[10px] uppercase tracking-wider ${light ? "text-white/50" : "text-stone-400"}`}>Un produit</span>
        <span className={`block text-xs font-semibold ${light ? "text-white/80" : "text-[#2D6A4F] dark:text-[#74C69D]"}`}>Sunu Agence</span>
      </span>
    </span>
  );
}
