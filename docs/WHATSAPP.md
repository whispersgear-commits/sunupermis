# Rappels WhatsApp automatiques

Sans configuration, SunuPermis ouvre WhatsApp avec le message prêt (un clic par
élève). Avec l'API WhatsApp Cloud de Meta, les rappels partent seuls.

## 1. Compte Meta

1. Créer un compte sur <https://business.facebook.com> (Meta Business Suite).
2. Sur <https://developers.facebook.com>, créer une application de type
   « Business » et y ajouter le produit **WhatsApp**.
3. Ajouter un numéro de téléphone dédié (il ne doit pas être déjà utilisé
   dans l'application WhatsApp) et le vérifier par SMS.
4. Créer un **utilisateur système** (Paramètres de l'entreprise > Utilisateurs
   > Utilisateurs système), lui donner accès à l'application et au compte
   WhatsApp, puis générer un **jeton permanent** avec les permissions
   `whatsapp_business_messaging` et `whatsapp_business_management`.
5. Noter l'**ID du numéro de téléphone** (WhatsApp > Configuration de l'API).

## 2. Modèles de messages

Un message envoyé à l'initiative de l'auto-école doit utiliser un modèle
validé par Meta. Créer ces deux modèles (catégorie **Utilitaire**, langue
**Français**) dans WhatsApp Manager > Modèles de messages.

**`rappel_lecon`** (4 variables)

```
Bonjour {{1}}, petit rappel : vous avez une leçon de conduite {{2}} avec {{3}}. À bientôt ! — {{4}}
```

Exemple : `Awa` · `ven. 10 octobre à 09:00` · `Moussa Diop` · `Auto-école Teranga`

**`rappel_paiement`** (3 variables)

```
Bonjour {{1}}, il reste {{2}} à régler sur votre formation au permis. Merci de passer au bureau ou de payer par Wave / Orange Money. — {{3}}
```

Exemple : `Awa` · `25 000 FCFA` · `Auto-école Teranga`

Les noms peuvent être changés avec `WHATSAPP_TEMPLATE_LESSON` et
`WHATSAPP_TEMPLATE_PAYMENT`, la langue avec `WHATSAPP_TEMPLATE_LANGUAGE`
(code `fr` par défaut). L'ordre des variables doit rester le même.

## 3. Variables d'environnement (Netlify)

| Variable | Valeur |
| --- | --- |
| `WHATSAPP_TOKEN` | jeton permanent de l'utilisateur système |
| `WHATSAPP_PHONE_NUMBER_ID` | ID du numéro de téléphone |
| `SUPABASE_SERVICE_ROLE_KEY` | clé `service_role` de Supabase (secrète) |
| `CRON_SECRET` | une longue chaîne aléatoire (`openssl rand -hex 32`) |

Redéployer ensuite le site.

## 4. Fonctionnement

- **Chaque soir à 18 h** (heure de Dakar), la fonction planifiée Netlify
  `rappels-quotidiens` appelle `/api/cron/rappels`. Pour chaque auto-école
  dont l'abonnement est actif et qui a activé l'envoi automatique (Réglages),
  chaque élève ayant une leçon le lendemain reçoit `rappel_lecon`, et chaque
  élève en retard de paiement reçoit `rappel_paiement` (au plus une fois par
  semaine).
- **Bouton « Envoyer tous les rappels WhatsApp »** sur l'accueil : envoie tout
  de suite les rappels du lendemain, sans attendre 18 h.
- Une leçon ne reçoit jamais deux rappels : le journal `message_log` a un
  index unique par leçon, même si le bouton et la tâche du soir se croisent.

Coût : Meta facture les messages « utilitaires » à l'unité (quelques francs
CFA par message au Sénégal). Vérifier le tarif en vigueur dans WhatsApp Manager.
