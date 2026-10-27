// ESLint (config plate) : vérifications statiques qui attrapent les vraies erreurs avant les tests, sans bruit.
// Lancé par « node tools/lint.mjs » (CI : job « Construction à jour + syntaxe JS »), qui assemble la source src/app/
// et extrait les <script> en ligne des pages : les chemins « …/__page__.js » ci-dessous sont ces scripts extraits.
// Bloquant : les erreurs (error). Les avertissements (warn) s'affichent sans faire échouer.
// Dépendances : tools/audit/package.json (eslint, globals ; npm ci --prefix tools/audit).
import { createRequire } from "node:module";
const require = createRequire(new URL("./tools/audit/package.json", import.meta.url));
const globals = require("globals");

const RULES = {
  "no-undef": "error",            // variable jamais déclarée = ReferenceError à l'exécution (faute de frappe, fonction renommée)
  "no-redeclare": "error",        // deux déclarations du même nom dans la même portée
  "no-dupe-keys": "error",        // même clé deux fois dans un objet (la 2e écrase la 1re sans prévenir : textes t() surtout)
  "no-unreachable": "error",      // code après return / throw (souvent une ligne tombée derrière un return)
  "no-const-assign": "error",     // réaffecter une const = TypeError à l'exécution
  "no-self-assign": "error",      // x = x
  "no-func-assign": "off",        // VOULU : les enrobages réassignent des fonctions ({ const o=f; f=function(){…} })
  "no-cond-assign": "warn",       // if (a = b) : souvent voulu ici, signalé seulement
  "no-unused-vars": ["warn", { args: "none", caughtErrors: "none", varsIgnorePattern: "^_" }],
};
// Globals du navigateur, SAUF ceux qu'on utilise par erreur sans les déclarer (une variable locale oubliée « name », « event »,
// « status », « top »… serait sinon prise pour window.name, window.event… sans aucune erreur). Les écrire window.xxx si voulu.
const CONFUSING = ["event", "name", "status", "length", "top", "parent", "self", "close", "closed", "stop", "find", "origin", "external",
  "opener", "frames", "blur", "focus", "onload", "onerror", "onresize", "onblur", "onfocus", "onunload", "defaultStatus", "defaultstatus",
  "menubar", "toolbar", "statusbar", "scrollbars", "locationbar", "personalbar", "frameElement", "moveBy", "moveTo", "resizeBy", "resizeTo",
  "screenX", "screenY", "screenLeft", "screenTop", "pageXOffset", "pageYOffset", "scroll", "scrollBy", "scrollX", "scrollY", "outerHeight", "outerWidth"];
const BROWSER = Object.fromEntries(Object.entries(globals.browser).filter(([k]) => !CONFUSING.includes(k)));
// Globals propres à l'app, réellement utilisés sans « window. » (le reste vient de globals.browser ; Capacitor, PC_SONGS, QUIZ_DATA,
// MIDI_KEYBOARDS… sont toujours lus par window.xxx, donc rien à déclarer). En ajouter un ici seulement s'il est défini par un script du site.
const APP = {
  Staff: "readonly",              // assets/js/staff.js (portée)
  PCImp: "readonly",              // assets/js/song-import.js (import MIDI / MusicXML)
};

export default [
  { linterOptions: { reportUnusedDisableDirectives: "off" } },
  {
    // l'app (source assemblée de src/app/) : un script classique, l'IIFE principale en mode strict
    files: ["src/app/__page__.js"],
    languageOptions: { ecmaVersion: "latest", sourceType: "script", globals: { ...BROWSER, ...APP } },
    rules: RULES,
  },
  {
    // pages autonomes : lecteur Play, back office, clavier
    files: ["play/__page__.js", "admin/__page__.js", "clavier/__page__.js", "keyboard/__page__.js"],
    languageOptions: { ecmaVersion: "latest", sourceType: "script", globals: { ...BROWSER, ...APP } },
    rules: RULES,
  },
  {
    // scripts du site chargés par les pages (données et moteurs partagés) ; supabase-*.js est une copie du SDK, non vérifiée
    files: ["assets/js/*.js"],
    ignores: ["assets/js/supabase-*.js"],
    languageOptions: { ecmaVersion: "latest", sourceType: "script", globals: { ...BROWSER, ...APP } },
    rules: RULES,
  },
];
