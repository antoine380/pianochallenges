#!/bin/sh
# Lance les tests de non-régression r*.mjs ; s'arrête au premier échec. PORT / PW_CHROMIUM sont transmis.
cd "$(dirname "$0")" || exit 1
for f in r*.mjs; do echo "=== $f"; node "$f" || { echo "ECHEC: $f"; exit 1; }; done
echo "Tous les tests r* passent."
