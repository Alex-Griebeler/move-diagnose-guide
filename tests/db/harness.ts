// Replay das migrations em PGlite, com papéis, auth e storage mínimos do Supabase.
// Portado de codex-review/bloco1-banco-acesso/replay/setup.mjs (bloco 1, 01/11/2026). Diferenças:
// a falha de migration vira exceção (antes: process.exit), e as linhas PASS/FAIL ficam
// gravadas em memória (antes: console.log) para o teste comparar com as saídas de referência.
import { PGlite } from '@electric-sql/pglite';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

export const REPO = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
export const NEW_MIG = '20261101120000_bloco1_banco_acesso.sql';
export const ROLLBACK = REPO + '/supabase/rollbacks/20261101120000_bloco1_banco_acesso_down.sql';
const MIG = REPO + '/supabase/migrations';
const FIXTURES = REPO + '/tests/db/fixtures';

export async function makeDb({ withNew = true } = {}) {
  const db = new PGlite();
  await db.exec(`CREATE ROLE anon NOLOGIN; CREATE ROLE authenticated NOLOGIN; CREATE ROLE service_role NOLOGIN BYPASSRLS;
CREATE SCHEMA auth; CREATE SCHEMA storage; CREATE SCHEMA extensions;
CREATE TABLE auth.users(id uuid PRIMARY KEY, email text, raw_user_meta_data jsonb DEFAULT '{}', raw_app_meta_data jsonb DEFAULT '{}');
CREATE FUNCTION auth.uid() RETURNS uuid LANGUAGE sql STABLE AS $$ SELECT nullif(current_setting('request.jwt.claim.sub',true),'')::uuid $$;
CREATE FUNCTION auth.role() RETURNS text LANGUAGE sql STABLE AS $$ SELECT current_user::text $$;
CREATE FUNCTION auth.jwt() RETURNS jsonb LANGUAGE sql STABLE AS $$ SELECT coalesce(nullif(current_setting('request.jwt.claims',true),''),'{}')::jsonb $$;
CREATE TABLE storage.buckets(id text PRIMARY KEY,name text,owner uuid,public boolean DEFAULT false,file_size_limit bigint,allowed_mime_types text[],created_at timestamptz DEFAULT now(),updated_at timestamptz DEFAULT now());
CREATE TABLE storage.objects(id uuid DEFAULT gen_random_uuid() PRIMARY KEY,bucket_id text,name text,owner uuid,metadata jsonb, UNIQUE(bucket_id,name));
ALTER TABLE storage.objects ENABLE ROW LEVEL SECURITY;
CREATE FUNCTION storage.foldername(text) RETURNS text[] LANGUAGE sql AS $$ SELECT (string_to_array($1,'/'))[1:array_length(string_to_array($1,'/'),1)-1] $$;
CREATE FUNCTION storage.filename(text) RETURNS text LANGUAGE sql AS $$ SELECT (string_to_array($1,'/'))[array_length(string_to_array($1,'/'),1)] $$;
GRANT USAGE ON SCHEMA public,auth,storage TO anon,authenticated,service_role;
GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA auth,storage TO anon,authenticated,service_role;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES TO anon,authenticated,service_role;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON SEQUENCES TO anon,authenticated,service_role;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT EXECUTE ON FUNCTIONS TO anon,authenticated,service_role;
GRANT ALL ON storage.objects, storage.buckets TO anon,authenticated,service_role;`);
  const files = fs.readdirSync(MIG).filter(f => f.endsWith('.sql')).sort().filter(f => withNew || f !== NEW_MIG);
  for (const f of files) {
    try { await db.exec(fs.readFileSync(MIG + '/' + f, 'utf8')); }
    catch (e) { throw new Error(`MIGRATION_FAIL ${f}: ${(e as Error).message}`); }
  }
  return { db, files };
}
export async function as(db: PGlite, uid?: string) { await db.exec(`RESET ROLE; SET ROLE ${uid ? 'authenticated' : 'anon'}; SELECT set_config('request.jwt.claim.sub','${uid || ''}',false);`); }
export async function asService(db: PGlite) { await db.exec(`RESET ROLE; SET ROLE service_role; SELECT set_config('request.jwt.claim.sub','',false);`); }
export async function sys(db: PGlite) { await db.exec(`RESET ROLE; SELECT set_config('request.jwt.claim.sub','',false);`); }

type Row = Record<string, string>;

export async function snapshot(db: PGlite) {
  const pol = await db.query<Row>(`select schemaname||'.'||tablename t, policyname, cmd, roles::text r, permissive, coalesce(qual,'') qual, coalesce(with_check,'') wc from pg_policies order by 1,2`);
  const fns = await db.query<Row>(`select p.proname||'('||pg_get_function_identity_arguments(p.oid)||')' f from pg_proc p where p.pronamespace='public'::regnamespace order by 1`);
  const trg = await db.query<Row>(`select tgrelid::regclass::text||'.'||tgname t from pg_trigger where not tgisinternal order by 1`);
  return [
    ...pol.rows.map(r => `POLICY [${r.t}] "${r.policyname}" ${r.cmd} ${r.r} ${r.permissive} USING ${r.qual.replace(/\s+/g, ' ')} CHECK ${r.wc.replace(/\s+/g, ' ')}`),
    ...fns.rows.map(r => `FUNCTION ${r.f}`),
    ...trg.rows.map(r => `TRIGGER ${r.t}`),
  ];
}

// Placar do cenário. Cada arquivo de teste roda num módulo isolado (padrão do Vitest).
let pass = 0, fail = 0, manualFails = 0;
let failures: string[] = [];
let lines: string[] = [];
export function resetChecks() { pass = 0; fail = 0; manualFails = 0; failures = []; lines = []; }
export function checks() { return { pass, fail, manualFails, failures: [...failures], lines: [...lines] }; }
// Substitui o console.log dos scripts originais: mesma linha, gravada em vez de impressa.
export function note(...args: unknown[]) { lines.push(args.map(String).join(' ')); }
// Substitui process.exitCode = 1 das checagens manuais.
export function manualFail() { manualFails++; }

type Result = { rows?: Row[]; n?: number; err?: string };
async function run(db: PGlite, sql: string): Promise<Result> {
  try { const r = await db.query<Row>(sql); return { rows: r.rows, n: Math.max(r.rows.length, r.affectedRows || 0) }; }
  catch (e) { return { err: (e as Error).message.split('\n')[0] }; }
}
function report(ok: boolean, label: string, want: string, r: Result) {
  const got = r.err ? `ERROR ${r.err}` : `rows=${r.n}`;
  if (ok) pass++; else { fail++; failures.push(label); }
  note(`${ok ? 'PASS' : 'FAIL'} [${want}] ${label} -> ${got}`);
}
// allow: sem erro e ao menos uma linha
export async function allow(db: PGlite, label: string, sql: string) { const r = await run(db, sql); report(!r.err && r.n > 0, label, 'allow', r); return r; }
// deny: erro ou nenhuma linha afetada/visível
export async function deny(db: PGlite, label: string, sql: string) { const r = await run(db, sql); report(!!r.err || r.n === 0, label, 'deny ', r); return r; }
// quiet: sem erro e sem nenhuma linha afetada (o que a tela vê como sucesso silencioso)
export async function quiet(db: PGlite, label: string, sql: string) { const r = await run(db, sql); report(!r.err && r.n === 0, label, 'quiet', r); return r; }
export async function denyErr(db: PGlite, label: string, sql: string, re?: RegExp) { const r = await run(db, sql); report(!!r.err && (!re || re.test(r.err)), label, 'error', r); return r; }
export function summary() { note(`\nRESULT pass=${pass} fail=${fail}`); if (fail) note('FAILED:', failures.join(' | ')); return fail; }

// Chave de comparação de uma linha de checagem, igual à do gerador dos fixtures:
//   "PASS [want] rótulo -> resultado"  →  "[want] rótulo"
//   "  PASS  texto: detalhe" (checagem manual)  →  "[manual] texto"
export function checkKey(line: string): { status: 'PASS' | 'FAIL'; key: string } | null {
  const m = /^\s*(PASS|FAIL)\s(.*)$/.exec(line);
  if (!m) return null;
  const status = m[1] as 'PASS' | 'FAIL';
  const rest = m[2];
  if (rest.startsWith('[')) {
    const i = rest.lastIndexOf(' -> ');
    return { status, key: i >= 0 ? rest.slice(0, i) : rest };
  }
  const text = rest.trim();
  const j = text.indexOf(': ');
  return { status, key: '[manual] ' + (j >= 0 ? text.slice(0, j) : text) };
}

export function readFixture(name: string): string[] {
  return fs.readFileSync(`${FIXTURES}/${name}.labels.txt`, 'utf8').split('\n').filter(l => l !== '');
}
