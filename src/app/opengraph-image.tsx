import { ImageResponse } from "next/og";

// Aperçu affiché quand le lien sunupermis.com est partagé (WhatsApp, Facebook…).
export const alt = "SunuPermis, le logiciel des auto-écoles";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function OpenGraphImage() {
  return new ImageResponse(
    (
      <div style={{ width: "100%", height: "100%", display: "flex", flexDirection: "column", justifyContent: "space-between", background: "#0f172a", padding: 72, color: "white" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 28 }}>
          <div style={{ width: 120, height: 120, borderRadius: 30, background: "linear-gradient(135deg, #14b87a, #087049)", display: "flex", alignItems: "center", justifyContent: "center" }}>
            <svg width="80" height="80" viewBox="10 10 44 44" fill="none" stroke="white" strokeWidth={5.5} strokeLinecap="round">
              <circle cx="32" cy="32" r="18.5" />
              <path d="M32 37v13.5M27.4 30.2 14.5 26.4M36.6 30.2 49.5 26.4" />
              <circle cx="32" cy="32" r="5.2" fill="white" stroke="none" />
            </svg>
          </div>
          <div style={{ display: "flex", fontSize: 76, fontWeight: 800, letterSpacing: -3 }}>
            Sunu<span style={{ color: "#10b981" }}>Permis</span>
          </div>
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
          <div style={{ fontSize: 60, fontWeight: 800, lineHeight: 1.05, letterSpacing: -2, maxWidth: 980 }}>Gérez votre auto-école depuis votre téléphone.</div>
          <div style={{ fontSize: 30, color: "#94a3b8" }}>Élèves · Planning · Paiements et reçus · Rappels WhatsApp</div>
        </div>
        <div style={{ display: "flex", gap: 40 }}>
          {Array.from({ length: 9 }).map((_, i) => (
            <div key={i} style={{ width: 90, height: 12, borderRadius: 6, background: "#facc15" }} />
          ))}
        </div>
      </div>
    ),
    size,
  );
}
