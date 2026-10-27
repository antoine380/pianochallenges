#!/bin/bash
# Lance une liste de tests contre un serveur local à lui (port libre), comme la CI (.github/workflows/ci.yml et nightly.yml).
# Usage (n'importe où) : bash tools/audit/ci_run.sh tools/audit/regression.mjs tools/audit/r9_setup.mjs tools/test_windows.py …
#   .mjs → node, .py → python3 ; chaque test a son délai (TEST_TIMEOUT, 900 s par défaut).
#   RETRY="r7_online r10_duel" : ces tests (nom sans extension) sont relancés une fois s'ils échouent (tests connus pour être instables).
#   Les scripts d'exploration t*.mjs n'ont pas de code d'échec : pour eux, seul un plantage compte.
#   PW_CHROMIUM / NODE_PATH sont transmis tels quels ; PORT est choisi ici (libre) sauf si CI_PORT est donné.
# Code de sortie 1 si au moins un test échoue ; résumé dans $GITHUB_STEP_SUMMARY quand il existe.
set -u
ROOT=$(cd "$(dirname "$0")/../.." && pwd)
cd "$ROOT" || exit 1
[ $# -gt 0 ] || { echo "usage : $0 <test> [<test>…]"; exit 2; }

PORT=${CI_PORT:-$(python3 -c 'import socket; s=socket.socket(); s.bind(("",0)); print(s.getsockname()[1]); s.close()')}
export PORT
LOG=$(mktemp -d)
python3 -m http.server "$PORT" >"$LOG/server.log" 2>&1 &
SRV=$!
trap 'kill $SRV 2>/dev/null; rm -rf "$LOG"' EXIT
for i in $(seq 1 50); do
  curl -fs -o /dev/null "http://localhost:$PORT/index.html" && break
  sleep 0.2
done
curl -fs -o /dev/null "http://localhost:$PORT/index.html" || { echo "ÉCHEC : le serveur local ne répond pas sur le port $PORT"; cat "$LOG/server.log"; exit 1; }
echo "Serveur local : http://localhost:$PORT/ (pid $SRV)"

TO=${TEST_TIMEOUT:-900}
FAILED=(); ROWS=()
run1(){ # $1 = fichier ; renvoie le code de sortie du test
  case "$1" in
    *.py) timeout --kill-after=20 "$TO" python3 "$1" ;;
    *)    timeout --kill-after=20 "$TO" node "$1" ;;
  esac
}
for f in "$@"; do
  b=$(basename "$f"); b=${b%.*}
  echo; echo "::group::$b"
  t0=$(date +%s); run1 "$f"; rc=$?
  if [ $rc -ne 0 ] && [[ " ${RETRY:-} " == *" $b "* ]]; then
    echo "--- $b a échoué (code $rc) : test connu pour être instable, nouvel essai"
    run1 "$f"; rc=$?; [ $rc -eq 0 ] && b="$b (2e essai)"
  fi
  dt=$(( $(date +%s) - t0 ))
  echo "::endgroup::"
  if [ $rc -eq 0 ]; then echo "ok    $b  ${dt}s"; ROWS+=("| $b | ok | ${dt} s |")
  else
    why="code $rc"; [ $rc -eq 124 ] || [ $rc -eq 137 ] && why="délai dépassé (${TO} s)"
    echo "::error title=Test en échec::$b ($why) — voir le groupe « $b » du journal"
    FAILED+=("$b"); ROWS+=("| $b | **ÉCHEC** ($why) | ${dt} s |")
  fi
done

if [ -n "${GITHUB_STEP_SUMMARY:-}" ]; then
  { echo "### Tests ${CI_SHARD:-}"; echo; echo "| Test | Résultat | Durée |"; echo "|---|---|---|"; printf '%s\n' "${ROWS[@]}"; echo; } >> "$GITHUB_STEP_SUMMARY"
fi
echo
if [ ${#FAILED[@]} -gt 0 ]; then echo "ÉCHEC : ${FAILED[*]}"; exit 1; fi
echo "Tous les tests passent ($#)."
