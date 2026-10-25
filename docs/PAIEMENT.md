# Paiement et formule Famille — procédure pour Antoine

Tout est prêt dans le code, **en mode test et coupé pour les joueurs**. Rien ne change pour eux tant que tu n'as pas fait la
dernière étape (« Passer en réel »). Ce document se suit dans l'ordre ; compte 2 à 3 soirées (Apple est le plus long :
contrat, banque et fiscalité à valider).

> **Règle d'or : aucune clé secrète ne passe par Claude, par le dépôt GitHub ou par l'app.**
> Les clés secrètes (`sk_…`, `whsec_…`, l'en-tête RevenueCat) se tapent **toi-même** dans Supabase › Edge Functions › Secrets.
> Seules les clés **publiques** (`pk_test_…`, `pk_live_…`, `appl_…`) vont dans le back office (Contenu et réglages › Paiement).

## 0. L'offre (décidée le 26/10/2026)

| Formule | Prix TTC | Essai | Identifiant Stripe (lookup key) | Identifiant App Store |
|---|---|---|---|---|
| Solo mensuel (1 personne) | 17,99 €/mois *(à confirmer)* | — | `solo_month` | `pc_solo_month` |
| Solo annuel (1 personne) | 149 €/an | 7 jours | `solo_year` | `pc_solo_year` |
| Famille annuel (jusqu'à 4 personnes, chacun son compte) | 199 €/an | — | `family_year` | `pc_family_year` |

Pas d'offre à vie. Les prix **affichés** dans l'app viennent de `PREM_OFFER` (début du module Premium de
`src/piano-challenges.html`) ou de la clé `prem_offer` du back office ; l'économie de l'annuel (−31 %) et le « soit 12,42 €/mois »
se calculent tout seuls. Les prix **facturés** viennent de Stripe et d'App Store Connect : **garde-les identiques**.

Ce qui existe déjà :

- **SQL** `supabase/migrations/2026-10-26_family.sql` (recopié dans `schema.sql`) : tables `subscriptions`, `families`,
  `family_members`, `family_invites`, fonctions `my_entitlement()`, `family_*`, `sub_apply` (écriture par les serveurs
  seulement), `admin_pay`, `admin_family`.
- **Fonction Edge `stripe`** (`supabase/functions/stripe/index.ts`) : `/checkout`, `/portal`, `/webhook`.
- **Fonction Edge `revenuecat`** (`supabase/functions/revenuecat/index.ts`) : webhook des achats Apple.
- **App** : paywall Solo / Famille, Réglages › Abonnement › « Ma famille » (inviter, retirer, quitter), lien
  `https://pianochallenges.com/?fam=<CODE>`, lecture des droits par `my_entitlement()`, couche RevenueCat inactive tant
  que la clé publique iOS est vide.
- **Back office** : écran Paiements (abonnés, essais, revenus mensuels estimés, résiliations, familles), fiche d'un joueur
  › « Famille et abonnements ».

## 1. Supabase (10 min)

1. **SQL Editor › New query** : colle tout `supabase/migrations/2026-10-26_family.sql`, **Run**. (Relançable sans risque.)
2. Vérifie dans le back office (`/admin` › Paiements) : l'écran s'affiche avec des zéros.
3. Déploie les deux fonctions (sur ton Mac, dans le dossier du dépôt, après `supabase login` et `supabase link --project-ref ijdxeasxmgevuchyuenn`) :
   ```
   supabase functions deploy stripe --no-verify-jwt
   supabase functions deploy revenuecat --no-verify-jwt
   ```
   `--no-verify-jwt` parce que Stripe et RevenueCat n'ont pas de jeton Supabase : `/webhook` vérifie la **signature Stripe**,
   `revenuecat` vérifie **l'en-tête d'autorisation**, et `/checkout` / `/portal` revérifient eux-mêmes le jeton du joueur.
4. Les secrets se tapent dans **Dashboard › Edge Functions › Secrets** (champ *Key* / *Value*, **Save** ; *Add another* pour
   plusieurs) ou en ligne de commande `supabase secrets set NOM=valeur`. Ils sont lus tout de suite, sans redéployer.
   `SUPABASE_URL` et `SUPABASE_SERVICE_ROLE_KEY` sont déjà fournis par Supabase.
   Source : [Supabase — Environment Variables](https://supabase.com/docs/guides/functions/secrets.md).

## 2. Stripe, en mode test d'abord (30 min)

1. Crée le compte sur stripe.com (entreprise : ta structure, pays France, compte bancaire). Tout se fait d'abord avec le
   bouton **Mode test** activé (en haut du tableau de bord) : rien n'est encaissé.
2. **Catalogue de produits › Ajouter un produit** :
   - « Piano Challenges Solo » avec **deux prix récurrents** : 17,99 € par mois (*lookup key* `solo_month`) et 149 € par an
     (`solo_year`). Prix TTC : coche « TVA incluse » si tu actives Stripe Tax.
   - « Piano Challenges Famille » avec un prix récurrent 199 € par an (`family_year`).
   - Note les trois identifiants `price_…` (fiche du prix).
   - **Ne mets pas l'essai sur le prix** : c'est la fonction qui l'ajoute (7 jours, Solo annuel seulement, une seule fois par
     compte, sans carte demandée ; sans carte à la fin de l'essai, l'abonnement s'annule tout seul).
     Source : [Stripe — Configure free trials for Checkout](https://docs.stripe.com/payments/checkout/free-trials).
3. **Développeurs › Clés API** : copie la **clé secrète de test** `sk_test_…` et tape-la toi-même dans les secrets Supabase :
   | Secret | Valeur |
   |---|---|
   | `STRIPE_SECRET_KEY` | `sk_test_…` (puis `sk_live_…` au passage en réel) |
   | `STRIPE_PRICE_SOLO_MONTH` | `price_…` du Solo mensuel |
   | `STRIPE_PRICE_SOLO_YEAR` | `price_…` du Solo annuel |
   | `STRIPE_PRICE_FAMILY_YEAR` | `price_…` de la Famille |
   | `STRIPE_WEBHOOK_SECRET` | `whsec_…` (étape 4) |
   | `SITE_URL` *(facultatif)* | `https://pianochallenges.com` (défaut) |
   | `TRIAL_DAYS` *(facultatif)* | `7` (défaut) |
4. **Développeurs › Webhooks › Ajouter une destination** (endpoint) :
   - URL : `https://ijdxeasxmgevuchyuenn.supabase.co/functions/v1/stripe/webhook`
   - Événements à cocher : `checkout.session.completed`, `customer.subscription.created`, `customer.subscription.updated`,
     `customer.subscription.deleted`, `invoice.paid`, `invoice.payment_failed`.
   - Révèle le **secret de signature** `whsec_…` et tape-le dans le secret `STRIPE_WEBHOOK_SECRET`.
   La fonction vérifie l'en-tête `Stripe-Signature` (HMAC SHA-256 de `horodatage.corps`, 5 minutes de tolérance), comme
   décrit dans [Stripe — Webhooks, vérifier les signatures](https://docs.stripe.com/webhooks/signature).
5. **Paramètres › Facturation › Portail client** : active l'annulation, le changement de moyen de paiement et le changement de
   formule entre les trois prix ; lien de retour `https://pianochallenges.com/?go=premium`.
   Source : [Stripe — Customer portal](https://docs.stripe.com/customer-management/integrate-customer-portal).
6. **Clé publique** `pk_test_…` (Développeurs › Clés API) → back office › **Contenu et réglages › Paiement : clés publiques**.
   Elle sert d'interrupteur « Stripe prêt » côté site.

## 3. App Store Connect (1 à 3 jours d'attente côté Apple)

1. **Accords, taxes et banque** (*Business*) : signe le contrat **Paid Apps / Applications payantes**, puis renseigne banque
   et fiscalité (formulaire W-8BEN-E pour une société française). Sans ce contrat actif, aucun achat intégré ne fonctionne,
   même en test. Source : [App Store Connect — Sign and update agreements](https://developer.apple.com/help/app-store-connect/manage-agreements/sign-and-update-agreements).
2. **Small Business Program** (commission de 15 % au lieu de 30 % tant que tu fais moins d'1 M$ par an) : inscription sur
   developer.apple.com › App Store Small Business Program (lien « Enroll »), avec le compte titulaire.
   Source : [Apple — App Store Small Business Program](https://developer.apple.com/app-store/small-business-program/).
3. App « Piano Challenges » (`com.pianochallenges.app`) › **Monétisation › Abonnements** › créer un **groupe d'abonnements**
   « Piano Challenges Premium » (un joueur ne peut avoir qu'un abonnement du groupe à la fois ; changer de formule = monter
   ou descendre dans le groupe) :
   | Référence | Identifiant produit | Durée | Prix | Offre de lancement |
   |---|---|---|---|---|
   | Solo mensuel | `pc_solo_month` | 1 mois | palier le plus proche de 17,99 € | — |
   | Solo annuel | `pc_solo_year` | 1 an | 149 € | **Offre d'introduction › Essai gratuit › 1 semaine** |
   | Famille annuel | `pc_family_year` | 1 an | 199 € | — |
   Pour chacun : nom et description FR/EN, capture de l'écran d'achat (la fenêtre Premium de l'app), « Prêt à être soumis ».
   Ces identifiants sont ceux de `APPLE_IDS` (app) et `APPLE` (fonction `revenuecat`) : ne les change pas sans me le dire.
4. **Partage familial Apple : je te conseille de le laisser DÉSACTIVÉ.** Une fois activé sur un abonnement, on ne peut plus
   le désactiver, et il partage avec **toute la famille Apple (jusqu'à 6 personnes)**, sans compte Piano Challenges ni limite
   à 4. Notre formule Famille marche déjà dans l'app comme sur le site : le titulaire invite jusqu'à 3 personnes depuis
   Réglages › Abonnement, chacune avec son compte et sa progression. (Si tu l'actives quand même, la fonction `revenuecat`
   gère les achats partagés : chaque bénéficiaire devient Premium à titre personnel.)
   Source : [App Store Connect — Turn on Family Sharing for in-app purchases](https://developer.apple.com/help/app-store-connect/configure-in-app-purchase-settings/turn-on-family-sharing-for-in-app-purchases).
5. **Utilisateurs et accès › Intégrations › Clés d'achat intégré** : génère une clé (fichier `.p8`) pour RevenueCat. Garde-la
   pour l'étape 4.2 ; ne l'envoie à personne d'autre.
6. **Comptes de test Sandbox** : Utilisateurs et accès › Sandbox › Testeurs (une adresse e-mail qui n'a jamais servi pour un
   Apple ID). Sur l'iPad : Réglages › App Store › Compte Sandbox.

## 4. RevenueCat (20 min)

RevenueCat relie l'achat Apple à Supabase : l'app lui donne l'id du compte Piano Challenges, il prévient la fonction
`revenuecat` à chaque achat, renouvellement, résiliation ou expiration.

1. Crée un compte sur revenuecat.com, puis un **projet** « Piano Challenges ».
2. **Apps › + New › App Store** : bundle ID `com.pianochallenges.app`, envoie la clé d'achat intégré `.p8` (étape 3.5) et
   l'*App-Specific Shared Secret* si on te le demande.
3. **Product catalog › Products** : importe `pc_solo_month`, `pc_solo_year`, `pc_family_year`.
4. **Entitlements › + New** : identifiant `premium`, attache les trois produits.
5. **Offerings** : offering `default` (marquée *current*) avec trois packages : *Monthly* → `pc_solo_month`, *Annual* →
   `pc_solo_year`, *Custom* « family » → `pc_family_year`. L'app cherche le produit par son identifiant, l'ordre n'importe pas.
6. **API keys** : copie la **clé publique iOS** `appl_…` → back office › Contenu et réglages › Paiement : clés publiques.
7. **Integrations › Webhooks › Add new configuration** :
   - nom « Supabase », URL `https://ijdxeasxmgevuchyuenn.supabase.co/functions/v1/revenuecat` ;
   - **Authorization header value** : invente une longue valeur au hasard (par ex. `Bearer ` suivi de 40 caractères) ;
     tape exactement la même dans le secret Supabase `REVENUECAT_WEBHOOK_AUTH` ;
   - environnement : *Sandbox and Production* pendant les tests ; tous les événements.
   RevenueCat attend une réponse 200 et réessaie 5 fois (sur environ 80 minutes) en cas d'échec.
   Sources : [RevenueCat — Webhooks](https://www.revenuecat.com/docs/integrations/webhooks),
   [RevenueCat — Event types and fields](https://www.revenuecat.com/docs/integrations/webhooks/event-types-and-fields).
8. Pendant les tests Apple uniquement : secret Supabase `REVENUECAT_SANDBOX` = `1` (sinon les achats Sandbox sont ignorés).
   **À supprimer au passage en réel.**

## 5. Le plugin dans l'app iOS (avec Claude, sur ton Mac)

Le code web est prêt (`payApple`, `restorePurchases`, appel natif « Purchases » par le pont Capacitor) mais le projet Xcode
n'a pas encore le plugin. On le fera ensemble :

```
cd ~/pianochallenges/app
npm install @revenuecat/purchases-capacitor@13.7.6   # compatible Capacitor 8 (@capacitor/core >= 8)
npm run sync                                          # copie le web + npx cap sync ios
```
Puis dans Xcode : cible App › **Signing & Capabilities › + Capability › In-App Purchase** ; Swift 5 (déjà le cas) ;
Product › Clean Build Folder, ▶︎. Source : [RevenueCat — Capacitor installation](https://www.revenuecat.com/docs/getting-started/installation/capacitor).
Dans l'app, l'achat ne passe jamais par Stripe (règle 3.1.1 d'Apple) : un abonné du site voit « Ton abonnement se gère sur
pianochallenges.com ».

## 6. Tester (tout en mode test, paiement toujours coupé pour les joueurs)

Le paywall reste invisible pour les joueurs. Pour tester toi-même : ouvre `https://pianochallenges.com/?paywall=1` connecté à
ton compte.

- **Ouvrir le paiement pour toi seulement** : pas de bouton dédié ; le plus simple est de cocher temporairement « Paiement
  ouvert (payLive) » dans le back office **pendant que l'offre reste invisible** (« Offre Premium visible pour tous »
  décoché) : seuls ceux qui ouvrent `?paywall=1` voient les formules.
- **Site** : choisis « Essayer 7 jours » → page Stripe → carte de test `4242 4242 4242 4242`, date future, CVC au choix
  ([cartes de test Stripe](https://docs.stripe.com/testing)) → retour sur `/?go=premium&ok=1`, « Bienvenue dans Premium ! ».
  Vérifie : back office › Paiements (1 essai), Réglages › Abonnement › « Gérer mon abonnement » (portail Stripe).
- **Famille** : prends « Famille » avec un 2e compte → Réglages › Abonnement › Ma famille › **Inviter** → ouvre le lien
  dans une fenêtre privée → crée un compte → « Rejoindre la famille de … » → Premium. Essaie Retirer, Quitter, et un 5e
  compte (refusé : famille complète).
- **Paiement refusé** : carte `4000 0000 0000 0341` → statut « paiement en retard » dans le back office.
- **iPad** : compte Sandbox, `REVENUECAT_SANDBOX=1`, achat dans l'app ; en Sandbox un an dure environ une heure, les
  renouvellements et l'expiration arrivent vite.
- **Sans magasin** (pour montrer la famille) : le SQL Editor peut donner un abonnement Famille « manual » de test à ton compte
  (exemple commenté en fin de la migration, section 7).

## 7. Passer en réel

1. Stripe : désactive le mode test, recrée les **mêmes produits et prix** en mode réel (ou copie-les avec « Copier en mode
   réel »), crée le **même webhook** en réel. Remplace dans les secrets Supabase `STRIPE_SECRET_KEY` (`sk_live_…`),
   `STRIPE_WEBHOOK_SECRET` (le `whsec_…` du webhook réel) et les trois `STRIPE_PRICE_*` (prix réels).
2. Back office › Paiement : clé publique `pk_live_…`.
3. Supabase : supprime le secret `REVENUECAT_SANDBOX`. RevenueCat : webhook en *Production* (ou les deux).
4. Apple : soumets les 3 abonnements **avec** une version de l'app qui contient le plugin (première soumission).
5. Back office › Contenu et réglages › Interrupteurs : coche **« Offre Premium visible pour tous »** et **« Paiement ouvert
   (payLive) »**, Enregistrer. Les joueurs le reçoivent à leur prochain lancement (`app_config.flags` → `paywall`, `payLive`).
   Retour arrière immédiat : décoche les deux.
6. (Facultatif, plus tard) passer `PAY_LIVE=true` dans la source rend l'ouverture définitive sans dépendre du back office.

## 8. En cas de souci

| Symptôme | Où regarder |
|---|---|
| « Le paiement arrive bientôt. » | `payLive` coché ? clé `pk_…` (site) ou `appl_…` (app) enregistrée ? |
| Paiement OK mais pas Premium | Stripe › Webhooks › tentatives (erreur 400 = mauvais `whsec_`, 500 = voir Supabase › Edge Functions › Logs) |
| « Le paiement n'a pas pu démarrer » | secrets `STRIPE_*` (un `price_` manquant renvoie « price missing ») |
| Achat Apple sans effet | RevenueCat › Customers (l'id doit être l'id Supabase), webhook en échec, `REVENUECAT_SANDBOX` |
| Un membre n'est plus Premium | l'abonnement Famille du titulaire est résilié ou en échec : back office › fiche › Famille et abonnements |
