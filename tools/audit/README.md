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
