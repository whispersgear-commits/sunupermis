"""Montage audio du short SunuPermis.

1. Voix (audio/raw/*.wav, Piper) : silences rognés, placée scène après scène.
2. Minutage : src/timeline.json (scènes, phrases, image de chaque mot).
3. Musique originale synthétisée (afro-house 118 BPM) : mineur sur le
   problème, majeur dès « Avec SunuPermis », impact sur l'écran final.
4. Effets synthétisés (souffles, impacts, clics, ding du reçu).
5. Mixage : musique baissée sous la voix, master -14 LUFS, crête <= -1 dBTP
   (ffmpeg loudnorm). Écrit audio/mix.wav.

Rien n'est téléchargé : tout le son est généré ici.
usage : python3 audio/build.py   (numpy + ffmpeg)
"""
import json, os, re, subprocess, wave
import numpy as np

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.dirname(HERE)
SR = 48000
FPS = 30
LEAD = 0.35   # image avant la voix, à chaque scène
TAIL = 0.30   # respiration après la voix
END_HOLD = 1.8
rng = np.random.default_rng(7)


def read_voice(path):
    raw = subprocess.run(["ffmpeg", "-loglevel", "error", "-i", path, "-ac", "1", "-ar", str(SR), "-f", "s16le", "-"],
                         capture_output=True, check=True).stdout
    a = np.frombuffer(raw, np.int16).astype(np.float32) / 32768
    env = np.convolve(np.abs(a), np.ones(480) / 480, mode="same")
    idx = np.where(env > 0.02)[0]
    return a[max(0, idx[0] - 960): idx[-1] + 2400]


def word_frames(text, a, start_s):
    """Image de chaque mot : les lettres sont réparties sur le temps voisé."""
    hop = 480
    rms = np.sqrt(np.convolve(a ** 2, np.ones(hop) / hop, mode="same"))[::hop]
    voiced = rms > 0.03
    t_voiced = np.cumsum(voiced) / max(1, voiced.sum())
    words = text.split()
    weights = np.array([len(re.sub(r"[^\wÀ-ÿ]", "", w)) + 1 for w in words], float)
    starts = np.concatenate([[0], np.cumsum(weights)[:-1]]) / weights.sum()
    out = []
    for w, q in zip(words, starts):
        i = int(np.searchsorted(t_voiced, q + 1e-6))
        out.append({"w": w, "f": int(round((start_s + i * hop / SR) * FPS))})
    return out


# ---------------------------------------------------------------------------
# Voix et minutage
# ---------------------------------------------------------------------------
script = json.load(open(os.path.join(HERE, "script.json")))
t = 0.0
scenes, phrases, voice_track = [], [], []
for sid, text in script:
    a = read_voice(os.path.join(HERE, "raw", f"{sid}.wav"))
    dur = len(a) / SR
    v0 = t + LEAD
    length = LEAD + dur + TAIL + (END_HOLD if sid == "fin" else 0)
    scenes.append({"id": sid, "from": int(round(t * FPS)), "len": int(round(length * FPS))})
    phrases.append({"scene": sid, "text": text, "from": int(round(v0 * FPS)), "to": int(round((v0 + dur) * FPS)), "words": word_frames(text, a, v0)})
    voice_track.append((v0, a))
    t += length
# Les scènes se touchent exactement.
for i in range(len(scenes) - 1):
    scenes[i]["len"] = scenes[i + 1]["from"] - scenes[i]["from"]
total_frames = scenes[-1]["from"] + scenes[-1]["len"]
N = int(total_frames / FPS * SR) + SR
json.dump({"fps": FPS, "durationInFrames": total_frames, "scenes": scenes, "phrases": phrases},
          open(os.path.join(ROOT, "src", "timeline.json"), "w"), ensure_ascii=False, indent=1)

voice = np.zeros(N, np.float32)
for v0, a in voice_track:
    i = int(v0 * SR)
    voice[i:i + len(a)] += a
# Légère compression : on ramène les crêtes.
voice = np.tanh(voice * 1.6) / np.tanh(1.6)

S = {s["id"]: s["from"] / FPS for s in scenes}

# ---------------------------------------------------------------------------
# Musique
# ---------------------------------------------------------------------------
BPM = 118
B = 60 / BPM
music = np.zeros((N, 2), np.float32)


def add(buf, at, sig, pan=0.0, gain=1.0):
    i = int(at * SR)
    if i >= len(buf) or i < 0:
        return
    sig = sig[: len(buf) - i] * gain
    buf[i:i + len(sig), 0] += sig * (1 - max(0, pan))
    buf[i:i + len(sig), 1] += sig * (1 + min(0, pan))


def env(n, a=0.002, d=0.2):
    tt = np.arange(n) / SR
    return np.minimum(1, tt / a) * np.exp(-tt / d)


def kick():
    n = int(0.45 * SR); tt = np.arange(n) / SR
    f = 48 + 110 * np.exp(-tt * 28)
    return np.sin(2 * np.pi * np.cumsum(f) / SR) * env(n, 0.001, 0.18)


def lowpass(x, k):
    return np.convolve(x, np.ones(k) / k, mode="same")


def hat(d=0.04):
    n = int(0.12 * SR)
    x = rng.standard_normal(n)
    return (x - lowpass(x, 6)) * env(n, 0.001, d) * 0.5


def clap():
    n = int(0.25 * SR)
    x = rng.standard_normal(n)
    x = x - lowpass(x, 30)
    e = sum(env(n, 0.001, 0.012) * (np.arange(n) >= int(k * SR)) for k in (0, 0.011, 0.022)) + env(n, 0.001, 0.09) * 0.6
    return x * e * 0.35


def note(freq, dur, kind="pluck"):
    n = int(dur * SR); tt = np.arange(n) / SR
    if kind == "pluck":   # corde pincée, un peu kora
        s = sum(np.sin(2 * np.pi * freq * h * tt) / h ** 1.6 for h in (1, 2, 3, 4))
        return s * env(n, 0.002, 0.28)
    if kind == "pad":
        s = sum(np.sin(2 * np.pi * freq * (1 + d) * tt) for d in (-0.003, 0, 0.004))
        return s / 3 * np.minimum(1, tt / 0.25) * np.minimum(1, (dur - tt) / 0.3)
    if kind == "bass":
        s = np.sin(2 * np.pi * freq * tt) + 0.25 * np.sin(4 * np.pi * freq * tt)
        return s * env(n, 0.004, 0.35)


hz = lambda m: 440 * 2 ** ((m - 69) / 12)
# Problème : la mineur, fa, do, sol. Solution : do majeur, sol, la m, fa.
MINOR = [[57, 60, 64], [53, 57, 60], [48, 52, 55], [55, 59, 62]]
MAJOR = [[60, 64, 67], [55, 59, 62], [57, 60, 64], [53, 57, 60]]
reveal = S["reveal"]
end_t = S["fin"]
song_end = total_frames / FPS
nbars = int(song_end / (4 * B)) + 2
# La grille démarre pour qu'une mesure tombe pile sur la révélation.
t0 = reveal - int(reveal / (4 * B)) * 4 * B
for bar in range(-1, nbars):
    bt = t0 + bar * 4 * B
    if bt + 4 * B < 0:
        continue
    solved = bt >= reveal - 1e-3
    chords = MAJOR if solved else MINOR
    ch = chords[bar % 4]
    # nappe
    for m in ch:
        add(music, bt, note(hz(m), 4 * B, "pad"), gain=0.05)
    # arpège pincé
    pattern = [0, 1, 2, 1, 0, 2, 1, 2]
    for k, p in enumerate(pattern):
        add(music, bt + k * B / 2, note(hz(ch[p] + 12), 0.6), pan=0.35 if k % 2 else -0.35, gain=0.09 if solved else 0.07)
    if not solved:
        # avant la solution : pulsation sourde, sans batterie complète
        add(music, bt, kick(), gain=0.35)
        add(music, bt + 2 * B, kick(), gain=0.25)
        continue
    # groove
    for beat in range(4):
        add(music, bt + beat * B, kick(), gain=0.75)
        add(music, bt + beat * B + B / 2, hat(), pan=0.2, gain=0.5)
        add(music, bt + beat * B + 3 * B / 4, hat(0.02), pan=-0.2, gain=0.3)
        add(music, bt + beat * B + B / 4, hat(0.015), pan=0.1, gain=0.2)
    add(music, bt + B, clap(), gain=0.6)
    add(music, bt + 3 * B, clap(), gain=0.6)
    for k, off in enumerate([0, 0.75, 1.5, 2.5, 3.25]):
        add(music, bt + off * B, note(hz(ch[0] - 24), 0.5, "bass"), gain=0.32)

# Fin : la musique s'éteint après le dernier impact.
tt = np.arange(N) / SR
fade = np.clip((song_end + 0.4 - tt) / 1.6, 0, 1)
music *= fade[:, None]

# ---------------------------------------------------------------------------
# Effets
# ---------------------------------------------------------------------------
sfx = np.zeros((N, 2), np.float32)


def whoosh(d=0.45, up=True):
    n = int(d * SR)
    x = rng.standard_normal(n)
    k = np.linspace(40, 4, n).astype(int) if up else np.linspace(4, 40, n).astype(int)
    y = np.array([0.0] * n)
    c = np.cumsum(np.concatenate([[0], x]))
    for i in range(n):
        lo = max(0, i - k[i]); y[i] = (c[i + 1] - c[lo]) / (i + 1 - lo)
    shape = np.sin(np.pi * np.arange(n) / n) ** 2
    return y * shape * 3


def impact():
    n = int(0.8 * SR); tt = np.arange(n) / SR
    f = 40 + 80 * np.exp(-tt * 12)
    boom = np.sin(2 * np.pi * np.cumsum(f) / SR) * env(n, 0.001, 0.35)
    x = rng.standard_normal(n)
    return boom + lowpass(x, 10) * env(n, 0.001, 0.05) * 0.8


def click():
    n = int(0.06 * SR); tt = np.arange(n) / SR
    return np.sin(2 * np.pi * (1800 - 9000 * tt) * tt) * env(n, 0.0005, 0.012)


def pop():
    n = int(0.18 * SR); tt = np.arange(n) / SR
    f = 300 + 700 * np.exp(-tt * 40)
    return np.sin(2 * np.pi * np.cumsum(f) / SR) * env(n, 0.001, 0.05)


def ding():
    n = int(1.2 * SR); tt = np.arange(n) / SR
    return (np.sin(2 * np.pi * 1318.5 * tt) + 0.6 * np.sin(2 * np.pi * 1975.5 * tt) + 0.3 * np.sin(2 * np.pi * 2637 * tt)) * env(n, 0.002, 0.35) * 0.5


def word_t(sid, prefix):
    p = next(x for x in phrases if x["scene"] == sid)
    w = next(x for x in p["words"] if x["w"].lower().startswith(prefix.lower()))
    return w["f"] / FPS


for s in scenes[1:]:
    add(sfx, s["from"] / FPS - 0.3, whoosh(), gain=0.5)
# accroche : point d'interrogation qui tombe
add(sfx, word_t("hook", "cahier") + 0.1, impact(), gain=0.35)
# trois problèmes rayés
for w in ("oubliés", "perdus", "double"):
    add(sfx, word_t("pain", w), pop(), gain=0.45)
# révélation
add(sfx, word_t("reveal", "SunuPermis"), impact(), gain=0.7)
# détails des écrans
for sid, w in (("eleve", "forfait"), ("eleve", "leçons"), ("eleve", "reste"), ("planning", "planning"), ("planning", "double")):
    add(sfx, word_t(sid, w), click(), gain=0.5)
for w in ("Wave", "Orange", "espèces"):
    add(sfx, word_t("recu", w), pop(), gain=0.4)
add(sfx, word_t("recu", "reçu"), ding(), gain=0.5)
add(sfx, word_t("caisse", "caisse"), ding(), gain=0.35)
add(sfx, S["fin"] + 0.05, impact(), gain=0.8)
add(sfx, word_t("fin", "Inscrivez"), click(), gain=0.5)

# ---------------------------------------------------------------------------
# Mixage
# ---------------------------------------------------------------------------
def norm_rms(x, target_db):
    r = np.sqrt(np.mean(x[np.abs(x) > 1e-4] ** 2)) if np.any(np.abs(x) > 1e-4) else 1
    return x * (10 ** (target_db / 20) / r)


voice = norm_rms(voice, -16)
music = norm_rms(music, -21)
sfx = norm_rms(sfx, -24)
venv = np.convolve(np.abs(voice), np.ones(4800) / 4800, mode="same")
speaking = np.convolve((venv > 0.01).astype(float), np.ones(9600) / 9600, mode="same")
duck = 10 ** (-(11 * np.clip(speaking * 1.5, 0, 1)) / 20)
sduck = 10 ** (-(4 * np.clip(speaking * 1.5, 0, 1)) / 20)
mix = music * duck[:, None] + sfx * sduck[:, None] + voice[:, None]
mix = mix[: int(total_frames / FPS * SR)]

pre = os.path.join(HERE, "premix.wav")
with wave.open(pre, "wb") as w:
    w.setframerate(SR); w.setsampwidth(2); w.setnchannels(2)
    w.writeframes((np.clip(mix / max(1, np.max(np.abs(mix)) * 1.05), -1, 1) * 32767).astype(np.int16).tobytes())
subprocess.run(["ffmpeg", "-loglevel", "error", "-y", "-i", pre, "-af", "loudnorm=I=-14:TP=-1:LRA=9", "-ar", str(SR),
                os.path.join(HERE, "mix.wav")], check=True)
os.remove(pre)
os.makedirs(os.path.join(ROOT, "public"), exist_ok=True)
subprocess.run(["cp", os.path.join(HERE, "mix.wav"), os.path.join(ROOT, "public", "mix.wav")], check=True)
print(f"durée {total_frames / FPS:.2f} s · {total_frames} images · scènes :", [(s['id'], round(s['from'] / FPS, 2)) for s in scenes])
