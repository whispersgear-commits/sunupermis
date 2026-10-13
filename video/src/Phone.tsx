import React from "react";
import { Img, staticFile } from "remotion";
import { C, inOut, mix, prog, useF } from "./kit";

/** Zone d'une capture, en fractions de sa largeur et de sa hauteur. */
export type Region = { x0: number; x1: number; y0: number; y1: number };
export type Focus = { at: number; region?: Region; zoom?: number };

const lerpRegion = (a: Region, b: Region, p: number): Region => ({
  x0: mix(a.x0, b.x0, p),
  x1: mix(a.x1, b.x1, p),
  y0: mix(a.y0, b.y0, p),
  y1: mix(a.y1, b.y1, p),
});

/**
 * Téléphone avec une vraie capture de SunuPermis. La « caméra » glisse et
 * zoome d'une zone à l'autre ; la zone active est entourée en jaune.
 */
export const Phone: React.FC<{
  src: string;
  width: number;
  aspect: number; // hauteur / largeur de la capture
  focus: Focus[];
  style?: React.CSSProperties;
}> = ({ src, width, aspect, focus, style }) => {
  const f = useF();
  const bezel = width * 0.035;
  const sw = width - bezel * 2;
  const sh = sw * 1.95; // écran visible, plus court que la capture
  const ih = sw * aspect;

  // État courant de la caméra : interpolation entre deux points de focus.
  const full: Region = { x0: 0, x1: 1, y0: 0, y1: sh / ih };
  let region = full;
  let zoom = 1;
  let hl = 0;
  let hlRegion: Region | null = null;
  for (let i = 0; i < focus.length; i++) {
    const k = focus[i];
    const p = prog(f, k.at, 18, inOut);
    if (p <= 0) break;
    const target = k.region ?? full;
    region = lerpRegion(region, target, p);
    zoom = mix(zoom, k.zoom ?? 1, p);
    if (k.region) {
      hlRegion = k.region;
      hl = prog(f, k.at + 8, 12);
    } else {
      hl = 1 - p;
    }
  }
  const cy = ((region.y0 + region.y1) / 2) * ih * zoom;
  const cx = ((region.x0 + region.x1) / 2) * sw * zoom;
  let ty = sh / 2 - cy;
  let tx = sw / 2 - cx;
  ty = Math.min(0, Math.max(sh - ih * zoom, ty));
  tx = Math.min(0, Math.max(sw - sw * zoom, tx));

  return (
    <div
      style={{
        width,
        height: sh + bezel * 2,
        borderRadius: width * 0.13,
        background: "#0b0f1a",
        padding: bezel,
        boxShadow: "0 60px 120px rgba(15,23,42,0.45), inset 0 0 0 3px #2a3142",
        position: "relative",
        ...style,
      }}
    >
      <div style={{ width: sw, height: sh, borderRadius: width * 0.1, overflow: "hidden", position: "relative", background: C.paper }}>
        <div style={{ position: "absolute", left: 0, top: 0, width: sw, height: ih, transformOrigin: "0 0", transform: `translate(${tx}px, ${ty}px) scale(${zoom})` }}>
          <Img src={staticFile(src)} style={{ width: sw, height: ih, display: "block" }} />
          {hlRegion && hl > 0 && (
            <div
              style={{
                position: "absolute",
                left: hlRegion.x0 * sw - 8,
                top: hlRegion.y0 * ih - 8,
                width: (hlRegion.x1 - hlRegion.x0) * sw + 16,
                height: (hlRegion.y1 - hlRegion.y0) * ih + 16,
                borderRadius: 26,
                border: `${5 / zoom}px solid ${C.lane}`,
                boxShadow: `0 0 0 ${2000 * hl}px rgba(15,23,42,${0.35 * hl})`,
                opacity: hl,
                transform: `scale(${mix(1.08, 1, hl)})`,
              }}
            />
          )}
        </div>
        {/* encoche */}
        <div style={{ position: "absolute", top: 14, left: "50%", width: sw * 0.3, height: 34, marginLeft: -sw * 0.15, borderRadius: 20, background: "#0b0f1a" }} />
      </div>
    </div>
  );
};

/** Carte flottante qui sort du téléphone. */
export const Chip: React.FC<{
  at: number;
  children: React.ReactNode;
  x: number;
  y: number;
  dark?: boolean;
  rot?: number;
}> = ({ at, children, x, y, dark = false, rot = -3 }) => {
  const f = useF();
  const p = prog(f, at, 16);
  const s = f < at ? 0 : Math.min(1, mix(0.4, 1.05, p) - Math.max(0, p - 0.7) * 0.17);
  return (
    <div
      style={{
        position: "absolute",
        left: x,
        top: y,
        transform: `translateY(${mix(40, 0, p)}px) scale(${s}) rotate(${rot}deg)`,
        opacity: p,
        background: dark ? C.asphalt : C.white,
        color: dark ? C.white : C.asphalt,
        borderRadius: 30,
        padding: "22px 30px",
        boxShadow: "0 30px 60px rgba(15,23,42,0.28)",
        fontFamily: "'Plus Jakarta Sans', sans-serif",
      }}
    >
      {children}
    </div>
  );
};
