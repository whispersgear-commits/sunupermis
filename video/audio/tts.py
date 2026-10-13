"""Voix off avec Piper (voix libre « siwis », locale). Écrit audio/raw/<scène>.wav.
usage : <venv>/bin/python audio/tts.py <modele.onnx>
Les sous-titres gardent l'orthographe ; seule la prononciation est adaptée ici."""
import json, os, re, sys, wave
import numpy as np
from piper import PiperVoice, SynthesisConfig

HERE = os.path.dirname(os.path.abspath(__file__))
SAY = [
    (r"sunupermis\.com", "sounou permis point com"),
    (r"SunuPermis", "Sounou Permis"),
    (r"Wave", "Ouève"),
    (r"Orange Money", "Orange Monè"),
    (r"QR code", "ku erre code"),
]

def say(t):
    for a, b in SAY:
        t = re.sub(a, b, t)
    return t

voice = PiperVoice.load(sys.argv[1])
cfg = SynthesisConfig(length_scale=0.9, noise_scale=0.6, noise_w_scale=0.75)
os.makedirs(os.path.join(HERE, "raw"), exist_ok=True)
for sid, text in json.load(open(os.path.join(HERE, "script.json"))):
    parts = []
    for ph in voice.phonemize(say(text)):
        if not ph:
            continue
        # Pas de voyelle nasale dans ce modèle : « ɑ̃ » devient « ɑŋ ».
        ph = ["ŋ" if p == "̃" else p for p in ph]
        parts += [voice.phoneme_ids_to_audio(voice.phonemes_to_ids(ph), cfg), np.zeros(int(0.18 * voice.config.sample_rate), np.float32)]
    a = np.concatenate(parts[:-1])
    a = a / max(1e-6, np.max(np.abs(a))) * 0.9
    with wave.open(os.path.join(HERE, "raw", f"{sid}.wav"), "wb") as w:
        w.setframerate(voice.config.sample_rate); w.setsampwidth(2); w.setnchannels(1)
        w.writeframes((a * 32767).astype(np.int16).tobytes())
    print(sid, round(len(a) / voice.config.sample_rate, 2))
