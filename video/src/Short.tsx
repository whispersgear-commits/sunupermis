import React from "react";
import { AbsoluteFill, Audio, Img, Sequence, interpolate, staticFile } from "remotion";
import { Chip, Phone } from "./Phone";
import {
  C,
  FONT,
  Kicker,
  LogoBadge,
  Rise,
  SC,
  SceneStart,
  Slam,
  TL,
  body,
  count,
  display,
  inOut,
  mix,
  money,
  phraseOf,
  pop,
  prog,
  shake,
  useF,
  wf,
} from "./kit";

const PHONE_ASPECT = 2532 / 1170;
const PW = 600; // largeur du téléphone
const PX = (1080 - PW) / 2;

// ---------------------------------------------------------------------------
// Habillage commun
// ---------------------------------------------------------------------------

/** Pointillés de marquage au sol qui défilent : le motif de la marque. */
const Lane: React.FC<{ y: number; color?: string; opacity?: number }> = ({ y, color = C.lane, opacity = 1 }) => {
  const f = useF();
  const off = (f * 9) % 160;
  return (
    <div style={{ position: "absolute", left: 0, right: 0, top: y, height: 14, overflow: "hidden", opacity }}>
      <div style={{ position: "absolute", left: -160 + off, top: 0, display: "flex", gap: 60 }}>
        {Array.from({ length: 12 }).map((_, i) => (
          <div key={i} style={{ width: 100, height: 14, borderRadius: 7, background: color }} />
        ))}
      </div>
    </div>
  );
};

/** Volet d'entrée de scène : une bande jaune balaie l'écran en diagonale. */
const Wipe: React.FC<{ at: number; children: React.ReactNode; bg: string }> = ({ at, children, bg }) => {
  const f = useF();
  const p = prog(f, at, 12, inOut);
  const bar = prog(f, at - 2, 14, inOut);
  return (
    <AbsoluteFill>
      <AbsoluteFill style={{ background: bg, clipPath: `polygon(0 ${mix(130, -30, p)}%, 100% ${mix(100, -60, p)}%, 100% 100%, 0 100%)` }}>{children}</AbsoluteFill>
      {bar < 1 && (
        <div
          style={{
            position: "absolute",
            left: -200,
            width: 1480,
            height: 70,
            top: mix(2300, -300, bar),
            background: C.lane,
            transform: "rotate(-16deg)",
          }}
        />
      )}
    </AbsoluteFill>
  );
};

/** Sous-titres mot à mot : le mot dit passe en jaune. */
const Captions: React.FC = () => {
  const f = useF();
  const p = TL.phrases.find((x) => f >= x.from - 4 && f <= x.to + 10);
  if (!p) return null;
  // Groupes de 4 mots au plus, pour rester lisible sur téléphone.
  const groups: (typeof p.words)[] = [];
  p.words.forEach((w, i) => {
    if (i % 4 === 0) groups.push([]);
    groups[groups.length - 1].push(w);
  });
  const gi = Math.max(0, groups.findIndex((g, i) => f < (groups[i + 1]?.[0].f ?? Infinity)));
  const g = groups[gi];
  const enter = prog(f, g[0].f - 3, 8);
  return (
    <div style={{ position: "absolute", left: 60, right: 140, top: 1500, display: "flex", justifyContent: "center" }}>
      <div
        style={{
          background: "rgba(15,23,42,0.88)",
          borderRadius: 28,
          padding: "18px 30px",
          textAlign: "center",
          transform: `translateY(${mix(20, 0, enter)}px)`,
          opacity: enter,
          maxWidth: 880,
        }}
      >
        {g.map((w, i) => {
          const said = f >= w.f;
          const current = said && (g[i + 1] ? f < g[i + 1].f : f < p.to + 6);
          const s = pop(f, w.f, 12, 320);
          return (
            <span
              key={i}
              style={{
                ...body(52, current ? C.lane : C.white, 800),
                letterSpacing: "-0.02em",
                display: "inline-block",
                margin: "0 9px",
                opacity: said ? 1 : 0.35,
                transform: `scale(${current ? mix(1.15, 1.06, s) : 1})`,
              }}
            >
              {w.w}
            </span>
          );
        })}
      </div>
    </div>
  );
};

/** Titre de scène en haut : petit titre + grande phrase. */
const Headline: React.FC<{ at: number; kicker: string; lines: string[]; dark?: boolean }> = ({ at, kicker, lines, dark }) => (
  <div style={{ position: "absolute", left: 70, right: 140, top: 210 }}>
    <Kicker at={at} color={dark ? C.lane : C.green}>
      {kicker}
    </Kicker>
    <div style={{ ...display(80, dark ? C.white : C.asphalt), marginTop: 22 }}>
      {lines.map((l, i) => (
        <div key={i}>
          <Rise at={at + 4 + i * 5}>{l}</Rise>
        </div>
      ))}
    </div>
  </div>
);

// ---------------------------------------------------------------------------
// Scènes
// ---------------------------------------------------------------------------

const Hook: React.FC = () => {
  const f = useF();
  const words = ["Votre", "auto-école", "tourne", "encore", "au"];
  const q = wf("hook", "cahier");
  // Cahier qui tourne ses pages, griffonné.
  const book = pop(f, 4, 14, 120);
  return (
    <AbsoluteFill style={{ background: C.asphalt, transform: shake(f, [q + 2], 18) }}>
      <Lane y={1700} opacity={0.5} />
      <div
        style={{
          position: "absolute",
          left: 560,
          top: 300,
          width: 400,
          height: 500,
          borderRadius: 24,
          background: "#fffdf4",
          transform: `rotate(${mix(-30, 9, book)}deg) translateY(${mix(300, 0, book)}px)`,
          opacity: book,
          boxShadow: "0 40px 80px rgba(0,0,0,0.5)",
          overflow: "hidden",
        }}
      >
        <div style={{ position: "absolute", left: 70, top: 0, bottom: 0, width: 4, background: "#f87171" }} />
        {Array.from({ length: 10 }).map((_, i) => (
          <div key={i} style={{ position: "absolute", left: 0, right: 0, top: 60 + i * 44, height: 2, background: "#bfdbfe" }} />
        ))}
        {Array.from({ length: 7 }).map((_, i) => {
          const p = prog(f, 10 + i * 4, 10);
          return (
            <div
              key={i}
              style={{
                position: "absolute",
                left: 90,
                top: 70 + i * 44,
                height: 10,
                width: (180 + ((i * 53) % 110)) * p,
                borderRadius: 5,
                background: i === 4 ? "#ef4444" : "#475569",
                opacity: 0.7,
                transform: `rotate(${(i % 3) - 1}deg)`,
              }}
            />
          );
        })}
      </div>
      <div style={{ position: "absolute", left: 70, right: 140, top: 820, ...display(112) }}>
        {words.map((w, i) => (
          <span key={i} style={{ marginRight: 26 }}>
            <Rise at={wf("hook", w.replace("-", "")) - 3}>{w}</Rise>
          </span>
        ))}
        <span style={{ display: "inline-block" }}>
          <Slam at={q} from={2.6} rot={-8}>
            <span style={{ color: C.lane }}>cahier ?</span>
          </Slam>
        </span>
      </div>
    </AbsoluteFill>
  );
};

const Pain: React.FC = () => {
  const f = useF();
  const rows = [
    { w: "oubliés", label: "Élèves oubliés" },
    { w: "perdus", label: "Paiements perdus" },
    { w: "double", label: "Leçons en double" },
  ];
  const hits = rows.map((r) => wf("pain", r.w));
  return (
    <AbsoluteFill style={{ background: C.paper, transform: shake(f, hits, 12) }}>
      <div style={{ position: "absolute", left: 70, right: 120, top: 330, display: "flex", flexDirection: "column", gap: 70 }}>
        {rows.map((r, i) => {
          const at = hits[i] - 6;
          const strike = prog(f, hits[i], 10);
          const x = pop(f, hits[i] + 2, 10, 300);
          return (
            <div key={i} style={{ display: "flex", alignItems: "center", gap: 34 }}>
              <div
                style={{
                  width: 120,
                  height: 120,
                  borderRadius: 34,
                  background: C.red,
                  display: "grid",
                  placeItems: "center",
                  transform: `scale(${x}) rotate(${mix(-40, 0, x)}deg)`,
                  boxShadow: "0 20px 40px rgba(225,29,72,0.35)",
                }}
              >
                <svg width="64" height="64" viewBox="0 0 24 24" stroke="#fff" strokeWidth="3.4" strokeLinecap="round">
                  <path d="M6 6l12 12M18 6 6 18" />
                </svg>
              </div>
              <div style={{ position: "relative", ...display(78, C.asphalt) }}>
                <Slam at={at} from={1.6}>
                  {r.label}
                </Slam>
                <div style={{ position: "absolute", left: -6, top: "52%", height: 12, borderRadius: 6, width: `${strike * 104}%`, background: C.red }} />
              </div>
            </div>
          );
        })}
      </div>
    </AbsoluteFill>
  );
};

const Reveal: React.FC = () => {
  const f = useF();
  const at = wf("reveal", "sunupermis");
  const tel = wf("reveal", "téléphone");
  const circle = prog(f, SC.reveal.from, 18, inOut);
  const logo = pop(f, at - 2, 10, 220);
  const up = prog(f, tel - 10, 22);
  return (
    <AbsoluteFill style={{ background: C.asphalt }}>
      <AbsoluteFill style={{ background: C.green, clipPath: `circle(${circle * 140}% at 50% 40%)` }}>
        <Lane y={1840} />
        <div style={{ position: "absolute", left: 0, right: 0, top: mix(560, 230, up), display: "flex", flexDirection: "column", alignItems: "center", gap: 30 }}>
          <div style={{ transform: `scale(${mix(0.2, 1, logo) * mix(1, 0.62, up)}) rotate(${mix(-90, 0, logo)}deg)` }}>
            <LogoBadge size={260} />
          </div>
          <div style={{ ...display(mix(120, 92, up)), transform: `translateY(${mix(0, -40, up)}px)` }}>
            <Rise at={at}>
              Sunu<span style={{ color: C.lane }}>Permis</span>
            </Rise>
          </div>
        </div>
        <Phone
          src="screens/m-accueil.jpg"
          width={PW}
          aspect={PHONE_ASPECT}
          focus={[{ at: tel + 14, region: { x0: 0.02, x1: 0.98, y0: 0.34, y1: 0.49 }, zoom: 1.1 }]}
          style={{ position: "absolute", left: PX, top: mix(1950, 640, up), transform: `rotate(${mix(8, -2, up)}deg)` }}
        />
      </AbsoluteFill>
    </AbsoluteFill>
  );
};

const Eleve: React.FC = () => {
  const s = SC.eleve.from;
  const forfait = wf("eleve", "forfait");
  const lecons = wf("eleve", "leçons");
  const reste = wf("eleve", "reste");
  return (
    <Wipe at={s} bg={C.paper}>
      <Headline at={s + 6} kicker="Élèves" lines={["Chaque dossier,", "au même endroit"]} />
      <Phone
        src="screens/m-eleve.jpg"
        width={PW}
        aspect={PHONE_ASPECT}
        focus={[
          { at: forfait - 4, region: { x0: 0.03, x1: 0.97, y0: 0.765, y1: 0.93 }, zoom: 1.25 },
          { at: lecons - 4, region: { x0: 0.03, x1: 0.97, y0: 0.47, y1: 0.735 }, zoom: 1.3 },
          { at: reste - 4, region: { x0: 0.03, x1: 0.97, y0: 0.765, y1: 0.93 }, zoom: 1.3 },
        ]}
        style={{ position: "absolute", left: PX, top: 520 }}
      />
      <Chip at={forfait} x={40} y={600} rot={-4}>
        <div style={body(26, C.muted, 700)}>Forfait</div>
        <div style={body(44, C.asphalt, 800)}>300 000 FCFA</div>
      </Chip>
      <Chip at={lecons} x={640} y={760} rot={4} dark>
        <div style={body(26, C.lane, 700)}>Leçons</div>
        <div style={body(44, C.white, 800)}>4 / 20</div>
      </Chip>
      <Chip at={reste} x={560} y={1080} rot={-3}>
        <div style={body(26, C.muted, 700)}>Reste à payer</div>
        <div style={body(44, C.red, 800)}>100 000 FCFA</div>
      </Chip>
    </Wipe>
  );
};

const Planning: React.FC = () => {
  const f = useF();
  const s = SC.planning.from;
  const sem = wf("planning", "semaine");
  const dbl = wf("planning", "double");
  const ok = pop(f, dbl, 10, 240);
  return (
    <Wipe at={s} bg={C.asphalt}>
      <Headline at={s + 6} kicker="Planning" lines={["Toute la semaine,", "sans conflit"]} dark />
      <Phone
        src="screens/m-planning.jpg"
        width={PW}
        aspect={PHONE_ASPECT}
        focus={[
          { at: sem - 6, region: { x0: 0.02, x1: 0.98, y0: 0.565, y1: 0.665 }, zoom: 1.35 },
          { at: dbl - 14, region: { x0: 0.02, x1: 0.98, y0: 0.675, y1: 0.93 }, zoom: 1.2 },
        ]}
        style={{ position: "absolute", left: PX, top: 520 }}
      />
      <div
        style={{
          position: "absolute",
          left: 90,
          top: 1110,
          display: "flex",
          alignItems: "center",
          gap: 20,
          background: C.lane,
          borderRadius: 999,
          padding: "20px 36px 20px 22px",
          transform: `scale(${ok}) rotate(${mix(-12, -3, ok)}deg)`,
          boxShadow: "0 24px 50px rgba(0,0,0,0.4)",
        }}
      >
        <div style={{ width: 62, height: 62, borderRadius: "50%", background: C.asphalt, display: "grid", placeItems: "center" }}>
          <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke={C.lane} strokeWidth="3.4" strokeLinecap="round" strokeLinejoin="round">
            <path d="M5 12.5l4.5 4.5L19 7.5" />
          </svg>
        </div>
        <div style={body(40, C.asphalt, 800)}>0 créneau en double</div>
      </div>
    </Wipe>
  );
};

const Recu: React.FC = () => {
  const f = useF();
  const s = SC.recu.from;
  const methods = [
    { w: "wave", label: "Wave", color: "#1dc4ff" },
    { w: "orange", label: "Orange Money", color: "#ff7900" },
    { w: "espèces", label: "Espèces", color: C.green5 },
  ];
  const recu = wf("recu", "reçu");
  const qr = wf("recu", "qr");
  const paper = prog(f, recu - 14, 22);
  const qrPulse = pop(f, qr, 8, 200);
  // Le reçu remonte pour montrer le QR code.
  const scroll = prog(f, qr - 16, 20, inOut);
  return (
    <Wipe at={s} bg={C.green}>
      <Lane y={1860} />
      <Headline at={s + 6} kicker="Paiements" lines={["Un reçu à chaque", "paiement"]} dark />
      <div
        style={{
          position: "absolute",
          left: 250,
          top: mix(1900, 690, paper) - scroll * 560,
          width: 580,
          transform: `rotate(${mix(14, -3, paper)}deg)`,
          borderRadius: 26,
          overflow: "hidden",
          boxShadow: "0 50px 100px rgba(5,63,42,0.55)",
          background: C.white,
        }}
      >
        <Img src={staticFile("screens/recu.jpg")} style={{ width: 580, display: "block" }} />
        {/* QR code mis en valeur */}
        <div
          style={{
            position: "absolute",
            left: 580 * 0.47,
            top: 580 * (2061 / 780) * 0.8,
            width: 580 * 0.31,
            height: 580 * 0.31,
            borderRadius: 18,
            border: `6px solid ${C.lane}`,
            opacity: qrPulse,
            transform: `scale(${mix(1.6, 1, qrPulse)})`,
          }}
        />
      </div>
      <div style={{ position: "absolute", left: 70, top: 520, display: "flex", flexWrap: "wrap", gap: 18, width: 900 }}>
        {methods.map((m) => {
          const p = pop(f, wf("recu", m.w) - 2, 11, 260);
          return (
            <div
              key={m.w}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 14,
                background: C.white,
                borderRadius: 999,
                padding: "16px 30px 16px 20px",
                transform: `scale(${p}) translateY(${mix(40, 0, p)}px)`,
                boxShadow: "0 18px 40px rgba(5,63,42,0.35)",
              }}
            >
              <div style={{ width: 26, height: 26, borderRadius: "50%", background: m.color }} />
              <div style={body(38, C.asphalt, 800)}>{m.label}</div>
            </div>
          );
        })}
      </div>
    </Wipe>
  );
};

const Caisse: React.FC = () => {
  const f = useF();
  const s = SC.caisse.from;
  const caisse = wf("caisse", "caisse");
  const faite = wf("caisse", "faite");
  const stamp = pop(f, faite, 9, 260);
  return (
    <Wipe at={s} bg={C.paper}>
      <Headline at={s + 6} kicker="Caisse du jour" lines={["Le soir, tout est", "déjà compté"]} />
      <Phone
        src="screens/m-caisse.jpg"
        width={PW}
        aspect={PHONE_ASPECT}
        focus={[{ at: caisse - 8, region: { x0: 0.02, x1: 0.98, y0: 0.07, y1: 0.355 }, zoom: 1.15 }]}
        style={{ position: "absolute", left: PX, top: 520 }}
      />
      <Chip at={caisse} x={40} y={1040} rot={-4} dark>
        <div style={body(26, C.lane, 700)}>Encaissé aujourd'hui</div>
        <div style={body(52, C.white, 800)}>{money(count(f, caisse, 30, 0, 150000))}</div>
      </Chip>
      <div
        style={{
          position: "absolute",
          left: 660,
          top: 600,
          padding: "14px 26px",
          border: `6px solid ${C.green}`,
          borderRadius: 18,
          ...body(44, C.green, 800),
          letterSpacing: "0.08em",
          background: "rgba(255,255,255,0.92)",
          opacity: stamp,
          transform: `scale(${mix(2.4, 1, stamp)}) rotate(-12deg)`,
        }}
      >
        FAITE ✓
      </div>
    </Wipe>
  );
};

const Fin: React.FC = () => {
  const f = useF();
  const s = SC.fin.from;
  const logo = pop(f, s + 4, 10, 200);
  const tag = wf("fin", "votre");
  const cta = wf("fin", "inscrivez");
  const btn = pop(f, cta - 2, 10, 220);
  const pulse = 1 + Math.max(0, Math.sin((f - cta) / 6)) * 0.04 * (f > cta + 10 ? 1 : 0);
  return (
    <Wipe at={s} bg={C.asphalt}>
      <Lane y={1700} />
      <div style={{ position: "absolute", left: 0, right: 0, top: 360, display: "flex", flexDirection: "column", alignItems: "center" }}>
        <div style={{ transform: `scale(${logo}) rotate(${mix(-120, 0, logo)}deg)` }}>
          <LogoBadge size={230} />
        </div>
        <div style={{ ...display(124), marginTop: 50 }}>
          <Rise at={s + 8}>
            Sunu<span style={{ color: C.green5 }}>Permis</span>
          </Rise>
        </div>
        <div style={{ ...display(60, C.white), marginTop: 40, textAlign: "center", fontWeight: 700 }}>
          <Rise at={tag}>Votre auto-école,</Rise>
          <br />
          <Rise at={wf("fin", "sans")}>
            <span style={{ color: C.lane }}>sans le cahier.</span>
          </Rise>
        </div>
        <div
          style={{
            marginTop: 70,
            background: C.green,
            borderRadius: 999,
            padding: "30px 64px",
            ...body(50, C.white, 800),
            transform: `scale(${btn * pulse})`,
            boxShadow: "0 24px 60px rgba(11,138,90,0.55)",
          }}
        >
          Inscrivez-vous
        </div>
        <div style={{ ...body(48, C.lane, 800), marginTop: 36, opacity: prog(f, cta + 6, 14) }}>sunupermis.com</div>
      </div>
    </Wipe>
  );
};

const SCENES: Record<string, React.FC> = { hook: Hook, pain: Pain, reveal: Reveal, eleve: Eleve, planning: Planning, recu: Recu, caisse: Caisse, fin: Fin };

export const Short: React.FC = () => (
  <AbsoluteFill style={{ background: C.asphalt, fontFamily: FONT }}>
    {TL.scenes.map((s, i) => {
      const Scene = SCENES[s.id];
      // Chaque scène reste affichée sous la suivante le temps de son volet.
      const len = s.len + (i < TL.scenes.length - 1 ? 14 : 0);
      return (
        <Sequence key={s.id} from={s.from} durationInFrames={len}>
          <SceneStart.Provider value={s.from}>
            <Scene />
          </SceneStart.Provider>
        </Sequence>
      );
    })}
    {/* « fin » : pas de sous-titres, le texte est à l'écran */}
    <Sequence from={SC.pain.from} durationInFrames={SC.fin.from - SC.pain.from}>
      <SceneStart.Provider value={SC.pain.from}>
        <Captions />
      </SceneStart.Provider>
    </Sequence>
    <Audio src={staticFile("mix.wav")} />
  </AbsoluteFill>
);

// Évite l'avertissement « inutilisé » sur des aides gardées pour réglage.
void interpolate;
void phraseOf;
