# SunuPermis — short motion design (Remotion)

Vidéo verticale 9:16 de 35,7 s (1080 × 1920, 30 i/s) avec voix off, sous-titres
mot à mot et vraies captures de la plateforme (données de démonstration).

```bash
npm install
npm run studio   # aperçu dans le navigateur
npm run audio    # voix calée, musique, effets, mixage → public/mix.wav + src/timeline.json
npm run render   # → out/SUNUPERMIS-short-9x16.mp4
```

## Déroulé

| Scène | Voix |
|---|---|
| Accroche | Votre auto-école tourne encore au cahier ? |
| Problème | Des élèves oubliés, des paiements perdus, des leçons en double. |
| Révélation | Avec SunuPermis, tout est sur votre téléphone. |
| Élèves | Chaque élève : son forfait, ses leçons, et ce qu'il reste à payer. |
| Planning | Le planning de la semaine, sans aucun créneau en double. |
| Reçu | Wave, Orange Money ou espèces : chaque paiement donne un reçu avec QR code. |
| Caisse | Et le soir, la caisse du jour est déjà faite. |
| Fin | SunuPermis. Votre auto-école, sans le cahier. Inscrivez-vous sur sunupermis.com |

Le texte est dans `audio/script.json` ; tout le minutage en découle.

## Son

- **Voix** : Piper, voix libre française « siwis » (fichier `voice-fr-siwis-medium`
  des versions publiées de rhasspy/piper sur GitHub), générée localement par
  `audio/tts.py` ; les prises sont dans `audio/raw/`. Les noms sont réécrits
  pour la prononciation seulement (« Sounou Permis », « Ouève »…).
  Pour une voix ElevenLabs (Paul K, comme les pubs Sunu Livreur), remplacer les
  fichiers de `audio/raw/` (même nom, une réplique par scène) puis `npm run audio`.
- **Musique** originale synthétisée dans `audio/build.py` : afro-house 118 BPM,
  mineur sur le problème, majeur dès « Avec SunuPermis ». Aucun échantillon externe.
- **Effets** synthétisés (souffles, impacts, clics, ding du reçu), placés sur les mots.
- **Mixage** : musique baissée sous la voix, master −14 LUFS, crête ≤ −1 dBTP.

## Images

`public/screens/` : captures du logiciel (téléphone) et du reçu avec QR code.
Les zones mises en valeur sont réglées dans `src/Short.tsx` (`focus`).
