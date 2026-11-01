#!/bin/bash
# Teste MANUAL (fora do Vitest e da CI): corrida entre duas inserções service_role com o mesmo id,
# uma em assessments e outra em quick_protocol_sessions, num PostgreSQL real (o PGlite tem uma
# conexão só). Usa a seção i) da migration do bloco 1 com o pg_advisory_xact_lock e sem ele.
# Cria um cluster descartável num diretório temporário e apaga tudo no fim. Ver README.md.
set -uo pipefail
PG_BIN="${PG_BIN:-/Applications/Postgres.app/Contents/Versions/latest/bin}"
PORT="${PG_PORT:-54331}"
HERE="$(cd "$(dirname "$0")" && pwd)"
REPO="$(cd "$HERE/../../.." && pwd)"
MIG="$REPO/supabase/migrations/20261101120000_bloco1_banco_acesso.sql"
TMP="$(mktemp -d)"
trap '"$PG_BIN/pg_ctl" -D "$TMP/data" -m fast stop >/dev/null 2>&1; rm -rf "$TMP"' EXIT

# section_i.sql tem de ser um trecho literal da migration atual; a versão sem trava tira só a linha do lock.
python3 - "$HERE/section_i.sql" "$MIG" <<'EOF' || exit 1
import sys
a, m = open(sys.argv[1]).read().strip(), open(sys.argv[2]).read()
if a not in m: sys.exit('section_i.sql não é mais um trecho literal da migration: atualize antes de rodar')
EOF
grep -v 'pg_advisory_xact_lock' "$HERE/section_i.sql" > "$TMP/section_i_nolock.sql"
[ $(( $(wc -l < "$HERE/section_i.sql") - $(wc -l < "$TMP/section_i_nolock.sql") )) -eq 1 ] || { echo "esperava tirar 1 linha de lock"; exit 1; }

"$PG_BIN/initdb" -D "$TMP/data" -U postgres -A trust > "$TMP/initdb.log" 2>&1 || { cat "$TMP/initdb.log"; exit 1; }
"$PG_BIN/pg_ctl" -D "$TMP/data" -l "$TMP/pg.log" -o "-k $TMP -p $PORT -c listen_addresses=''" -w start > /dev/null || { cat "$TMP/pg.log"; exit 1; }
export PGOPTIONS="-c client_min_messages=warning"
Q="$PG_BIN/psql -h $TMP -p $PORT -U postgres -X -q -v ON_ERROR_STOP=1"

$Q -d postgres -c "CREATE ROLE anon NOLOGIN; CREATE ROLE authenticated NOLOGIN; CREATE ROLE service_role NOLOGIN BYPASSRLS;"
X=0b0b0b0b-0000-4000-8000-00000000000b
for v in lock nolock; do
  $Q -d postgres -c "CREATE DATABASE race_$v"
  $Q -d race_$v -c "CREATE TABLE public.assessments(id uuid PRIMARY KEY DEFAULT gen_random_uuid(), note text); CREATE TABLE public.quick_protocol_sessions(id uuid PRIMARY KEY DEFAULT gen_random_uuid(), note text); GRANT USAGE ON SCHEMA public TO anon, authenticated, service_role; GRANT ALL ON ALL TABLES IN SCHEMA public TO anon, authenticated, service_role;"
  f="$HERE/section_i.sql"; [ $v = nolock ] && f="$TMP/section_i_nolock.sql"
  $Q -d race_$v -f "$f" || exit 1
  ( $Q -d race_$v -c "BEGIN" -c "SET ROLE service_role" -c "INSERT INTO assessments(id,note) VALUES('$X','sessao 1')" -c "SELECT pg_sleep(3)" -c "COMMIT" > /dev/null 2>&1 ) &
  sleep 1
  t0=$(python3 -c 'import time;print(time.time())')
  out=$($Q -d race_$v -c "SET ROLE service_role" -c "INSERT INTO quick_protocol_sessions(id,note) VALUES('$X','sessao 2')" 2>&1); e=$?
  t1=$(python3 -c 'import time;print(time.time())')
  wait
  n=$($Q -d race_$v -Atc "SELECT count(*) FROM assessments a JOIN quick_protocol_sessions q USING (id)")
  echo "== $v: sessão 2 exit=$e, esperou $(python3 -c "print(round($t1-$t0,1))") s, colisões=$n ${out:+| $(echo "$out" | head -1)}"
  c=$($Q -d race_$v -Atc "SET ROLE authenticated" -c "INSERT INTO assessments(id,note) VALUES('$X','cliente') RETURNING id = '$X'" 2>&1 | tail -1)
  echo "   cliente manda id X: id mantido? $c (f = trocado pelo servidor)"
done
