# Piano Challenges — fiche projet pour Claude

Lis ce fichier en entier avant de travailler sur le projet.

## Qui, quoi
- Projet d'Antoine Bernard (Reality Academy). **Toujours répondre en français.** Il itère chaque soir sur l'UX, souvent par listes de retours avec captures d'écran (iPad, iPhone, web).
- **Piano Challenges** : application gamifiée de théorie musicale. On joue sur un vrai piano (MIDI USB/Bluetooth), au micro, ou sur le clavier à l'écran.
- Sections, dans cet ordre : Accords, Gammes, Harmonie, Progressions, Oreille, Jeux. Plus : Entraînement du jour, Classement, Profil, Progression, Réglages, Aide.
- Site : https://pianochallenges.com. App iPhone/iPad : Capacitor, dans `app/`.

## Où est le code
| Fichier | Rôle |
|---|---|
| `src/piano-challenges.html` | **LA source à modifier.** Toute l'app (HTML + CSS + JS) en un seul fichier. Se prévisualise seule (polices Google, Supabase via jsdelivr). |
| `tools/build.py` | Génère `index.html` (racine) depuis la source : head SEO, polices auto-hébergées `/assets/fonts`, Supabase auto-hébergé `/assets/js/supabase-2.116.0.js`, met à jour `version.txt`. |
| `index.html` | **Généré, ne pas éditer à la main.** C'est ce que sert OVH et ce que copie l'app. |
| `tools/test_windows.py`, `tools/test_buttons.py` | Tests Playwright (gel de l'interface, clic sur tous les boutons, pont iOS simulé). Lancer `python3 -m http.server 8767` à la racine avant. |
| `supabase/schema.sql` | Tables et fonctions Supabase (à jour). |
| `app/` | Projet Capacitor 8.5.3 iOS. `app/ios/App/App/MidiPlugin.swift`, `AuthPlugin.swift`, `MainViewController.swift`. |
| `mentions-legales.html`, `confidentialite.html` | Pages légales (éditeur : Antoine BERNARD, a.bernard@me.com). |

## Workflow habituel
1. Modifier `src/piano-challenges.html` (patchs Python ciblés ou Edit ; le fichier fait ~290 Ko, lire par morceaux avec grep).
2. `python3 tools/build.py`
3. Vérifier la syntaxe JS, puis tester avec Playwright (Chromium préinstallé) : captures iPad 1180×820, iPhone paysage, mobile portrait, desktop. Lancer les deux tests de `tools/`.
4. Commit + push sur `main` → **OVH déploie automatiquement** (webhook GitHub). Terminer les messages de commit par les lignes d'attribution demandées par la session.
5. Pour l'iPad, Antoine fait sur son Mac : `cd ~/pianochallenges && git pull && cd app && npm run sync`, puis Xcode > Product > Clean Build Folder, puis ▶︎. Le rappeler quand du code natif (Swift) ou du web change.

## Architecture JS (repères)
- État persistant `S` dans localStorage `memo-gammes-v1` (réglages dans `S.settings`, XP `S.xp`, XP par jour `S.xpDays`, records de jeux `S.gameBest`, `S.runnerBest`).
- Navigation : variable `page` (practice|daily|games|rank|account|locked|settings|progress), `openPage(pg)`, `body[data-page]`. Le script n'expose pas ses fonctions sur `window` : dans les tests, cliquer sur les boutons (`#setBtn`, `#rankBtn`, `#accountBtn`, `#progBtn`, `[data-v=games]`, `#dailyCard`).
- Fenêtres : `openMod/closeMod`. `anyWin()` = vraies fenêtres (inert/focus) ; `anyModal()` inclut aussi les pages info (pause). Ne pas les confondre : un mélange a déjà gelé l'app.
- Textes FR/EN dans le dictionnaire `t()` (ajouter chaque clé dans les deux langues).
- Jeux : runner canvas (« Note Jumper », piano avec des yeux), « Contre la montre », « Mémoire musicale ». `gameOpen(id)`, réglages `gmDiff` (progressif/lent/moyen/rapide) et `gmCont` (accords/notes). « Défi du jour » = bientôt.
- MIDI : Web MIDI dans le navigateur ; dans l'app, pont natif `Capacitor.nativePromise("Midi", …)` + `nativeCallback(... "addListener", {eventName})` (pas de @capacitor/core côté web). `followMidi(n)` décale le clavier écran par octaves (ex. LUMI 24 touches).
- Pas de MIDI proposé quand le navigateur ne le gère pas (Safari iOS web).

## Supabase
- Projet `ijdxeasxmgevuchyuenn` (Irlande). Clé publishable dans la source (publique, normal).
- Auth : code par e-mail (OTP) + Google (PKCE). Dans l'app : `ASWebAuthenticationSession` avec redirection `pianochallenges://auth`.
- E-mails via SMTP OVH MX Plan (`ssl0.ovh.net:465`, `noreply@pianochallenges.com`).
- Tables : `profiles` (public, classement général), `progress` (privé), `xp_log` (XP par jour, privé) + fonction `leaderboard(since)` pour Jour/Semaine/Mois/Année.
- Modifs SQL : via l'éditeur SQL Supabase dans Chrome (Claude in Chrome), puis reporter dans `supabase/schema.sql`.

## Règles de sécurité (impératif)
- Ne jamais saisir, répéter ni committer un mot de passe ou un secret (FTP OVH, SMTP, client secret Google…). C'est Antoine qui les tape.
- Ne jamais committer de clé secrète Supabase (`service_role`).

## Préférences UX d'Antoine
- Aucun défilement sur iPad ni sur mobile : tout tient sur un écran.
- Menu latéral rétractable à gauche (style chess.com), menu déroulant sur mobile.
- Pas de bouton « Retour » sur les pages Réglages/Progression ; titres de pages avec picto à gauche.
- En MIDI : jouer un Do pour commencer/continuer.
- On parle de « niveaux », pas de « personnages ».

## Idées en attente
- LUMI : éclairer la gamme/tonalité de l'exercice via SysEx (expérimental, app seulement ; il faut ajouter la sortie MIDI dans `MidiPlugin.swift`). L'éclairage touche par touche n'est pas possible avec le protocole connu. Notes : en-tête `F0 00 21 10 77 37`, réglage tonalité `10 30 …`, gamme `10 60 …`, checksum `c=taille; c=(c*3+b)&0xff; c&0x7f`.
- Jeu « Défi du jour » (même défi chronométré pour tous, avec classement).
- Connexion Apple et Facebook (seul Google est en place).
- Vérifier que l'envoi du code par e-mail marche après le changement de mot de passe SMTP.
