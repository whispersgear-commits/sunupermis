/** Le volant du logo, dessiné pour `next/og` (icônes de l'application). */
export function BrandIcon({ size }: { size: number }) {
  return (
    <div
      style={{
        width: size,
        height: size,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: "linear-gradient(135deg, #10a36b, #0b8a5a)",
      }}
    >
      <svg width={size * 0.62} height={size * 0.62} viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth={2.2}>
        <circle cx="12" cy="12" r="8.5" />
        <circle cx="12" cy="12" r="2.2" />
        <path d="M12 14.2v6.3M9.9 11.4 4 9.5M14.1 11.4 20 9.5" />
      </svg>
    </div>
  );
}
