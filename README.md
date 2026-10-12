# SunuPermis

Logiciel de gestion pour auto-écoles : élèves, planning des leçons sans double
réservation, forfaits payés en plusieurs fois, examens et rappels WhatsApp.

## Fonctions

- **Équipe** : le propriétaire invite une secrétaire ou un moniteur par un lien
  (WhatsApp ou copié). Le moniteur ne voit que ses leçons et jamais l'argent.
- **Rappels WhatsApp automatiques** chaque soir à 18 h, ou en un clic
  (`docs/WHATSAPP.md`). Sans configuration, un clic ouvre WhatsApp avec le
  message prêt.
- **Abonnement payé en ligne** par Bictorys : Wave, Orange Money ou carte
  (`docs/PAIEMENT.md`). Formule choisie et payée à l'inscription, sans essai.

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

La base se crée avec les migrations de `supabase/migrations`, dans l'ordre.

## Déploiement (Netlify)

Variables d'environnement : voir `.env.example`. Seules
`NEXT_PUBLIC_SUPABASE_URL` et `NEXT_PUBLIC_SUPABASE_ANON_KEY` sont
obligatoires ; les autres activent le paiement Bictorys, les rappels WhatsApp
automatiques et la tâche du soir.

La clé `SUPABASE_SERVICE_ROLE_KEY` n'est utilisée que par `/api/cron/rappels`
(protégé par `CRON_SECRET`). Les paiements sont validés avec
`PAYMENTS_SERVER_SECRET`, dont la base garde l'empreinte. Elle ne doit jamais avoir le préfixe `NEXT_PUBLIC_`.

Dans Supabase > Authentication > URL Configuration : *Site URL*
`https://sunupermis.netlify.app` et *Redirect URLs*
`https://sunupermis.netlify.app/**` (confirmation d'e-mail, mot de passe
oublié).
