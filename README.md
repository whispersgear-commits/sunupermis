# SunuPermis

Logiciel de gestion pour auto-écoles : élèves, planning des leçons sans double
réservation, forfaits payés en plusieurs fois, examens et rappels WhatsApp.

## Pile

- **Next.js 15** (App Router, actions serveur), **TypeScript**, **Tailwind CSS 4**
- **Motion** pour les animations (respecte « réduire les animations » du système)
- **Supabase** : base Postgres, authentification, sécurité par ligne (RLS)

## Sécurité

Chaque auto-école ne voit que ses propres données. Ce n'est pas l'interface qui
filtre : ce sont les politiques RLS de la base (`supabase/migrations`). Un
déclencheur vérifie en plus qu'une leçon, un paiement ou un examen ne
référence que des élèves, moniteurs et voitures de la même école, et une
contrainte d'exclusion interdit à un moniteur ou une voiture d'être sur deux
leçons en même temps.

## Démarrer

```bash
cp .env.example .env.local   # URL et clé publique du projet Supabase
npm install
npm run dev
```

La base se crée avec la migration `supabase/migrations/20261009000001_init.sql`.

## Déploiement (Netlify)

Variables d'environnement à renseigner : `NEXT_PUBLIC_SUPABASE_URL` et
`NEXT_PUBLIC_SUPABASE_ANON_KEY` (clé publique). Aucune clé secrète n'est
utilisée par l'application.
