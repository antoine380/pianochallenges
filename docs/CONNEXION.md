# Connexion Google : une page plus jolie et une belle adresse

Aujourd'hui, l'écran de Google affiche « Connectez-vous à ijdxeasxmgevuchyuenn.supabase.co ». Deux réglages changent ce qu'il affiche. Ils se font côté Google et côté Supabase (pas dans le code de l'app).

## 1. Nom et logo de l'app sur l'écran Google (gratuit)

Google Cloud Console › API et services › **Écran de consentement OAuth** (« Branding ») :
- Nom de l'application : **Piano Challenges**
- Logo : le logo de l'app (carré, 120 × 120 px)
- Page d'accueil : https://pianochallenges.com ; Règles de confidentialité : https://pianochallenges.com/confidentialite.html ; Conditions : https://pianochallenges.com/mentions-legales.html
- Domaines autorisés : pianochallenges.com (vérifié dans la Search Console)
- Publier puis demander la **validation** (« Verify branding ») : tant qu'elle n'est pas accordée, Google affiche l'adresse technique au lieu du nom.

## 2. Une belle adresse : auth.pianochallenges.com (payant)

Supabase › Project Settings › **Custom Domains** : module complémentaire payant (10 $ par mois et par domaine, projet sur un forfait payant, Pro à partir de 25 $ par mois ; tarifs vérifiés le 08/11/2026 sur supabase.com/pricing).
1. Dans Google Cloud Console › Identifiants › le client OAuth « Web » : **ajouter** l'URI de redirection `https://auth.pianochallenges.com/auth/v1/callback` (garder l'ancienne `https://ijdxeasxmgevuchyuenn.supabase.co/auth/v1/callback`).
2. Supabase › Custom Domains : saisir `auth.pianochallenges.com`, puis créer chez OVH (zone DNS de pianochallenges.com) l'enregistrement **CNAME** `auth` → `ijdxeasxmgevuchyuenn.supabase.co.` et l'enregistrement **TXT** de vérification demandé par Supabase.
3. Attendre la vérification et le certificat, puis **Activer**.
4. Ensuite seulement : dans l'app, remplacer `SUPA_URL` par `https://auth.pianochallenges.com` (je m'en charge) et ajouter le domaine au `connect-src` de `.htaccess`.

L'écran Google affichera alors « Connectez-vous à Piano Challenges » (après validation) et l'adresse pianochallenges.com.
