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
| `ios/App/App/MainViewController.swift` | Charge le site, enregistre le plugin, garde l'écran allumé |
| `ios/App/App/Info.plist` | Textes d'autorisation Bluetooth et micro ; iPhone en paysage, iPad dans toutes les orientations |
| `resources/` | Icône 1024 px et écran de démarrage |

Dans l'app, la page détecte le plugin et remplace `navigator.requestMIDIAccess`. Le reste du site ne change pas.

Pour publier plus tard sur l'App Store ou TestFlight, il faudra le compte Apple Developer payant (99 €/an).
