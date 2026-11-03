#!/bin/bash
# Teste MANUAL (fora do Vitest e da CI) da Etapa 5a: corridas entre duas transações num PostgreSQL real (o PGlite
# tem uma conexão só), sobre as migrations de verdade de supabase/migrations/. A transação 2 começa quando a 1 já
# fez o seu comando e dorme 3 s antes do COMMIT. Os dois primeiros casos rodam também sem a trava da anamnese na
# gravação, para mostrar que a corrida existe sem ela. No fim, o dono e o cascade de protocols. Cada caso confere o
# erro esperado, se a 2 ficou parada numa trava da 1 (pg_stat_activity) e o estado final; o script sai com erro se
# algum não bater. Cria um cluster descartável e apaga tudo no fim. Ver README.md. Dados sintéticos.
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
fails=0
check() { # <ok?> <motivo>: conta a falha e diz qual foi
  if [ "$1" = 1 ]; then return; fi
  fails=$((fails + 1)); echo "   FALHOU: $2"
}
n=0
# race <variante> <título> <quem 1> <sql 1> <quem 2> <sql 2> <sql do estado> <erro esperado na 2 ('' = sem erro)>
#      <a 2 espera? sim|não> <estado esperado>
# Cada corrida numa cópia nova do modelo. A 2 só começa quando a 1 já fez o seu comando e está no pg_sleep, com as
# travas seguras; a 1 ainda dorme 3 s antes do COMMIT. A 1 nunca pode falhar.
race() {
  n=$((n + 1)); local db="corrida_$n" app="t1_corrida_$n"
  $Q -d postgres -c "CREATE DATABASE $db TEMPLATE modelo_$1" || exit 1
  ( PGAPPNAME=$app $Q -d $db -c "BEGIN" -c "$(as_who "$3")" -c "$4" -c "SELECT pg_sleep(3)" -c "COMMIT" > "$TMP/t1.out" 2>&1; echo $? > "$TMP/t1.exit" ) &
  local tries=0
  until [ "$($Q -d postgres -Atc "SELECT count(*) FROM pg_stat_activity WHERE application_name = '$app' AND wait_event = 'PgSleep'")" = 1 ]; do
    tries=$((tries + 1)); [ $tries -gt 100 ] && { echo "a transação 1 não chegou ao pg_sleep: $2"; exit 1; }
    sleep 0.1
  done
  # A 2 roda ao lado; enquanto ela não termina, o script olha se ela está parada esperando uma trava (Lock)
  local t0 t1 e e1 err1 err2 waited state locked=não app2="t2_corrida_$n"
  t0=$(now)
  ( PGAPPNAME=$app2 $Q -d $db -c "$(as_who "$5")" -c "$6" > "$TMP/t2.out" 2>&1; echo $? > "$TMP/t2.exit" ) &
  local t2pid=$!
  while kill -0 $t2pid 2>/dev/null; do
    [ "$($Q -d postgres -Atc "SELECT count(*) FROM pg_stat_activity WHERE application_name = '$app2' AND wait_event_type = 'Lock'")" = 1 ] && locked=sim
    sleep 0.05
  done
  t1=$(now)
  # Sem espera, a 2 tem de ter terminado com a 1 ainda aberta, dormindo
  local t1_open
  t1_open=$($Q -d postgres -Atc "SELECT count(*) FROM pg_stat_activity WHERE application_name = '$app' AND wait_event = 'PgSleep'")
  wait
  e1=$(cat "$TMP/t1.exit"); err1=$(grep -m1 ERROR "$TMP/t1.out")
  e=$(cat "$TMP/t2.exit"); err2=$(grep -m1 ERROR "$TMP/t2.out")
  waited=$(python3 -c "print(round($t1-$t0,1))")
  state=$($Q -d $db -Atc "$7")
  echo "== $2 ($1)"
  echo "   T1: exit=$e1${err1:+ | $err1}"
  echo "   T2: exit=$e, esperou trava: $locked ($waited s)${err2:+ | $err2}"
  echo "   estado: $state"
  check "$([ "$e1" = 0 ] && [ -z "$err1" ] && echo 1)" "a transação 1 falhou"
  if [ -z "$8" ]; then
    check "$([ "$e" = 0 ] && [ -z "$err2" ] && echo 1)" "a transação 2 devia passar"
  else
    check "$([ "$e" != 0 ] && [[ "$err2" == *"$8"* ]] && echo 1)" "a transação 2 devia dar: $8"
  fi
  if [ "$9" = sim ]; then
    check "$([ "$locked" = sim ] && echo 1)" "a transação 2 devia ficar parada na trava da 1"
  else
    check "$([ "$locked" = não ] && [ "$t1_open" = 1 ] && echo 1)" "a transação 2 devia terminar sem trava, com a 1 ainda aberta"
  fi
  check "$([ "$state" = "${10}" ] && echo 1)" "estado esperado: ${10}"
}
STATE_A="SELECT 'status=' || (SELECT status FROM assessments WHERE id = '%s') || ' protocolos=' || (SELECT count(*) FROM protocols WHERE assessment_id = '%s') || ' red_flags=' || (SELECT red_flags::text FROM anamnesis_responses WHERE assessment_id = '%s')"
state_a() { printf "$STATE_A" "$1" "$1" "$1"; }
STATE_QS="SELECT 'status=' || status || ' intervenção=' || coalesce(intervention_applied::text, 'nenhuma') || ' red_flags=' || red_flags::text FROM quick_protocol_sessions WHERE id = '$QS'"
STATE_GONE="SELECT 'avaliações=' || (SELECT count(*) FROM assessments WHERE id = '$A') || ' anamneses=' || (SELECT count(*) FROM anamnesis_responses WHERE assessment_id = '$A')"
MARK="UPDATE public.anamnesis_responses SET red_flags = '{\"nightPain\":true}', has_red_flags = true WHERE assessment_id = '$A'"
CLOSED='the anamnesis changes only while its assessment is open'
NOT_FOUND='clearance not found or not yours'

race com_trava "gravação × anamnese: a anamnese marca red flag primeiro" P1 "$MARK" P1 "$(printf "$SAVE" "$A")" "$(state_a "$A")" \
  red_flags_not_cleared sim 'status=in_progress protocolos=0 red_flags={"nightPain": true}'
race com_trava "gravação × anamnese: a gravação primeiro" P1 "$(printf "$SAVE" "$A")" P1 "$MARK" "$(state_a "$A")" \
  "$CLOSED" sim 'status=completed protocolos=1 red_flags={"nightPain": false}'
# Sem a trava, a corrida acontece: nos dois casos, o protocolo fica salvo com a red flag marcada
race sem_trava "gravação × anamnese: a anamnese marca red flag primeiro" P1 "$MARK" P1 "$(printf "$SAVE" "$A")" "$(state_a "$A")" \
  '' não 'status=completed protocolos=1 red_flags={"nightPain": true}'
race sem_trava "gravação × anamnese: a gravação primeiro" P1 "$(printf "$SAVE" "$A")" P1 "$MARK" "$(state_a "$A")" \
  '' não 'status=completed protocolos=1 red_flags={"nightPain": true}'
race com_trava "liberação × anamnese: a anamnese acende outra red flag primeiro" \
  P1 "UPDATE public.anamnesis_responses SET red_flags = '{\"nightPain\":true,\"fever\":true}' WHERE assessment_id = '$A2'" \
  P1 "SELECT public.clear_assessment_red_flags('$A2', '$J')" \
  "SELECT 'liberações=' || count(*) || ' a última cobre=' || (array_agg(c.cleared_flags::text ORDER BY c.created_at DESC))[1] || ' versão igual à da anamnese=' || bool_or(c.red_flags_version = r.red_flags_version) FROM red_flag_clearances c JOIN anamnesis_responses r USING (assessment_id) WHERE c.assessment_id = '$A2'" \
  '' sim 'liberações=2 a última cobre={fever,nightPain} versão igual à da anamnese=true'
race com_trava "revogação × gravação: a revogação primeiro" \
  P1 "SELECT public.revoke_red_flag_clearance($CLEARANCE_A2, '$R')" P1 "$(printf "$SAVE" "$A2")" "$(state_a "$A2")" \
  red_flags_not_cleared sim 'status=in_progress protocolos=0 red_flags={"nightPain": true}'
race com_trava "revogação × gravação: a gravação primeiro" \
  P1 "$(printf "$SAVE" "$A2")" P1 "SELECT public.revoke_red_flag_clearance($CLEARANCE_A2, '$R')" \
  "$(state_a "$A2") || ' revogações=' || (SELECT count(*) FROM red_flag_clearance_revocations)" \
  "$NOT_FOUND" sim 'status=completed protocolos=1 red_flags={"nightPain": true} revogações=0'
race com_trava "sem deadlock: anamnese travada e marcada, apagar a avaliação no meio" \
  P1 "SELECT 1 FROM public.anamnesis_responses WHERE assessment_id = '$A' FOR UPDATE; SELECT pg_sleep(1.5); $MARK" \
  P1 "DELETE FROM public.assessments WHERE id = '$A'" "$STATE_GONE" '' sim 'avaliações=0 anamneses=0'
race com_trava "sem deadlock: avaliação apagada, a anamnese no meio" \
  P1 "DELETE FROM public.assessments WHERE id = '$A'" P1 "$MARK" "$STATE_GONE" '' sim 'avaliações=0 anamneses=0'
race com_trava "sessão rápida: a red flag nova primeiro, a conclusão no meio" \
  P1 "UPDATE public.quick_protocol_sessions SET red_flags = '{\"fever\":true,\"nightPain\":true}' WHERE id = '$QS'" P1 "$COMPLETE_QS" "$STATE_QS" \
  red_flags_not_cleared sim 'status=in_progress intervenção=nenhuma red_flags={"fever": true, "nightPain": true}'
race com_trava "sessão rápida: a revogação primeiro, a conclusão no meio" \
  P1 "SELECT public.revoke_red_flag_clearance($CLEARANCE_QS, '$R')" P1 "$COMPLETE_QS" "$STATE_QS" \
  red_flags_not_cleared sim 'status=in_progress intervenção=nenhuma red_flags={"fever": true}'
race com_trava "sessão rápida: a conclusão primeiro, a revogação no meio" \
  P1 "$COMPLETE_QS" P1 "SELECT public.revoke_red_flag_clearance($CLEARANCE_QS, '$R')" "$STATE_QS" \
  "$NOT_FOUND" sim 'status=completed intervenção={"exercicio": "sintético"} red_flags={"fever": true}'

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
# try <rótulo> <quem> <sql> <erro esperado ('' = sem erro)>
try() {
  local out; out=$($Q -d dono -c "$(as_who "$2")" -c "$3" 2>&1 | grep -m1 ERROR)
  echo "   $1: ${out:-ok}"
  if [ -z "$4" ]; then check "$([ -z "$out" ] && echo 1)" "devia passar"; else check "$([[ "$out" == *"$4"* ]] && echo 1)" "devia dar: $4"; fi
}
WRITTEN_BY_RPC='protocols are written only by save_assessment_protocol'
DENIED='permission denied for table protocols'
echo "== dono e cascade de protocols"
try "service_role apaga protocolo direto" service "DELETE FROM public.protocols WHERE assessment_id = '$A'" "$WRITTEN_BY_RPC"
try "service_role muda protocolo direto" service "UPDATE public.protocols SET name = 'x' WHERE assessment_id = '$A'" "$WRITTEN_BY_RPC"
try "service_role TRUNCATE protocols" service "TRUNCATE public.protocols" "$DENIED"
try "service_role TRUNCATE assessments CASCADE" service "TRUNCATE public.assessments CASCADE" "$DENIED"
try "authenticated TRUNCATE protocols" P1 "TRUNCATE public.protocols" "$DENIED"
try "service_role apaga a avaliação concluída (cascade)" service "DELETE FROM public.assessments WHERE id = '$A'" ''
seen=$($Q -d dono -Atc "SELECT string_agg(who || '/' || owner || '/' || op || '/depth=' || depth, '; ') FROM cascade_seen")
left=$($Q -d dono -Atc "SELECT count(*) FROM protocols")
echo "   o que o trigger de teste viu (só os confirmados): $seen"
echo "   protocolos restantes: $left"
check "$([ "$seen" = 'postgres/postgres/DELETE/depth=2' ] && echo 1)" "o cascade devia rodar como o dono (postgres), na profundidade 2"
check "$([ "$left" = 0 ] && echo 1)" "o protocolo devia sair junto com a avaliação"

echo "== falhas: $fails"
[ "$fails" = 0 ]
