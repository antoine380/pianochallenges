#!/bin/bash
# Teste le SQL du rappel de leçon (migration 2026-10-25_reminder.sql) dans un Postgres local jetable (rien n'est envoyé à Supabase).
# Usage : bash tools/audit/sql/run.sh   (Postgres 16 installé : /usr/lib/postgresql/16/bin ; lancé en root, le serveur tourne sous « postgres »)
set -e
cd "$(dirname "$0")/../../.."
B=/usr/lib/postgresql/16/bin; D=$(mktemp -d /tmp/pcsql.XXXX); chown postgres "$D" 2>/dev/null || true
RUN(){ if [ "$(id -u)" = 0 ]; then su postgres -c "$*"; else bash -c "$*"; fi; }
RUN "$B/initdb -D $D/data -U postgres -A trust >/dev/null && $B/pg_ctl -D $D/data -o '-p 55499 -k $D' -l $D/log start >/dev/null"
trap 'RUN "$B/pg_ctl -D $D/data stop -m fast >/dev/null"; rm -rf "$D"' EXIT
sleep 1; P="psql -h $D -p 55499 -U postgres -v ON_ERROR_STOP=1 -q"
$P -c "create database t"; P="$P -d t"
N=$(mktemp); python3 - "$N" <<'PY'
import sys; n=open("supabase/notifications.sql").read(); n=n[:n.index("-- 3. envois")]; open(sys.argv[1],"w").write(n)
PY
M=$(mktemp); sed 's/create extension if not exists pg_cron;//' supabase/migrations/2026-10-25_reminder.sql > "$M"
$P -f tools/audit/sql/stub.sql >/dev/null; $P -f "$N" >/dev/null 2>&1; $P -f "$M" >/dev/null 2>&1; $P -f "$M" >/dev/null 2>&1 # deux fois : idempotente
OUT=$($P -f tools/audit/sql/r33_reminder.sql 2>&1); echo "$OUT"; rm -f "$N" "$M"
F=0; chk(){ if echo "$OUT" | grep -q -- "$1"; then echo "OK   $2"; else echo "FAIL $2"; F=1; fi; }
chk " 1 | fr   | remind | p04    | 0" "compte 1 : rappel de la leçon 4 à son heure (18 h)"
chk " 9 | en   | remind | p03    | 0" "compte 9 : une séance après un rappel remet le compteur à zéro"
chk "(2 rows)" "seuls les comptes 1 et 9 (désinscrit, joué aujourd'hui, fini, autre fuseau, 3 sans retour, série le même jour, sans Premiers pas : rien)"
chk "a_17h" "à 17 h : personne"; chk " 6 | kept | 3" "14 jours après : « Ta place est gardée »"
chk "heure 21 refusée : ok" "heure 21 refusée"; chk " 1 | t          |           1" "path_mark : compteur et date"
exit $F
