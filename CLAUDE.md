# Piano Challenges — fiche projet pour Claude

Lis ce fichier en entier avant de travailler sur le projet.

## Qui, quoi
- Projet d'Antoine Bernard (Reality Academy). **Toujours répondre en français.** Il itère chaque soir sur l'UX, souvent par listes de retours avec captures d'écran (iPad, iPhone, web).
- **Piano Challenges** : application gamifiée de théorie musicale. On joue sur un vrai piano (MIDI USB/Bluetooth), au micro, ou sur le clavier à l'écran.
- Trois modes en tête du menu, une couleur chacun (`#modeNav`, `goMode()`, `MODE_COL`) : **GAMES** (vert, page `games` : jeux maison + les 6 jeux Play qui ouvrent `play/index.html#game=<id>`), **PLAY** (violet, page `play`, morceaux), **LEARN** (corail, page `learn` : tuiles Accords, Gammes, Harmonie, Progressions, Oreille, Entraînement du jour qui lancent directement la catégorie ; `#secTabs` existe encore mais est masqué, les tuiles cliquent ses boutons). Pas de sous-menu. Au lancement et sur clic du logo : page `hub` (choix des trois modes). Les pages de mode sont des grilles de tuiles style Play (`tile()`, `.ptile`). Plus : Entraînement du jour, Classement, Profil, Progression, Réglages, Aide.
- Site : https://pianochallenges.com. App iPhone/iPad : Capacitor, dans `app/`.

## Où est le code
| Fichier | Rôle |
|---|---|
| `src/piano-challenges.html` | **LA source à modifier.** Toute l'app (HTML + CSS + JS) en un seul fichier. Se prévisualise seule (polices Google, Supabase via jsdelivr). |
| `tools/build.py` | Génère `index.html` (racine) depuis la source : head SEO, polices auto-hébergées `/assets/fonts`, Supabase auto-hébergé `/assets/js/supabase-2.116.0.js`, met à jour `version.txt`. |
| `index.html` | **Généré, ne pas éditer à la main.** C'est ce que sert OVH et ce que copie l'app. |
| `tools/test_windows.py`, `tools/test_buttons.py` | Tests Playwright Python (gel de l'interface, clic sur tous les boutons des fenêtres et de la page Réglages, pont iOS simulé). Lancer `python3 -m http.server 8767` à la racine avant ; `PORT=8773` pour un autre port ; code de sortie 1 en cas d'échec. |
| `tools/audit/regression.mjs` | Test de non-régression Playwright Node (`node tools/audit/regression.mjs`, `PORT=`, `NODE_PATH=`, `PW_CHROMIUM=`) : aucun défilement sur Hub/Learn/Jeux (iPad 1024×768 et 768×1024, 1280×800, 812×375, 375×667), contraste ≥ 4,5:1 du texte blanc des tuiles (clair et sombre), page Play dans la langue de l'hôte. |
| `supabase/schema.sql` | Tables et fonctions Supabase (à jour). |
| `play/index.html` | Page **Play** (prototype « Clavio », style ROLI) : morceaux en cascade 3D avec mode attente et doigtés, 6 mini-jeux, clavier lumineux. Fichier autonome chargé dans une iframe par la page `play` (vues par hash : `#songs`, `#games`, `#game=<id>`, plus `&lang=fr|en` ; `playHash`, `openPlayWith()`, `playOpen()` force un rechargement quand seul le hash change) ; **bilingue** : dictionnaire `T` fr/en dans le fichier (`tr()`, `data-i` sur le HTML, noms de notes `NAMES` = Do Ré Mi ou C D E selon la langue), `document.documentElement.lang` ; il suit le thème clair/sombre de l'hôte ; l'hôte lui relaie les notes (MIDI, micro, clavier écran) par `postMessage` (`playSend`, même origine uniquement). Polices auto-hébergées via `../assets/fonts`. Copié dans l'app par `copy-web.mjs`. |
| `app/` | Projet Capacitor 8.5.3 iOS. `app/ios/App/App/MidiPlugin.swift`, `AuthPlugin.swift`, `MainViewController.swift`. |
| `mentions-legales.html`, `confidentialite.html` | Pages légales (éditeur : Antoine BERNARD, a.bernard@me.com). |

## Workflow habituel
1. Modifier `src/piano-challenges.html` (patchs Python ciblés ou Edit ; le fichier fait ~290 Ko, lire par morceaux avec grep).
2. `python3 tools/build.py`
3. Vérifier la syntaxe JS, puis tester avec Playwright (Chromium préinstallé) : captures iPad 1024×768 et 768×1024, iPhone paysage 812×375, mobile portrait 375×667, desktop. Lancer les deux tests Python de `tools/` et `tools/audit/regression.mjs` (0 échec attendu).
4. Commit + push sur `main` → **OVH déploie automatiquement** (webhook GitHub). Terminer les messages de commit par les lignes d'attribution demandées par la session.
5. Pour l'iPad, Antoine fait sur son Mac : `cd ~/pianochallenges && git pull && cd app && npm run sync`, puis Xcode > Product > Clean Build Folder, puis ▶︎. Le rappeler quand du code natif (Swift) ou du web change.

## Architecture JS (repères)
- État persistant `S` dans localStorage `memo-gammes-v1` (réglages dans `S.settings`, XP `S.xp`, XP par jour `S.xpDays`, records de jeux `S.gameBest`, `S.runnerBest`).
- Navigation : variable `page` (hub|learn|practice|daily|games|play|rank|account|locked|settings|progress), `openPage(pg)`, `body[data-page]`. Le script n'expose pas ses fonctions sur `window` : dans les tests, cliquer sur les boutons (`#homeLink`, `#modeNav [data-mode=learn|play|games]`, `#learnTiles .ptile`, `#gameCards`/`#playCards .ptile`, `#setBtn`, `#rankBtn`, `#accountBtn`, `#progBtn`, `#dailyCard`).
- `LOCKED=[]` : tout est ouvert aux invités (Jeux et Entraînement compris) ; seule la page Profil invite à créer un compte. La page `locked` et `needLogin()` existent encore mais ne se déclenchent plus.
- Langue par défaut à la première visite : `DEFAULT_LANG` (`navigator.language` commençant par `fr` → `lang:"fr", notation:"fr"`, sinon EN) ; un `S.settings.lang` sauvegardé a toujours priorité.
- Supabase : le SDK (`/assets/js/supabase-2.116.0.js`) n'est chargé qu'à la demande (`ensureCloud()`) : au démarrage seulement si un jeton `sb-…-auth-token` existe ou si l'URL contient `?code=`/`#access_token`, sinon à l'ouverture de Profil ou Classement. `.htaccess` pose une `Content-Security-Policy` (scripts/styles/polices `self`, `connect-src` Supabase, `img-src https:` pour les photos Google) : la vérifier si on ajoute une ressource externe.
- Pages de mode sans défilement : sous `max-height:820px` ou `max-width:900px`, tuiles `.ptile` compactes (sans `.art`) ; grilles `#learnTiles` 3 colonnes, `#gameCards` 4, `#playCards` 3 (6 en paysage large) ; téléphones : 2 colonnes, nom + record seulement. Couleurs des modes `--m-games #26805a`, `--m-play #7a5bf5`, `--m-learn #c9463c` (texte blanc ≥ 4,5:1 ; les nuances `shade()` ne font qu'assombrir).
- Fenêtres : `openMod/closeMod`. `anyWin()` = vraies fenêtres (inert/focus) ; `anyModal()` inclut aussi les pages info (pause). Ne pas les confondre : un mélange a déjà gelé l'app.
- Gammes : mode `S.settings.scMode` notes|chords (+ `sc7` pour les accords de 7e). En mode accords, l'item porte `ch:1`, la séquence vient de `scaleChordSteps()` et suit le moteur des progressions (`chSeq()` = prog ou gamme en accords).
- Textes FR/EN dans le dictionnaire `t()` (ajouter chaque clé dans les deux langues, en fin de bloc). Tutoiement partout en FR.
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
- Menu latéral rétractable à gauche (style chess.com), menu déroulant sur mobile. En bas du menu : langue (menu déroulant avec drapeau) + picto du mode d'interaction (`#inChip`).
- Pas de bouton « Retour » sur les pages Réglages/Progression ; titres de pages avec picto à gauche.
- En MIDI : jouer un Do pour commencer/continuer.
- On parle de « niveaux », pas de « personnages ».

## Idées en attente
- LUMI : éclairer la gamme/tonalité de l'exercice via SysEx (expérimental, app seulement ; il faut ajouter la sortie MIDI dans `MidiPlugin.swift`). L'éclairage touche par touche n'est pas possible avec le protocole connu. Notes : en-tête `F0 00 21 10 77 37`, réglage tonalité `10 30 …`, gamme `10 60 …`, checksum `c=taille; c=(c*3+b)&0xff; c&0x7f`.
- Jeu « Défi du jour » (même défi chronométré pour tous, avec classement).
- Connexion Apple et Facebook (seul Google est en place).
- Vérifier que l'envoi du code par e-mail marche après le changement de mot de passe SMTP.
