# Paiement de l'abonnement en ligne (Wave)

Le propriétaire d'une auto-école paie son abonnement depuis **Abonnement**
dans l'application. Le paiement passe par l'API Checkout de **Wave Business**.

## 1. Compte Wave Business

1. Ouvrir un compte marchand sur <https://business.wave.com> (pièces de
   l'entreprise : NINEA, registre de commerce).
2. Dans le portail : **Développeurs > Clés API**, créer une clé avec la
   permission **Checkout API**. La copier (elle n'est affichée qu'une fois).
3. **Développeurs > Webhooks**, ajouter :
   - URL : `https://sunupermis.netlify.app/api/wave/webhook`
   - Événements : `checkout.session.completed`
   - Stratégie de sécurité : **signature partagée** (« shared secret »).
     Copier le secret.

## 2. Variables d'environnement (Netlify)

| Variable | Valeur |
| --- | --- |
| `WAVE_API_KEY` | clé API Checkout |
| `WAVE_WEBHOOK_SECRET` | secret du webhook |
| `SUPABASE_SERVICE_ROLE_KEY` | clé `service_role` de Supabase (secrète) |
| `NEXT_PUBLIC_SITE_URL` | `https://sunupermis.netlify.app` |

Redéployer ensuite le site. Tant qu'une de ces variables manque, la page
Abonnement propose un bouton WhatsApp vers `SUPPORT_WHATSAPP` à la place.

## 3. Déroulé d'un paiement

1. Le propriétaire choisit une formule (mensuelle, ou annuelle = 10 mois).
2. Le serveur crée une session Wave et enregistre un paiement « en attente »
   portant l'identifiant de la session.
3. Le propriétaire paie dans Wave, puis revient sur `/app/abonnement`.
4. Wave appelle le webhook. Le serveur vérifie la signature
   (`Wave-Signature`, HMAC-SHA256), puis que le montant reçu est exactement
   celui attendu, et seulement alors prolonge l'abonnement
   (`confirm_subscription_payment`). Le temps payé s'ajoute à la date de fin
   en cours : payer en avance ne fait rien perdre.

Personne ne peut prolonger un abonnement autrement : la base refuse toute
modification de `paid_until`, `plan` ou `trial_ends_at` faite depuis
l'application.

## 4. À vérifier au premier paiement réel

Ce module suit la documentation publique de Wave ; il n'a pas encore été
testé contre l'API réelle. Faire un premier paiement de test (formule
Essentiel, 1 mois), puis vérifier dans Supabase que la ligne de
`subscription_payments` est passée à `paid` et que `schools.paid_until` a
avancé. En cas d'échec, les journaux de la fonction se lisent dans Netlify
(Logs > Functions) : une réponse `401` du webhook signale un problème de
secret ou de signature.
