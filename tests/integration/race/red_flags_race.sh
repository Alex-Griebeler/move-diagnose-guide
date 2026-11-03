#!/bin/bash
# Teste MANUAL (fora do Vitest e da CI) da Etapa 5a: corridas entre duas transações num PostgreSQL real (o PGlite
# tem uma conexão só), sobre as migrations de verdade de supabase/migrations/. A transação 1 segura a sua por 3 s;
# a 2 começa 1 s depois. Os dois primeiros casos rodam também sem a trava da anamnese na gravação, para mostrar que
# a corrida existe sem ela. No fim, o dono e o cascade de protocols. Cria um cluster descartável e apaga tudo no fim.
# Ver README.md. Dados sintéticos.
set -uo pipefail
PG_BIN="${PG_BIN:-/Applications/Postgres.app/Contents/Versions/latest/bin}"
PORT="${PG_PORT:-54332}"
HERE="$(cd "$(dirname "$0")" && pwd)"
REPO="$(cd "$HERE/../../.." && pwd)"
M1="$REPO/supabase/migrations/20261104120000_etapa5a_red_flags.sql"
TMP="$(mktemp -d)"
trap '"$PG_BIN/pg_ctl" -D "$TMP/data" -m fast stop >/dev/null 2>&1; rm -rf "$TMP"' EXIT

# O mesmo Supabase mínimo dos testes de banco: o primeiro bloco SQL de makeDb em tests/db/harness.ts
python3 - "$REPO/tests/db/harness.ts" "$TMP/supabase_min.sql" <<'EOF' || exit 1
import re, sys
m = re.search(r"await db\.exec\(`(CREATE ROLE anon.*?)`\);", open(sys.argv[1]).read(), re.S)
if not m: sys.exit('não achei o Supabase mínimo em harness.ts')
open(sys.argv[2], 'w').write(m.group(1))
EOF
# Sem a trava: a gravação lê a anamnese sem FOR UPDATE (só esse trecho de save_assessment_protocol muda)
python3 - "$M1" "$TMP/m1_sem_trava.sql" <<'EOF' || exit 1
import sys
s = open(sys.argv[1]).read()
start = s.index('CREATE OR REPLACE FUNCTION public.save_assessment_protocol(')
end = s.index('$$;', start)
lock = "FROM public.anamnesis_responses r\n  WHERE r.assessment_id = _assessment_id\n  FOR UPDATE;"
if s[start:end].count(lock) != 1: sys.exit('esperava uma leitura da anamnese com FOR UPDATE em save_assessment_protocol')
body = s[start:end].replace(lock, "FROM public.anamnesis_responses r\n  WHERE r.assessment_id = _assessment_id;")
open(sys.argv[2], 'w').write(s[:start] + body + s[end:])
EOF

"$PG_BIN/initdb" -D "$TMP/data" -U postgres -A trust > "$TMP/initdb.log" 2>&1 || { cat "$TMP/initdb.log"; exit 1; }
"$PG_BIN/pg_ctl" -D "$TMP/data" -l "$TMP/pg.log" -o "-k $TMP -p $PORT -c listen_addresses='' -c deadlock_timeout=200ms" -w start > /dev/null || { cat "$TMP/pg.log"; exit 1; }
export PGOPTIONS="-c client_min_messages=warning"
Q="$PG_BIN/psql -h $TMP -p $PORT -U postgres -X -q -v ON_ERROR_STOP=1"

P1=11111111-1111-4111-8111-111111111111
S1=22222222-2222-4222-8222-222222222222
A=aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa    # aberta, anamnese sem red flag
A2=bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb   # aberta, anamnese com red flag liberada
QS=cccccccc-cccc-4ccc-8ccc-cccccccccccc   # sessão rápida em andamento, red flag liberada
J='Liberado pelo médico sintético em 10/11'
R='Motivo sintético da revogação, com data'
SAVE="SELECT public.save_assessment_protocol('%s', '{\"name\":\"Protocolo sintético\",\"priority_level\":\"high\",\"frequency_per_week\":3,\"duration_weeks\":4,\"exercises\":[]}'::jsonb, '[]'::jsonb)"
CLEARANCE_A2="(SELECT id FROM public.red_flag_clearances WHERE assessment_id = '$A2')"
CLEARANCE_QS="(SELECT id FROM public.red_flag_clearances WHERE quick_session_id = '$QS')"
COMPLETE_QS="UPDATE public.quick_protocol_sessions SET status = 'completed', intervention_applied = '{\"exercicio\":\"sintético\"}' WHERE id = '$QS'"

# Um modelo por variante: migrations em ordem, e os dados sintéticos de cada corrida
$Q -d postgres -c "CREATE ROLE anon NOLOGIN; CREATE ROLE authenticated NOLOGIN; CREATE ROLE service_role NOLOGIN BYPASSRLS;" || exit 1
for v in com_trava sem_trava; do
  $Q -d postgres -c "CREATE DATABASE modelo_$v" || exit 1
  $Q -d modelo_$v -f <(sed '1d' "$TMP/supabase_min.sql") || exit 1
  for f in "$REPO"/supabase/migrations/*.sql; do
    [ $v = sem_trava ] && [ "$f" = "$M1" ] && f="$TMP/m1_sem_trava.sql"
    $Q -d modelo_$v -f "$f" > /dev/null || { echo "falhou: $f"; exit 1; }
  done
  $Q -d modelo_$v <<SQL || exit 1
INSERT INTO auth.users(id,email) VALUES ('$P1','p1@x.invalid'),('$S1','s1@x.invalid');
UPDATE public.user_roles SET role = 'professional' WHERE user_id = '$P1';
INSERT INTO public.professional_students(professional_id,student_id) VALUES ('$P1','$S1');
INSERT INTO public.assessments(id,professional_id,student_id,status) VALUES ('$A','$P1','$S1','in_progress'),('$A2','$P1','$S1','in_progress');
INSERT INTO public.anamnesis_responses(assessment_id,red_flags,has_red_flags) VALUES ('$A','{"nightPain":false}',false),('$A2','{"nightPain":true}',true);
INSERT INTO public.quick_protocol_sessions(id,professional_id,student_id,status,red_flags) VALUES ('$QS','$P1','$S1','in_progress','{"fever":true}');
SET ROLE authenticated;
SELECT set_config('request.jwt.claim.sub', '$P1', false);
SELECT public.clear_assessment_red_flags('$A2', '$J');
SELECT public.clear_quick_session_red_flags('$QS', '$J');
SQL
done > /dev/null

now() { python3 -c 'import time; print(time.time())'; }
as_who() { # P1 | service
  if [ "$1" = service ]; then echo "SET ROLE service_role"; else echo "SET ROLE authenticated; SELECT set_config('request.jwt.claim.sub', '$P1', false)"; fi
}
n=0
# race <variante> <título> <quem 1> <sql 1> <quem 2> <sql 2> <estado>: cada corrida numa cópia nova do modelo
race() {
  n=$((n + 1)); local db="corrida_$n"
  $Q -d postgres -c "CREATE DATABASE $db TEMPLATE modelo_$1" || exit 1
  ( $Q -d $db -c "BEGIN" -c "$(as_who "$3")" -c "$4" -c "SELECT pg_sleep(3)" -c "COMMIT" > "$TMP/t1.out" 2>&1; echo $? > "$TMP/t1.exit" ) &
  sleep 1
  local t0 t1 out e e1 err1
  t0=$(now)
  out=$($Q -d $db -c "$(as_who "$5")" -c "$6" 2>&1); e=$?
  t1=$(now)
  wait
  e1=$(cat "$TMP/t1.exit"); err1=$(grep -m1 ERROR "$TMP/t1.out")
  echo "== $2 ($1)"
  echo "   T1: exit=$e1${err1:+ | $err1}"
  echo "   T2: exit=$e, esperou $(python3 -c "print(round($t1-$t0,1))") s$(echo "$out" | grep -m1 ERROR | sed 's/^/ | /')"
  echo "   estado: $($Q -d $db -Atc "$7")"
}
STATE_A="SELECT 'status=' || (SELECT status FROM assessments WHERE id = '%s') || ' protocolos=' || (SELECT count(*) FROM protocols WHERE assessment_id = '%s') || ' red_flags=' || (SELECT red_flags::text FROM anamnesis_responses WHERE assessment_id = '%s')"
state_a() { printf "$STATE_A" "$1" "$1" "$1"; }
STATE_QS="SELECT 'status=' || status || ' intervenção=' || coalesce(intervention_applied::text, 'nenhuma') || ' red_flags=' || red_flags::text FROM quick_protocol_sessions WHERE id = '$QS'"
MARK="UPDATE public.anamnesis_responses SET red_flags = '{\"nightPain\":true}', has_red_flags = true WHERE assessment_id = '$A'"

for v in com_trava sem_trava; do
  race $v "gravação × anamnese: a anamnese marca red flag primeiro" P1 "$MARK" P1 "$(printf "$SAVE" "$A")" "$(state_a "$A")"
  race $v "gravação × anamnese: a gravação primeiro" P1 "$(printf "$SAVE" "$A")" P1 "$MARK" "$(state_a "$A")"
done
race com_trava "liberação × anamnese: a anamnese acende outra red flag primeiro" \
  P1 "UPDATE public.anamnesis_responses SET red_flags = '{\"nightPain\":true,\"fever\":true}' WHERE assessment_id = '$A2'" \
  P1 "SELECT public.clear_assessment_red_flags('$A2', '$J')" \
  "SELECT 'liberações=' || count(*) || ' a última cobre=' || (array_agg(c.cleared_flags::text ORDER BY c.created_at DESC))[1] || ' versão igual à da anamnese=' || bool_or(c.red_flags_version = r.red_flags_version) FROM red_flag_clearances c JOIN anamnesis_responses r USING (assessment_id) WHERE c.assessment_id = '$A2'"
race com_trava "revogação × gravação: a revogação primeiro" \
  P1 "SELECT public.revoke_red_flag_clearance($CLEARANCE_A2, '$R')" P1 "$(printf "$SAVE" "$A2")" "$(state_a "$A2")"
race com_trava "revogação × gravação: a gravação primeiro" \
  P1 "$(printf "$SAVE" "$A2")" P1 "SELECT public.revoke_red_flag_clearance($CLEARANCE_A2, '$R')" \
  "$(state_a "$A2") || ' revogações=' || (SELECT count(*) FROM red_flag_clearance_revocations)"
race com_trava "sem deadlock: anamnese travada e marcada, apagar a avaliação no meio" \
  P1 "SELECT 1 FROM public.anamnesis_responses WHERE assessment_id = '$A' FOR UPDATE; SELECT pg_sleep(1.5); $MARK" \
  P1 "DELETE FROM public.assessments WHERE id = '$A'" \
  "SELECT 'avaliações=' || (SELECT count(*) FROM assessments WHERE id = '$A') || ' anamneses=' || (SELECT count(*) FROM anamnesis_responses WHERE assessment_id = '$A')"
race com_trava "sem deadlock: avaliação apagada, a anamnese no meio" \
  P1 "DELETE FROM public.assessments WHERE id = '$A'" P1 "$MARK" \
  "SELECT 'avaliações=' || (SELECT count(*) FROM assessments WHERE id = '$A') || ' anamneses=' || (SELECT count(*) FROM anamnesis_responses WHERE assessment_id = '$A')"
race com_trava "sessão rápida: a red flag nova primeiro, a conclusão no meio" \
  P1 "UPDATE public.quick_protocol_sessions SET red_flags = '{\"fever\":true,\"nightPain\":true}' WHERE id = '$QS'" P1 "$COMPLETE_QS" "$STATE_QS"
race com_trava "sessão rápida: a revogação primeiro, a conclusão no meio" \
  P1 "SELECT public.revoke_red_flag_clearance($CLEARANCE_QS, '$R')" P1 "$COMPLETE_QS" "$STATE_QS"
race com_trava "sessão rápida: a conclusão primeiro, a revogação no meio" \
  P1 "$COMPLETE_QS" P1 "SELECT public.revoke_red_flag_clearance($CLEARANCE_QS, '$R')" "$STATE_QS"

# Dono e cascade de protocols, sobre as migrations de verdade. Um trigger de teste registra quem apaga.
$Q -d postgres -c "CREATE DATABASE dono TEMPLATE modelo_com_trava" || exit 1
$Q -d dono > /dev/null <<SQL || exit 1
CREATE TABLE public.cascade_seen(who text, owner text, op text, depth int);
GRANT INSERT ON public.cascade_seen TO anon, authenticated, service_role;
CREATE FUNCTION public.cascade_probe() RETURNS trigger LANGUAGE plpgsql SET search_path = '' AS \$\$
BEGIN
  INSERT INTO public.cascade_seen VALUES (current_user, (SELECT pg_catalog.pg_get_userbyid(c.relowner) FROM pg_catalog.pg_class c WHERE c.oid = TG_RELID), TG_OP, pg_catalog.pg_trigger_depth());
  RETURN OLD;
END \$\$;
CREATE TRIGGER a_cascade_probe BEFORE DELETE ON public.protocols FOR EACH ROW EXECUTE FUNCTION public.cascade_probe();
SET ROLE authenticated;
SELECT set_config('request.jwt.claim.sub', '$P1', false);
$(printf "$SAVE" "$A");
SQL
try() { out=$($Q -d dono -c "$(as_who "$2")" -c "$3" 2>&1 | grep -m1 ERROR); echo "   $1: ${out:-ok}"; }
echo "== dono e cascade de protocols"
try "service_role apaga protocolo direto" service "DELETE FROM public.protocols WHERE assessment_id = '$A'"
try "service_role muda protocolo direto" service "UPDATE public.protocols SET name = 'x' WHERE assessment_id = '$A'"
try "service_role TRUNCATE protocols" service "TRUNCATE public.protocols"
try "service_role TRUNCATE assessments CASCADE" service "TRUNCATE public.assessments CASCADE"
try "authenticated TRUNCATE protocols" P1 "TRUNCATE public.protocols"
try "service_role apaga a avaliação concluída (cascade)" service "DELETE FROM public.assessments WHERE id = '$A'"
echo "   o que o trigger de teste viu (só os confirmados): $($Q -d dono -Atc "SELECT string_agg(who || '/' || owner || '/' || op || '/depth=' || depth, '; ') FROM cascade_seen")"
echo "   protocolos restantes: $($Q -d dono -Atc "SELECT count(*) FROM protocols")"
