# Piano Challenges — app iPhone & iPad

Une seule app pour iPhone (en paysage) et iPad (toutes orientations). Elle reprend le site tel quel et ajoute le MIDI natif :

- clavier branché en **USB-C** (ou Lightning avec l'adaptateur Apple « Lightning vers USB 3 pour appareil photo ») ;
- clavier **Bluetooth MIDI** (ROLI, etc.), via le bouton « Connecter un clavier Bluetooth » dans la fenêtre MIDI ;
- le micro marche aussi (piano acoustique).

## Tester gratuitement sur ton iPhone / iPad

Il faut un Mac. Pas besoin de payer le compte développeur à 99 € : un identifiant Apple gratuit suffit. La seule limite, c'est que l'app expire au bout de 7 jours. Il suffit alors de la relancer depuis Xcode.

### 1. Une seule fois : installer les outils

1. Installe **Xcode** depuis l'App Store, ouvre-le une fois et accepte les composants supplémentaires.
2. Installe **Node.js** (version LTS) depuis https://nodejs.org.
3. Récupère le projet dans le Terminal :
   ```bash
   git clone https://github.com/antoine380/pianochallenges.git
   cd pianochallenges/app
   npm install
   ```

### 2. Préparer et ouvrir le projet

```bash
npm run sync     # copie le site dans l'app
npm run open     # ouvre le projet dans Xcode
```

### 3. Signer avec ton compte gratuit (dans Xcode)

1. Xcode > Settings > Accounts > **+** > Apple ID : connecte-toi.
2. Dans la colonne de gauche, clique sur **App** (l'icône bleue), puis sur la cible **App** et l'onglet **Signing & Capabilities**.
3. Coche **Automatically manage signing**. Pour **Team**, choisis « *Ton nom* (Personal Team) ».
4. Si Xcode affiche une erreur sur le *Bundle Identifier*, change-le en quelque chose d'unique, par ex. `com.antoine.pianochallenges`.

### 4. Installer sur l'iPhone ou l'iPad

1. Branche l'appareil au Mac avec un câble et réponds **Se fier** sur l'appareil.
2. Sur l'iPhone : Réglages > Confidentialité et sécurité > **Mode développeur** > activer. L'appareil redémarre.
3. Dans Xcode, en haut, choisis ton appareil, puis clique sur ▶︎ (Run).
4. Au premier lancement, l'iPhone dit « Développeur non approuvé ». Va dans Réglages > Général > **VPN et gestion de l'appareil**, touche ton identifiant Apple, puis **Faire confiance**. Relance l'app.

Après le premier lancement, tu peux débrancher le câble : l'app reste installée 7 jours.

### Mettre à jour l'app après un changement du site

Plus besoin, sauf pour le code natif : l'app installée récupère seule la dernière version publiée (voir « Mise à jour à distance » plus bas).
Quand le code natif (Swift) change, ou pour embarquer la dernière version web dans l'app :

```bash
cd pianochallenges
git pull
cd app
npm run sync
```

Puis ▶︎ dans Xcode.

## Utiliser le MIDI

- **USB-C** : branche le clavier et ouvre l'app. Il est détecté tout seul.
- **Bluetooth** : allume le clavier, touche la pastille MIDI (fenêtre MIDI) puis « Connecter un clavier Bluetooth ». Choisis le clavier dans la liste et touche « Done ». Ne l'appaire pas dans Réglages > Bluetooth : les claviers MIDI se connectent depuis l'app.
- Appuie sur un **Do (C)** pour lancer l'exercice, comme sur le site.

## Contenu technique

| Fichier | Rôle |
| --- | --- |
| `capacitor.config.json` | Nom, identifiant et réglages de l'app (Capacitor 8) |
| `scripts/copy-web.mjs` | Copie le site (dossier parent) dans `www/` |
| `ios/App/App/MidiPlugin.swift` | MIDI natif CoreMIDI : USB, Bluetooth LE, réseau ; fenêtre d'appairage Bluetooth |
| `ios/App/App/MainViewController.swift` | Charge le site (ou la version téléchargée), enregistre les plugins, garde l'écran allumé |
| `ios/App/App/LiveUpdatePlugin.swift` | Mise à jour à distance de la partie web (voir plus bas) |
| `scripts/web-files.mjs` | Liste des fichiers du site embarqués dans l'app et adaptations (pas de zoom…), `NATIVE_MIN` |
| `ios/App/App/Info.plist` | Textes d'autorisation Bluetooth et micro ; iPhone en paysage, iPad dans toutes les orientations |
| `resources/` | Icône 1024 px et écran de démarrage |

Dans l'app, la page détecte le plugin et remplace `navigator.requestMIDIAccess`. Le reste du site ne change pas.

Pour publier plus tard sur l'App Store ou TestFlight, il faudra le compte Apple Developer payant (99 €/an).


## Sur Mac (puce Apple)
L'app iPad tourne telle quelle sur un Mac à puce Apple (« Designed for iPad », `SUPPORTS_MAC_DESIGNED_FOR_IPHONE_IPAD = YES`), avec le MIDI USB et Bluetooth.
1. `cd ~/pianochallenges && git pull && cd app && npm run sync && npm run open`
2. Dans Xcode, choisir la destination **My Mac (Designed for iPad)**, puis ▶︎. L'app s'installe et apparaît dans le Launchpad ; clic droit sur son icône dans le Dock > Options > Garder dans le Dock.
3. Pour la distribuer : dans App Store Connect, laisser cochée la disponibilité « Mac (Apple Silicon) » de l'app iPad.


## Mise à jour à distance (sans Xcode)

L'app installée se met à jour seule depuis https://pianochallenges.com, sans service tiers, et reste utilisable hors connexion.

**Comment ça marche**
1. `python3 tools/build.py` écrit, en plus d'`index.html` et `version.txt`, le manifeste `live/manifest.json` (version, `native_min`, chaque fichier avec son SHA-256 et sa taille) et `live/files/` (les pages adaptées à l'app : sans zoom, pages légales qui défilent). **Publier `live/` dans le même commit qu'`index.html`.**
2. Au lancement (après le démarrage de la page) et au retour dans l'app (au plus une fois par heure), l'app lit le manifeste. Si la version est plus récente que la sienne, elle copie les fichiers inchangés, télécharge les autres, vérifie chaque SHA-256, et range le tout dans `Library/NoCloud/live/<version>/`.
3. La nouvelle version est **en attente** : elle sert au **lancement suivant** (jamais de rechargement en pleine partie). Réglages › Application affiche « Mise à jour prête au prochain lancement ». Pour la voir tout de suite : fermer l'app (balayer vers le haut) et la rouvrir.
4. L'adresse de la page reste `capacitor://localhost` : la progression du joueur (localStorage), la session et les morceaux importés sont gardés.
5. Sécurité : la page doit appeler `LiveUpdate.ready()` dans les 20 s ; sinon l'app revient à la version précédente (ou à celle embarquée) et n'essaie plus jamais cette version. Au plus 2 versions sur l'appareil.

**Quand refaire Xcode ?** Seulement quand le code natif change (fichiers `.swift`, plugins, `Info.plist`, Capacitor). Si un changement web a besoin d'un nouveau code natif, augmenter **ensemble** `NATIVE_MIN` dans `scripts/web-files.mjs` et `nativeVersion` dans `LiveUpdatePlugin.swift` : les apps qui ont l'ancien code natif gardent alors l'ancienne version web jusqu'à la nouvelle installation.

**Revenir à la version embarquée** : Réglages › Application, toucher 5 fois de suite la ligne « Version web … » puis confirmer (`LiveUpdate.reset()`). La version publiée actuelle est mise de côté ; seule une publication plus récente sera reprise. Supprimer et réinstaller l'app marche aussi (mais efface la progression d'un invité).

Une nouvelle installation depuis Xcode (`npm run sync` puis ▶︎) embarque la dernière version : une version téléchargée plus ancienne est alors ignorée.
