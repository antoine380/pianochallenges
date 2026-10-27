# Tests d'audit des entrées (MIDI / clavier / micro)

Scripts Playwright (Node, ESM) qui pilotent l'app servie en local. Ils sont en lecture seule sur le code.

## Lancer

```
cd /chemin/pianochallenges && python3 -m http.server 8767 &     # port par défaut
cd tools/audit
ln -sfn /chemin/vers/node_modules node_modules                    # doit contenir `playwright`
PW_CHROMIUM=/opt/pw-browsers/chromium-1194/chrome-linux/chrome node r1_whitelist.mjs
```

- `PORT=8771` surcharge le port (défaut 8767), ou `PC_URL=http://…/` l'adresse complète.
- `PW_CHROMIUM` : chemin de l'exécutable Chromium (sinon celui de Playwright).
- `./run_all.sh` lance les tests de non-régression `r*.mjs` à la suite et s'arrête au premier échec.
- `bash tools/audit/ci_run.sh <tests…>` (depuis n'importe où) : ce que fait la CI. Démarre son propre serveur sur un port libre, lance chaque test (`.mjs` → node, `.py` → python3) avec un délai (`TEST_TIMEOUT`, 900 s), relance une fois ceux de `RETRY` (ex. `RETRY=r7_online`), résume et sort en 1 si un test échoue.
- Playwright : `package.json` ici fixe la version (1.56.0, la même que le paquet Python de la CI : un seul Chromium). La CI fait `npm ci --prefix tools/audit` ; en local, le lien `node_modules` ci-dessus suffit toujours.

## CI (GitHub Actions)

- `.github/workflows/ci.yml` : à chaque push sur `dev` → construction à jour (`PC_BUILD_STAMP=$(cat version.txt) python3 tools/build.py` ne doit rien changer), `node tools/check_js.mjs`, batterie rapide en 5 groupes parallèles, `sql/run.sh`, `deno check` + `fn_pay_test.ts`, puis avance rapide de `main` (mise en ligne OVH). Les tests bloquants sont listés dans le fichier (groupes A à E).
- `.github/workflows/nightly.yml` : chaque nuit sur `main`, **tous** les `r*.mjs`, `test_*.mjs`, `regression.mjs`, `t*.mjs` (plantage seulement), les tests Python, le SQL et deno ; ouvre une issue en cas d'échec. Un nouveau `r*.mjs` y entre tout seul ; l'ajouter aussi dans un groupe de `ci.yml` s'il est rapide (< 1 min) et important.
- Les services en ligne de l'app (Supabase du projet, jsdelivr, polices Google, le site) sont coupés sur les runners (`/etc/hosts`, action `.github/actions/setup-tests`) : un test qui en a besoin doit les simuler (`fakesb.mjs`, `page.route`).

## Tests de non-régression (`process.exit(1)` en cas d'échec)

| Fichier | Bug d'audit | Ce qu'il vérifie |
|---|---|---|
| `r1_whitelist.mjs` | #1, #2, #51 | Un Do MIDI ou Espace ne démarre aucun exercice hors `practice`/`daily` ; sur Play, les lettres sont relayées sans son côté hôte |
| `r2_windows.mjs` | #3, #4 | Notes reçues fenêtre ouverte (aide, MIDI, niveaux, entrée, Réglages, Progression) : rien n'est validé ; dans la fenêtre MIDI la touche s'allume seulement ; reprise à la fermeture |
| `r3_paused.mjs` | #5 | Réglages/Progression → menu → nouvel exercice : le chrono se fige pendant l'aide, une seule boucle tick |
| `r4_unplug.mjs` | #6 | Clavier débranché (state=disconnected, port encore dans `inputs`) : retiré de la liste, handler enlevé, bouton éteint quand tout est débranché |
| `r5_loneC.mjs` | #7 | Seul un Do joué seul continue ; un accord contenant un Do est ignoré en phase révélée/succès ; notes <300 ms après « continuer » non notées |

## Scripts d'exploration (sortie à lire, pas de code de sortie)

- `lib.mjs` : harnais (faux Web MIDI, compteurs AudioContext/oscillateurs/timers/handlers, getUserMedia simulé, fermeture des modales, état DOM)
- `t0_explore.mjs` : prise en main
- `t1_midi.mjs` : note-on/off, vélocité 0, CC64, accords plaqués, notes rapides, 2 claviers, débranchement, latence, handlers (B6 lit la liste sans ouvrir la fenêtre : lecture périmée, voir r4)
- `t1b_denied.mjs` : permission MIDI refusée / navigateur sans Web MIDI
- `t1c_revealC.mjs` : rejouer la réponse révélée qui contient un Do
- `t2_pages.mjs`, `t2b_hidden.mjs` : Do + Espace sur chaque page (exercice invisible)
- `t3_routing.mjs`, `t3b_paused.mjs` : fenêtres ouvertes pendant un exercice, drapeau `paused`
- `t4_play.mjs` : page Play (iframe), relais des notes, silence de l'hôte, sortie de Play
- `t5_screenkbd.mjs`, `t5b_twofinger.mjs` : clavier écran souris / tactile / deux doigts
- `t6_mic.mjs`, `t6b_miccpu.mjs` : micro refusé / flux oscillateur / coupure / coût CPU
- `t7_leaks.mjs` : fuites timers / handlers / AudioContext
