import React, { useContext } from "react";
import { Easing, interpolate, spring, useCurrentFrame } from "remotion";
import "@fontsource/plus-jakarta-sans/500.css";
import "@fontsource/plus-jakarta-sans/700.css";
import "@fontsource/plus-jakarta-sans/800.css";
import timeline from "./timeline.json";

// Couleurs de SunuPermis (src/app/globals.css du site).
export const C = {
  green: "#0b8a5a",
  green5: "#10b981",
  green7: "#087049",
  green9: "#053f2a",
  mint: "#ecfdf5",
  lane: "#facc15",
  asphalt: "#0f172a",
  asphalt2: "#1e293b",
  paper: "#f6f7f5",
  white: "#ffffff",
  red: "#e11d48",
  muted: "#64748b",
};
export const FONT = "'Plus Jakarta Sans', sans-serif";

// ---------------------------------------------------------------------------
// Minutage : timeline.json est écrit par audio/build.py d'après la voix.
// ---------------------------------------------------------------------------
type Word = { w: string; f: number };
export type Phrase = { scene: string; text: string; from: number; to: number; words: Word[] };
export const TL = timeline as { fps: number; durationInFrames: number; scenes: { id: string; from: number; len: number }[]; phrases: Phrase[] };
export const SC = Object.fromEntries(TL.scenes.map((s) => [s.id, s]));
export const phraseOf = (scene: string) => TL.phrases.find((p) => p.scene === scene)!;

/** Image où le mot est prononcé dans la phrase de la scène. */
export function wf(scene: string, word: string): number {
  const w = phraseOf(scene).words.find((x) => x.w.toLowerCase().replace(/[^\p{L}\d]/gu, "").startsWith(word.toLowerCase()));
  if (!w) throw new Error(`Mot introuvable : ${word} (${scene})`);
  return w.f;
}

/** Image absolue du film, même dans une <Sequence>. */
export const SceneStart = React.createContext(0);
export const useF = () => useCurrentFrame() + useContext(SceneStart);

// ---------------------------------------------------------------------------
// Mouvement
// ---------------------------------------------------------------------------
export const expoOut = Easing.bezier(0.16, 1, 0.3, 1);
export const inOut = Easing.bezier(0.65, 0, 0.35, 1);
export const mix = (a: number, b: number, p: number) => a + (b - a) * p;
export const prog = (f: number, at: number, dur: number, ease = expoOut) =>
  interpolate(f, [at, at + dur], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp", easing: ease });
export const pop = (f: number, at: number, damping = 12, stiffness = 200) =>
  f < at ? 0 : spring({ frame: f - at, fps: TL.fps, config: { damping, stiffness, mass: 0.8 } });

export function shake(f: number, hits: number[], amp = 14, dur = 10) {
  let x = 0;
  let y = 0;
  for (const at of hits) {
    const t = f - at;
    if (t < 0 || t > dur) continue;
    const k = (1 - t / dur) ** 2;
    x += Math.sin(t * 2.6) * amp * k;
    y += Math.cos(t * 3.3) * amp * 0.6 * k;
  }
  return `translate(${x}px, ${y}px)`;
}

export const display = (size: number, color: string = C.white): React.CSSProperties => ({
  fontFamily: FONT,
  fontWeight: 800,
  fontSize: size,
  lineHeight: 1.0,
  letterSpacing: "-0.04em",
  color,
});
export const body = (size: number, color: string = C.asphalt, weight = 600): React.CSSProperties => ({
  fontFamily: FONT,
  fontWeight: weight,
  fontSize: size,
  lineHeight: 1.2,
  color,
});

/** Texte qui monte derrière un masque. */
export const Rise: React.FC<{ at: number; children: React.ReactNode; style?: React.CSSProperties }> = ({ at, children, style }) => {
  const f = useF();
  const p = prog(f, at, 14);
  return (
    <span style={{ display: "inline-block", overflow: "hidden", verticalAlign: "top", padding: "0.12em 0.05em", margin: "-0.12em -0.05em", ...style }}>
      <span style={{ display: "inline-block", transform: `translateY(${mix(130, 0, p)}%) rotate(${mix(5, 0, p)}deg)` }}>{children}</span>
    </span>
  );
};

/** Élément qui s'abat : grossi puis écrasé à sa taille. */
export const Slam: React.FC<{ at: number; children: React.ReactNode; from?: number; rot?: number; style?: React.CSSProperties }> = ({
  at,
  children,
  from = 2.2,
  rot = 0,
  style,
}) => {
  const f = useF();
  const s = pop(f, at, 11, 280);
  return (
    <div style={{ display: "inline-block", opacity: f >= at ? Math.min(1, (f - at + 1) / 3) : 0, transform: `scale(${mix(from, 1, s)}) rotate(${rot * (1 - s)}deg)`, ...style }}>
      {children}
    </div>
  );
};

/** Petit titre : trait jaune + capitales espacées. */
export const Kicker: React.FC<{ at: number; children: React.ReactNode; color?: string }> = ({ at, children, color = C.green }) => {
  const f = useF();
  const p = prog(f, at, 16);
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 16, opacity: p }}>
      <div style={{ width: 54 * p, height: 8, borderRadius: 4, background: C.lane }} />
      <div style={{ ...body(30, color, 800), letterSpacing: "0.18em", textTransform: "uppercase" }}>{children}</div>
    </div>
  );
};

export function count(f: number, at: number, dur: number, a: number, b: number) {
  return Math.round(mix(a, b, prog(f, at, dur)));
}
export const money = (n: number) => `${Math.round(n).toLocaleString("fr-FR").replace(/\s/g, " ")} FCFA`;

/** Volant du logo SunuPermis (même dessin que le favicon). */
export const Wheel: React.FC<{ size: number; color?: string }> = ({ size, color = C.white }) => (
  <svg width={size} height={size} viewBox="10 10 44 44" fill="none" stroke={color} strokeWidth={5.5} strokeLinecap="round">
    <circle cx="32" cy="32" r="18.5" />
    <path d="M32 37v13.5M27.4 30.2 14.5 26.4M36.6 30.2 49.5 26.4" />
    <circle cx="32" cy="32" r="5.2" fill={color} stroke="none" />
  </svg>
);

export const LogoBadge: React.FC<{ size: number }> = ({ size }) => (
  <div style={{ position: "relative", width: size, height: size }}>
    <div
      style={{
        width: size,
        height: size,
        borderRadius: size * 0.24,
        background: `linear-gradient(135deg, #14b87a, ${C.green7})`,
        display: "grid",
        placeItems: "center",
        boxShadow: `0 ${size * 0.12}px ${size * 0.35}px rgba(11,138,90,0.45)`,
      }}
    >
      <Wheel size={size * 0.66} />
    </div>
    <div
      style={{
        position: "absolute",
        right: -size * 0.06,
        bottom: -size * 0.06,
        width: size * 0.26,
        height: size * 0.26,
        borderRadius: "50%",
        background: C.lane,
        border: `${size * 0.045}px solid ${C.white}`,
      }}
    />
  </div>
);
