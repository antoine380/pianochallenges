#!/bin/bash
# Teste les migrations dans l'ordre (2026-10-24_leagues, 2026-10-25_admin, 2026-10-25_reminder, 2026-10-26_family) dans un Postgres local jetable
# (base pc_admin_test, recréée à chaque fois), puis les vérifications du back office (checks.sql), de la famille (family_checks.sql) et du rappel de leçon (run_reminder.sh).
# Ligues : chargées si supabase/migrations/2026-10-24_leagues.sql existe (ou LEAGUES_SQL=<chemin>).
# Usage (root, Postgres 16 local démarré : pg_ctlcluster 16 main start) : bash tools/audit/sql/run.sh
set -e
cd "$(dirname "$0")/../../.."
DB=pc_admin_test
P="su postgres -c"
$P "dropdb --if-exists $DB" >/dev/null; $P "createdb $DB"
TMP=$(mktemp -d); chmod 755 $TMP
cp tools/audit/sql/stub_supabase.sql $TMP/0.sql
# schema.sql sans les tâches planifiées (pg_cron, pg_net, vault n'existent pas ici)
python3 - "$TMP" <<'PY'
import sys,re; t=sys.argv[1]
s=open('supabase/schema.sql').read(); s=s.split('-- 3. envois planifiés')[0]
open(t+'/1.sql','w').write(s)
import os
lg=os.environ.get('LEAGUES_SQL') or 'supabase/migrations/2026-10-24_leagues.sql'
if os.path.exists(lg):
  l=open(lg).read(); l=l.split('create extension if not exists pg_cron')[0]  # sans pg_cron
  
  open(t+'/2.sql','w').write(l)
PY
cp supabase/migrations/2026-10-25_admin.sql $TMP/3.sql
# rappel de leçon (lot 4) après l'admin, sans la planification (pg_cron n'existe pas ici)
python3 -c "import sys; s=open('supabase/migrations/2026-10-25_reminder.sql').read(); open(sys.argv[1],'w').write(s.split('-- 5. chaque heure')[0])" $TMP/5.sql
cp tools/audit/sql/checks.sql $TMP/4.sql
cp supabase/migrations/2026-10-26_family.sql $TMP/6.sql
cp tools/audit/sql/family_checks.sql $TMP/7.sql
chmod 644 $TMP/*.sql
run(){ $P "psql -X -q -t -v ON_ERROR_STOP=1 -d $DB -f $1" 2>&1 | { grep -E "NOTICE:  ok|ERROR|ÉCHEC" || true; } | sed -E "s/^psql:[^ ]+ (NOTICE:  )?/  /"; test ${PIPESTATUS[0]} -eq 0; }
run $TMP/0.sql; run $TMP/1.sql
if [ -f $TMP/2.sql ]; then run $TMP/2.sql; echo "  (ligues installées)"; fi
run $TMP/3.sql; run $TMP/3.sql   # deux fois : idempotente
run $TMP/5.sql; run $TMP/5.sql; echo "  (rappel de leçon installé après l'admin, deux fois)"
run $TMP/4.sql
run $TMP/6.sql; run $TMP/6.sql; echo "  (famille et paiement installés, deux fois)"
run $TMP/7.sql
echo "SQL OK (leagues → admin → reminder → family, back office, famille)"
bash tools/audit/sql/run_reminder.sh
