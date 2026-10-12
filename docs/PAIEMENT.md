# Paiement de l'abonnement en ligne (Bictorys)

Il n'y a pas d'essai gratuit : la formule est choisie **à l'inscription** et
l'espace s'ouvre dès que le premier paiement est confirmé. Ensuite, le
propriétaire renouvelle depuis **Abonnement** dans l'application.

Le paiement passe par **Bictorys** : le client paie sur la page sécurisée de
Bictorys, par Wave, Orange Money ou carte bancaire.

## 1. Compte Bictorys

1. Ouvrir un compte marchand sur <https://dashboard.bictorys.com>.
2. **Développeurs > Clés API** : copier la **clé publique** (bac à sable pour
   les essais, production ensuite).
3. **Développeurs > Webhooks** :
   - URL : `https://sunupermis.com/api/bictorys/webhook`
   - Copier la **clé secrète du webhook** : Bictorys l'envoie dans l'en-tête
     `X-Secret-Key` de chaque notification.

## 2. Variables d'environnement (Netlify)

| Variable | Valeur |
| --- | --- |
| `BICTORYS_API_KEY` | clé publique Bictorys |
| `BICTORYS_WEBHOOK_SECRET` | clé secrète du webhook |
| `BICTORYS_MODE` | `live` en production ; absente = bac à sable |
| `PAYMENTS_SERVER_SECRET` | secret du serveur (voir ci-dessous) |
| `NEXT_PUBLIC_SITE_URL` | `https://sunupermis.com` |

`PAYMENTS_SERVER_SECRET` remplace la clé de service Supabase pour valider les
paiements : la base n'en garde que l'empreinte SHA-256, dans la table
`app_secrets` (illisible depuis l'application). Pour le changer :

```sql
insert into app_secrets (name, hash)
values ('payments_server', encode(extensions.digest('<nouveau secret>', 'sha256'), 'hex'))
on conflict (name) do update set hash = excluded.hash;
```

puis mettre la même valeur dans Netlify et redéployer.

Tant qu'une de ces variables manque, l'inscription mène à la page Abonnement,
qui propose un bouton WhatsApp vers `SUPPORT_WHATSAPP` à la place du paiement.

## 3. Déroulé d'un paiement

1. Le propriétaire choisit une formule (mensuelle, ou annuelle = 10 mois),
   à l'inscription ou sur la page Abonnement.
2. `/app/abonnement/payer` crée une charge Bictorys et enregistre un paiement
   « en attente » portant la référence Bictorys, puis redirige vers la page
   de paiement Bictorys.
3. Au retour (`/app/abonnement?paiement=ok&ref=…`), le serveur relit la
   transaction chez Bictorys et, si elle est réussie, prolonge l'abonnement.
4. Bictorys appelle aussi le webhook : le serveur vérifie `X-Secret-Key`, puis
   relit à son tour la transaction chez Bictorys (le contenu de la
   notification n'est jamais cru tel quel). La validation est idempotente.

Personne ne peut prolonger un abonnement autrement : la base refuse toute
modification de `paid_until`, `plan` ou `trial_ends_at` faite depuis
l'application, et les fonctions de validation exigent le secret du serveur.

## 4. À vérifier au premier paiement réel

Ce module suit la documentation publique de Bictorys ; il n'a pas encore été
testé contre l'API réelle. Faire d'abord un paiement en bac à sable (sans
`BICTORYS_MODE`), puis vérifier dans Supabase que la ligne de
`subscription_payments` est passée à `paid` et que `schools.paid_until` a
avancé. Les journaux se lisent dans Netlify (Logs > Functions) : les lignes
`bictorys charge` donnent la réponse de Bictorys en cas de refus, et une
réponse `401` du webhook signale un mauvais secret.
