# Piano Challenges — fiche projet pour Claude

Lis ce fichier en entier avant de travailler sur le projet.

## Qui, quoi
- Projet d'Antoine Bernard (Reality Academy). **Toujours répondre en français.** Il itère chaque soir sur l'UX, souvent par listes de retours avec captures d'écran (iPad, iPhone, web).
- **Piano Challenges** : application gamifiée de théorie musicale. On joue sur un vrai piano (MIDI USB/Bluetooth), au micro, ou sur le clavier à l'écran.
- Trois modes en tête du menu, une couleur chacun (`#modeNav`, `goMode()`, `MODE_COL`) : **GAMES** (vert, page `games` : jeux maison + les 6 jeux Play qui ouvrent `play/index.html#game=<id>` ; le clavier n'y apparaît que pendant une partie), **PLAY** (violet, page `free` : grand titre, tuiles des 5 morceaux `SONGS_H` qui ouvrent `play/index.html#song=<id>`, et le piano libre en dessous), **LEARN** (corail, page `learn` : tuiles Accords, Gammes, Harmonie, Progressions, Oreille, Entraînement du jour). Une matière ouvre d'abord l'**écran de départ** (`body.setup`, `#setupPanel`, `renderSetup()`/`suStart()`) : étapes numérotées : 1. un ou plusieurs types (`st.tids`), 2. tonalités Simples (sans ♯/♭, `keySimple`) / Toutes / Au choix (`st.keys`, `st.picked` = classes de hauteur) + « Mélanger l'ordre », 3. gammes : En notes / En accords (+ 7e), puis renversements/degrés, chrono, aides (état dans `S.settings.su[sec]`, `suState()`). `suQueue()` = chaque type × tonalité débloquée (× renversement / degré) ; 10 écoutes en Oreille. Raccourcis MIDI : Do seul = continuer, Si seul = recommencer ; fin de partie à 1 élément : Do = tonalité suivante, Si = recommencer ; à plusieurs éléments : Do = nouvelle partie, Si = retravailler les erreurs (ou rejouer s'il n'y en a pas). Test : `tools/audit/r9_setup.mjs`. Accueil `hub` : modes sur 2/3, colonne `#hubSide` (entraînement du jour, clavier MIDI, actualités `hsNews`, classement de la semaine chargé à la demande).
- **QUIZ** (bleu `--m-quiz #2563eb`, 4e mode du menu, page `quiz`, `#quizPanel`) : 1 à 4 joueurs répondent en jouant la note (facile : Do Ré Mi Fa) ou l'accord (moyen : accords simples ; difficile : majeurs, mineurs, 7e) associé à l'une des 4 réponses. Trois façons de jouer à plusieurs : un clavier MIDI chacun (`dev`, l'écran compte comme un clavier), zones d'un même piano (`zone`, `qzZones()`), chacun son tour (`turn`). 200 questions FR/EN (10 thèmes, culture générale + musique) dans `assets/js/quiz-data.js`, chargé à la demande (`qzLoad()`) ; illustrations vectorielles `OBJ` (globe, castle, planet…). Moteur : `QZ`, `qzCfg()` (`S.settings.quiz`), `quizIn(dev, note)` reçoit les notes (MIDI : identifiant du port ; écran/clavier ordi/micro : `"screen"`), regroupement 170 ms, comparaison par classes de hauteur. Avant de jouer : répondre avec des notes ou des accords (`ans`), 3 difficultés pour chacun (`qzTargets(diff, ans)`), bots 0-3 de niveau 1-3 (`QZ_BOTS`, précision et vitesse). Petits écrans : réglages en deux onglets Quiz / Joueurs (`QZ.tab`). **En ligne** (`NET`, Supabase Realtime sans table) : salle `pcq-room-<CODE>` (code de 5 caractères, lien `/#quiz-CODE`), présence = joueurs, l'hôte envoie `start`/`q`/`reveal`/`end`, chacun envoie `ans` (index de réponse d'origine + temps) ; joueur au hasard via le salon `pcq-lobby` (présence `wait:true`, les deux plus anciens sont associés, le premier crée la salle). Tout message reçu est vérifié. La CSP autorise `wss://…supabase.co`. Tests : `tools/audit/r6_quiz.mjs` (local) et `r7_online.mjs` (faux Realtime sur BroadcastChannel). Option « Sons de l'interface » dans Réglages (`S.settings.uiSound`).
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
- Navigation : variable `page` (hub|learn|practice|daily|games|free|play|rank|account|locked|settings|progress), `openPage(pg)`, `body[data-page]`. `free` = page PLAY de l'hôte ; `play` = le lecteur Clavio en iframe (morceau ou jeu Play), qui renvoie `{source:'clavio',type:'home'}` quand on en sort. Le script n'expose pas ses fonctions sur `window` : dans les tests, cliquer sur les boutons (`#homeLink`, `#modeNav [data-mode=learn|play|games]`, `#learnTiles .ptile`, `#suGo`, `#gameCards`/`#playCards`/`#playSongs .ptile`, `#setBtn`, `#rankBtn`, `#accountBtn`, `#lvlAv` (ouvre la fiche Progression), `#dailyCard`, `#themeBtn`).
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

## Design system (v1, validé le 20/10/2026)
- Référence complète : artifact « Piano Challenges Design System » (claude.ai/artifact/XnL8bSJqD92mBCn7ghBept). Thème sombre violet nuit `--bg #15122e`, clair lavande `#f1f2fb` ; picto jour/nuit `#themeBtn` (`S.settings.theme`, absent = système), suivi par l'iframe Play.
- Polices : Fredoka (titres, chiffres) + Nunito (texte), auto-hébergées dans `/assets/fonts` (fontsource, sous-ensemble latin).
- Tuiles : `tile({color,obj,kick,title,desc,rec,btn,soon,onOpen})`, une teinte par tuile (`TILE_COL`, texte blanc ≥ 4,5:1), ombre colorée, objet 3D vectoriel `OBJ[clé]()` (helpers `O3()`, `ball`, `block`) recadré automatiquement en haut à droite (`FIT`). Petite note douce au survol (souris, son déjà débloqué).
- Clavier unique violet partout (hôte et lecteur Play) : couleur par note `--note-0…11` (Do rouge → Si violet), ligne de frappe `--hit-line`. Aide progressive : notes trouvées dans leur couleur (`body.gp`) + fiche « À retenir » (`renderFiche2()`).
- Menu : icônes 38 px sur carré, sélection en contour ; Progression n'est plus dans le menu : clic sur la carte de niveau → fiche (`renderFiche()` : réussites, séries jours/semaines + calendrier, parcours par matière, records). Temps de jeu `S.playSec` (par jour, compté pendant qu'on joue). Langue et mentions légales dans Réglages.

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
