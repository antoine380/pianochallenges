# Source de l'app découpée (`src/app/`)

Toute l'app (une seule page : HTML + CSS + JS) est ici, **découpée en fichiers ordonnés**. Ce n'est pas un changement de
technologie : `tools/build.py` recolle les morceaux dans l'ordre de `order.txt` et obtient exactement la même page qu'avant
(l'ancien `src/piano-challenges.html`, supprimé le 27/10/2026, identique octet pour octet), puis construit `index.html`,
`version.txt` et `live/` comme avant.

- **On modifie les fichiers de `src/app/`**, jamais `index.html` (généré) ni une page assemblée.
- `python3 tools/build.py` : construit `index.html`, `version.txt`, `live/` (à commiter avec la source, la CI le vérifie).
- `python3 tools/build.py --single` : écrit `build/piano-challenges.html` = la page complète, **prévisualisable seule**
  (polices Google, Supabase via jsdelivr), ignorée par git.
- Outils Node : `tools/source.mjs` (`readSource()` = la page assemblée, `where(ligne)` → `src/app/js/NNN-….js:ligne`).
  Les tests qui lisent la source passent par `readSource()`.
- Vérifications : `node tools/check_js.mjs` (syntaxe) et `node tools/lint.mjs` (ESLint, règles dans `eslint.config.mjs` ;
  `npm ci --prefix tools/audit` une fois) : une erreur est située dans le bon fichier, à la bonne ligne.
- Chercher : `grep -rn "maFonction" src/app/js` (un fichier par bloc, de quelques Ko à ~100 Ko).

## Comment c'est découpé

| Partie | Contenu |
|---|---|
| `head.html` | tout ce qui précède le CSS, jusqu'à `<style>` compris |
| `css/NNN-nom.css` | le `<style>`, coupé à ses blocs commentés (`/* ==== Nom ==== */`) |
| `body.html` | `</style>`, le petit script `native` (une ligne, laissé à sa place), tout le HTML, `<script src="assets/js/staff.js">`, `<script>` |
| `js/NNN-nom.js` | le grand `<script>` : le pont MIDI natif (`000`), puis **une seule IIFE** `(() => { "use strict"; … })();` (`010` → `910`), coupée aux blocs `/* ==== Nom ==== */` et aux grandes sections `// ---------- Nom ----------` |
| `end.html` | `</script>` |

**Les `.js` ne sont pas des modules** : ce sont des morceaux d'une même fonction. Ils partagent la même portée (toutes les
fonctions, `const`, `let` de l'IIFE se voient d'un fichier à l'autre) et les **enrobages** (`{ const o=f; f=function(){…} }`)
continuent de marcher. Chaque `.js` commence par la ligne
`// fragment de l'IIFE principale — ordre NNN, voir src/app/README.md` (ou `… du script principal, avant l'IIFE …` pour `000`) :
elle est **retirée à l'assemblage** (la construction échoue si elle manque). Chaque fichier finit par un retour à la ligne.

## Carte des fichiers

| Fichier | Lignes | Ko | Contenu |
|---|---:|---:|---|
| `head.html` | 6 | 0 | Début de la page : `<title>`, polices Google (aperçu seul, retirées par build.py), ouverture du `<style>`. |
| `css/010-piste-exercice.css` | 312 | 27 | Jetons `:root`, piste d'exercice LEARN : bandeau d'état, consigne, cases des degrés, clavier, carte de progression. |
| `css/020-coquille-app.css` | 21 | 1 | Coquille de l'app : menu latéral + zone principale à la taille de l'écran. |
| `css/030-modes-tuiles.css` | 139 | 12 | Trois modes et leurs couleurs, tuiles style Play, pages de mode, tablettes/téléphones, carte de niveau. |
| `css/040-panneaux.css` | 111 | 11 | Panneaux : entraînement du jour, classement, profil. |
| `css/050-web-mobile.css` | 73 | 6 | Web mobile (hors app) : pas de MIDI sur téléphone, micro seulement. |
| `css/060-fenetres-depart-midi.css` | 89 | 6 | Personnages et fenêtres d'intro, entraînement du jour, animation de lancement iOS, fenêtre MIDI, sélecteur. |
| `css/070-jeux-telephones-mouvement.css` | 128 | 7 | Jeux, téléphones (portrait/paysage), écrans courts, mouvement réduit. |
| `css/080-design-system-v1-1.css` | 84 | 8 | Design system v1.1 : menu aligné, accueil 2/3 + colonne, grands titres. |
| `css/090-retours-v1-2.css` | 22 | 1 | Retours v1.2. |
| `css/100-play-fiche-v1-3.css` | 65 | 7 | v1.3 : accueil PLAY, fiche Progression. |
| `css/110-ecran-de-depart-v1-4.css` | 65 | 6 | v1.4 : écran de départ LEARN, aide pas à pas. |
| `css/120-quiz.css` | 96 | 12 | Quiz. |
| `css/130-quiz-v2.css` | 282 | 36 | Quiz v2 : type de réponse, robots, en ligne, course. |
| `css/140-premium-invitations.css` | 204 | 29 | Premium (paywall) et invitations. |
| `css/150-natif-mobile.css` | 76 | 9 | Sensation native sur téléphone et tablette (audit mobile). |
| `css/160-pleine-hauteur.css` | 404 | 41 | Mise en page pleine hauteur (jetons `--sp-*`, `--gap`, grilles sans défilement). |
| `css/170-objectif.css` | 30 | 3 | Styles du bloc : objectif du jour, anneau, gels de série. (JS : `js/510-objectif.js`) |
| `css/180-midi-lot1.css` | 75 | 9 | Styles du bloc : mIDI lot 1 : pastille d'état, toasts, carte d'accueil, test « joue une note ». (JS : `js/520-midi-lot1.js`) |
| `css/190-premiers-pas.css` | 140 | 17 | Styles du bloc : premiers pas, lot 1 (P01–P03, moteur `PP`). (JS : `js/530-premiers-pas.js`) |
| `css/200-morceaux.css` | 95 | 10 | Styles du bloc : morceaux (catalogue C6, `pcLoad`) et Grilles. (JS : `js/540-morceaux.js`) |
| `css/210-accompagnement.css` | 120 | 12 | Styles du bloc : accompagnement (`ACC`). (JS : `js/550-accompagnement.js`) |
| `css/220-mesure.css` | 13 | 1 | Styles du bloc : mesure (`track`), réglages à distance, « Signaler un problème », erreurs JS. (JS : `js/560-mesure.js`) |
| `css/230-parcours-2-3.css` | 132 | 18 | Styles du bloc : premiers pas, lots 2-3 (P04–P14), étiquettes, bulles, révision, certificat. (JS : `js/580-parcours-2-3.js`) |
| `css/240-midi-lots-2-3.css` | 148 | 19 | Styles du bloc : assistant « Brancher mon clavier » (`#mwiz`), Réglages › Mon clavier. (JS : `js/590-midi-lots-2-3.js`) |
| `css/250-ma-route.css` | 81 | 10 | Styles du bloc : ma route (`rtRender`) et carte « Reprendre » / « Pour toi ». (JS : `js/600-ma-route.js`) |
| `css/260-succes.css` | 46 | 5 | Styles du bloc : succès : tuiles et badges (`ACH`, `badgeCheck`). (JS : `js/620-succes.js`) |
| `css/270-ligues.css` | 49 | 5 | Styles du bloc : ligues hebdomadaires (`LG`). (JS : `js/630-ligues.js`) |
| `css/280-les-douze.css` | 81 | 8 | Styles du bloc : jeu Les Douze (`DZ`). (JS : `js/640-les-douze.js`) |
| `css/290-import-morceaux.css` | 151 | 15 | Styles du bloc : import de morceaux MIDI / MusicXML (`IMP`, `PCImp`). (JS : `js/570-import-morceaux.js`) |
| `css/300-premiers-pas-lot4.css` | 81 | 10 | Styles du bloc : premiers pas lot 4 : outils communs. (JS : `js/650-premiers-pas-lot4.js`) |
| `css/310-catalogue-libre.css` | 18 | 1 | Styles du bloc : catalogue libre (`songs-free.js`), bibliothèque, crédits. (JS : `js/710-catalogue-libre.js`) |
| `css/320-finitions.css` | 9 | 0 | Styles du bloc : finitions. (JS : `js/720-finitions.js`) |
| `css/330-revue-ui.css` | 55 | 7 | Styles du bloc : revue UI (synchro `syncSame`, états vides…). (JS : `js/730-revue-ui.js`) |
| `css/340-ui-points-restants.css` | 35 | 4 | Styles du bloc : uI points restants. (JS : `js/740-ui-points-restants.js`) |
| `css/350-onboarding-2.css` | 27 | 3 | Styles du bloc : onboarding 2 (`OQ`, « Ton programme »). (JS : `js/770-onboarding-2.js`) |
| `css/360-catalogue-claviers.css` | 62 | 7 | Styles du bloc : catalogue de claviers MIDI (`MKC`, `mkcLoad`). (JS : `js/780-catalogue-claviers.js`) |
| `css/370-famille-paiement.css` | 33 | 4 | Styles du bloc : famille et paiement (`FAM`, Stripe, Apple). (JS : `js/790-famille-paiement.js`) |
| `css/380-gammes-une-a-une.css` | 55 | 6 | Styles du bloc : gammes une à une (page `sc1`). (JS : `js/800-gammes-une-a-une.js`) |
| `css/390-mode-piano.css` | 72 | 8 | Styles du bloc : mode PIANO (instruments, ambiances). (JS : `js/810-mode-piano.js`) |
| `css/400-gammes1-entrainement.css` | 14 | 1 | Styles du bloc : gammes une à une : entraînement, MIDI (`midiEach`, `midiDup`). (JS : `js/830-gammes1-entrainement.js`) |
| `css/410-gammes1-choix-mode.css` | 40 | 4 | Styles du bloc : gammes une à une : choix du mode, renversements, octave suivie, révision. (JS : `js/840-gammes1-choix-mode.js`) |
| `css/420-jeux-3.css` | 10 | 1 | Styles du bloc : jeux 3 : objectifs de Ma route, « Nouveau record », portée de Saute-notes. (JS : `js/850-jeux-3.js`) |
| `css/430-gammes1-v3.css` | 20 | 2 | Styles du bloc : gammes une à une v3 : tutoriel, aides prêtées, ports virtuels. (JS : `js/870-gammes1-v3.js`) |
| `css/440-gammes-v4-serie.css` | 56 | 5 | Styles du bloc : gammes v4 + Série 10 min. (JS : `js/880-gammes-v4-serie.js`) |
| `body.html` | 656 | 65 | Fin du `<style>`, petit script `native`, tout le HTML (splash, menu, pages, fenêtres), `staff.js`, ouverture du `<script>` principal. |
| `js/000-midi-natif.js` | 30 | 2 | Pont MIDI natif de l'app iOS (CoreMIDI → forme Web MIDI). Petite IIFE à part, **avant** l'IIFE principale. |
| `js/010-debut-iife.js` | 3 | 0 | Ouverture de l'IIFE principale `(() => { "use strict";` — refermée par `910-fin-iife.js`. |
| `js/020-textes-fr.js` | 324 | 95 | Dictionnaire `TXT` : ouverture + textes français (`fr:{…}`). |
| `js/030-textes-en.js` | 322 | 87 | Dictionnaire `TXT` : textes anglais (`en:{…}`) + fermeture. |
| `js/040-textes-outils.js` | 25 | 3 | `t()`, nombres, noms de joueurs (bidi), avatars, ordinaux. |
| `js/050-theorie-musicale.js` | 80 | 5 | Notes, types de gammes `TYPES`, orthographe, tonalités `TONICS`. |
| `js/060-accords.js` | 49 | 3 | Types d'accords `CTYPES`, renversements, fondamentales. |
| `js/070-harmonie.js` | 32 | 2 | Harmonie : accords d'une tonalité. |
| `js/080-progressions.js` | 41 | 2 | Progressions (`PROGS`). |
| `js/090-oreille.js` | 24 | 1 | Oreille (intervalles, écoutes). |
| `js/100-persistance.js` | 113 | 10 | État `S`, `load()`/`save()`, langue par défaut. |
| `js/110-progression-niveaux.js` | 93 | 10 | XP, niveaux, personnages, maîtrise. |
| `js/120-audio.js` | 20 | 1 | `audio()`, `tone()` (Web Audio). |
| `js/130-clavier.js` | 109 | 8 | Clavier à l'écran (`buildKeyboard`, touches, tailles). |
| `js/140-doigtes.js` | 39 | 3 | Doigtés main droite (`scaleFingers`, `chordFingers`, `fgMap`). |
| `js/150-solfege.js` | 50 | 5 | Portée (`renderStaff`, `staffTargetSVG`), via `assets/js/staff.js`. |
| `js/160-moteur-exercice.js` | 352 | 22 | Moteur d'exercice LEARN : partie, notes reçues, MIDI groupé, réussite / erreur. |
| `js/170-rendu-jeux-entrainement-du-jour.js` | 540 | 43 | Rendu, score, répétition espacée, entraînement du jour, fin de partie (`#endModal`). |
| `js/180-reglages.js` | 51 | 5 | Branchement des Réglages, pages Réglages / Progression en onglets. |
| `js/190-quitter-partie.js` | 54 | 4 | « Quitter la partie ? » (`#leaveModal`, `lvOpen`, `actNow`). |
| `js/200-menu-lateral.js` | 31 | 3 | Menu latéral, tiroir mobile, page des jeux. |
| `js/210-jeu-saute-notes.js` | 168 | 13 | Jeu Saute-notes (runner canvas). |
| `js/220-jeu-contre-la-montre.js` | 23 | 2 | Jeu Contre la montre. |
| `js/230-jeu-memoire.js` | 48 | 5 | Jeu Mémoire musicale. |
| `js/240-duels.js` | 248 | 30 | Duels (`DU`) : salon, bots, en ligne, ELO. |
| `js/250-notifications.js` | 148 | 20 | Notifications (`ntfAdd`, page `notif`, préférences). |
| `js/260-page-play-temps-survol.js` | 20 | 2 | Accueil PLAY, temps de jeu, petite note au survol. |
| `js/270-fiche-progression.js` | 52 | 7 | Fiche Progression (`renderFiche`). |
| `js/280-ecran-de-depart.js` | 101 | 11 | Écran de départ LEARN (`renderSetup`, `suStart`, `suQueue`). |
| `js/290-aide-pas-a-pas.js` | 17 | 1 | Aide pas à pas (`renderFiche2`). |
| `js/300-illustrations-quiz.js` | 46 | 10 | Objets 3D des tuiles et du quiz (`OBJ`). |
| `js/310-quiz.js` | 54 | 6 | Quiz : état `QZ`, configuration. |
| `js/320-quiz-reglages.js` | 74 | 8 | Quiz : écran de réglages (joueurs, robots, zones). |
| `js/330-quiz-partie.js` | 159 | 18 | Quiz : une partie (`quizIn`, révélation, fin). |
| `js/340-quiz-en-ligne.js` | 99 | 11 | Quiz en ligne (`NET`, Supabase Realtime). |
| `js/350-accueil-colonne.js` | 67 | 7 | Colonne de l'accueil : entraînement du jour, clavier, actualités, classement. |
| `js/360-page-play-iframe.js` | 61 | 7 | Lecteur Play en iframe (`playSend`, `openPlayWith`, `playOpen`). |
| `js/370-comptes-synchro-classement.js` | 262 | 25 | Comptes, synchro (`mergeState`, `cloudPush/Pull`), classement, chargement du SDK Supabase. |
| `js/380-fenetres-personnages.js` | 116 | 10 | Fenêtres (`openMod`/`closeMod`), personnages, intros. |
| `js/390-entree-ecran-midi-micro.js` | 57 | 5 | Mode d'entrée : écran, MIDI, micro (`setInput`). |
| `js/400-toasts.js` | 16 | 1 | Toasts et avis. |
| `js/410-midi.js` | 88 | 9 | Web MIDI (`enableMidi`, `onmidimessage`). |
| `js/420-micro.js` | 44 | 2 | Détection de hauteur au micro. |
| `js/430-aide-tutoriel.js` | 126 | 8 | Aide / tutoriel, raccourcis clavier globaux. |
| `js/440-desinscription.js` | 15 | 1 | Lien de désinscription des e-mails (`?unsub=`). |
| `js/450-demarrage-connexion.js` | 123 | 18 | Démarrage : écran de connexion `#gate`. |
| `js/460-onboarding.js` | 59 | 7 | Questionnaire (ancien, remplacé en partie par Onboarding 2). |
| `js/470-visite-guidee.js` | 36 | 4 | Visite guidée `#tour`. |
| `js/480-premium.js` | 105 | 14 | Premium : `PREM_OFFER`, limites, paywall `#pw`. |
| `js/490-invitations.js` | 54 | 6 | Invitations, partage, image de résultat. |
| `js/500-premier-lancement.js` | 54 | 7 | Premier lancement « Joue ta première note » (`fnOpen`). |
| `js/510-objectif.js` | 62 | 7 | Objectif du jour, anneau, gels de série. |
| `js/520-midi-lot1.js` | 111 | 12 | MIDI lot 1 : pastille d'état, toasts, carte d'accueil, test « joue une note ». |
| `js/530-premiers-pas.js` | 248 | 31 | Premiers pas, lot 1 (P01–P03, moteur `PP`). |
| `js/540-morceaux.js` | 106 | 12 | Morceaux (catalogue C6, `pcLoad`) et Grilles. |
| `js/550-accompagnement.js` | 294 | 35 | Accompagnement (`ACC`). |
| `js/560-mesure.js` | 136 | 16 | Mesure (`track`), réglages à distance, « Signaler un problème », erreurs JS. |
| `js/570-import-morceaux.js` | 204 | 26 | Import de morceaux MIDI / MusicXML (`IMP`, `PCImp`). |
| `js/580-parcours-2-3.js` | 476 | 68 | Premiers pas, lots 2-3 (P04–P14), étiquettes, bulles, révision, certificat. |
| `js/590-midi-lots-2-3.js` | 261 | 40 | Assistant « Brancher mon clavier » (`#mwiz`), Réglages › Mon clavier. |
| `js/600-ma-route.js` | 265 | 32 | Ma route (`rtRender`) et carte « Reprendre » / « Pour toi ». |
| `js/610-integration-etape-4.js` | 9 | 0 | Intégration étape 4 (mesure × parcours × route). |
| `js/620-succes.js` | 139 | 15 | Succès : tuiles et badges (`ACH`, `badgeCheck`). |
| `js/630-ligues.js` | 114 | 11 | Ligues hebdomadaires (`LG`). |
| `js/640-les-douze.js` | 155 | 16 | Jeu Les Douze (`DZ`). |
| `js/650-premiers-pas-lot4.js` | 59 | 9 | Premiers pas lot 4 : outils communs. |
| `js/660-pp4-placement-d5.js` | 93 | 10 | D5 : test de placement (`PL`). |
| `js/670-pp4-compte-d23.js` | 34 | 5 | D23 : « Garde tes progrès » (`ACCT`). |
| `js/680-pp4-rappel-d24.js` | 24 | 3 | D24 : rappel de la prochaine leçon. |
| `js/690-pp4-bilan-d25.js` | 37 | 6 | D25 : bilan de la semaine (`#wkModal`). |
| `js/700-pp4-micro-d28.js` | 66 | 9 | D28 : préparer le micro (`#mpModal`). |
| `js/710-catalogue-libre.js` | 70 | 8 | Catalogue libre (`songs-free.js`), bibliothèque, crédits. |
| `js/720-finitions.js` | 24 | 2 | Finitions. |
| `js/730-revue-ui.js` | 34 | 5 | Revue UI (synchro `syncSame`, états vides…). |
| `js/740-ui-points-restants.js` | 33 | 3 | UI points restants. |
| `js/750-liens-emails.js` | 6 | 0 | Liens des e-mails (`?go=`, `MAIL_GO`). |
| `js/760-chasse-aux-bugs.js` | 27 | 2 | Chasse aux bugs (arrière-plan, deux onglets…). |
| `js/770-onboarding-2.js` | 134 | 17 | Onboarding 2 (`OQ`, « Ton programme »). |
| `js/780-catalogue-claviers.js` | 169 | 23 | Catalogue de claviers MIDI (`MKC`, `mkcLoad`). |
| `js/790-famille-paiement.js` | 188 | 26 | Famille et paiement (`FAM`, Stripe, Apple). |
| `js/800-gammes-une-a-une.js` | 143 | 17 | Gammes une à une (page `sc1`). |
| `js/810-mode-piano.js` | 268 | 33 | Mode PIANO (instruments, ambiances). |
| `js/820-sons-piano.js` | 90 | 11 | Sons du piano (échantillons Salamander). |
| `js/830-gammes1-entrainement.js` | 85 | 10 | Gammes une à une : entraînement, MIDI (`midiEach`, `midiDup`). |
| `js/840-gammes1-choix-mode.js` | 186 | 22 | Gammes une à une : choix du mode, renversements, octave suivie, révision. |
| `js/850-jeux-3.js` | 86 | 9 | Jeux 3 : objectifs de Ma route, « Nouveau record », portée de Saute-notes. |
| `js/860-midi-3.js` | 34 | 3 | MIDI 3 : position des touches dans le lecteur Play, 25 touches. |
| `js/870-gammes1-v3.js` | 105 | 12 | Gammes une à une v3 : tutoriel, aides prêtées, ports virtuels. |
| `js/880-gammes-v4-serie.js` | 146 | 18 | Gammes v4 + Série 10 min. |
| `js/890-demarrage-boot.js` | 15 | 1 | **Boot** : premier rendu et écrans de départ (exécuté une fois, à la fin). |
| `js/900-live-update.js` | 32 | 2 | Mise à jour à distance de l'app iOS (après le Boot). |
| `js/910-fin-iife.js` | 3 | 0 | Fermeture de l'IIFE principale `})();`. |
| `end.html` | 1 | 0 | Fermeture du `<script>` principal. |

## Ajouter un bloc (nouveau chantier)

1. Crée `js/NNN-mon-bloc.js` (et `css/NNN-mon-bloc.css` si besoin) avec un numéro libre **à la bonne place** : un nouveau
   module se met comme avant **avant le Boot**, donc entre `880` et `890` (ex. `885-mon-bloc.js`) ; le CSS en fin de liste
   (ex. `450-mon-bloc.css`). Les numéros vont de 10 en 10 pour laisser de la place ; s'il n'y en a plus, prends un numéro
   intermédiaire (`883`) plutôt que de tout renuméroter.
2. Première ligne du `.js` : `// fragment de l'IIFE principale — ordre NNN, voir src/app/README.md`.
3. Ajoute le chemin dans `order.txt`, à sa place : c'est **cet ordre** qui compte, pas le tri des noms.
4. Garde les marqueurs `/* ==== Mon bloc ==== */` … `/* ==== fin Mon bloc ==== */` en tête et en fin de fichier.
5. `python3 tools/build.py`, `node tools/check_js.mjs`, `node tools/lint.mjs`, puis les tests ; ajoute une ligne à la carte ci-dessus.

## Règles

- **L'ordre compte**, comme dans l'ancien fichier unique : le code de haut niveau d'un fragment s'exécute au chargement, dans
  l'ordre. Une `function` déclarée est visible partout (même IIFE), mais une `const`/`let` n'existe qu'**après** son fragment
  (l'utiliser plus tôt pendant le chargement = ReferenceError). Un enrobage vient **après** la définition qu'il enrobe et
  **avant** le Boot (`890`) s'il doit compter dès le premier rendu.
- Un chantier = son bloc (CSS + JS) en fin de liste avant le Boot ; on ne déplace pas le code des autres et on ne reformate
  rien (diffs lisibles, chantiers parallèles faciles à fusionner). Modifier un bloc existant = modifier son fichier.
- Un fragment peut couper un objet (ex. `020-textes-fr.js` / `030-textes-en.js` = un seul objet `TXT`) : c'est du texte
  recollé. Les nouveaux textes d'un bloc s'ajoutent comme avant (`Object.assign(TXT.fr, {…})` dans le bloc, ou en fin de
  `fr:{…}` / `en:{…}`).
- Pas d'`import`/`export` ni de `"use strict"` dans un fragment ; pas de fonction exposée sur `window` sans raison.
- Vise moins de ~100 Ko par fichier ; un bloc qui grossit beaucoup peut être coupé en deux fragments qui se suivent.
