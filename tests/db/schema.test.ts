import { expect, it } from 'vitest';
import { makeDb } from './harness';

// Retrato do schema depois de todas as migrations. Toda mudança de migration aparece na PR
// como diff de __snapshots__/schema.test.ts.snap, que se revisa à mão (atualizar: vitest -u).
type Row = Record<string, string | boolean>;
const ws = (s: unknown) => String(s ?? '').replace(/\s+/g, ' ').trim();

it('schema: policies, funções, triggers e RLS', async () => {
  const { db } = await makeDb();
  const pol = await db.query<Row>(`select schemaname, tablename, policyname, cmd, roles::text roles, permissive, qual, with_check
    from pg_policies order by schemaname, tablename, policyname`);
  const fns = await db.query<Row>(`select p.proname || '(' || pg_get_function_identity_arguments(p.oid) || ')' sig, pg_get_functiondef(p.oid) def
    from pg_proc p where p.pronamespace = 'public'::regnamespace and p.prokind in ('f', 'p') order by 1`);
  const trg = await db.query<Row>(`select tgrelid::regclass::text tbl, tgname, pg_get_triggerdef(oid) def
    from pg_trigger where not tgisinternal order by 1, 2`);
  const rls = await db.query<Row>(`select n.nspname || '.' || c.relname tbl, c.relrowsecurity, c.relforcerowsecurity
    from pg_class c join pg_namespace n on n.oid = c.relnamespace
    where c.relkind in ('r', 'p') and (n.nspname = 'public' or (n.nspname = 'storage' and c.relname = 'objects')) order by 1`);
  expect({
    policies: pol.rows.map(r => `${r.schemaname}.${r.tablename} "${r.policyname}" ${r.cmd} ${r.roles} ${r.permissive} USING ${ws(r.qual)} CHECK ${ws(r.with_check)}`),
    // Sem espaço no fim das linhas (o pg_get_functiondef preserva o do SQL original).
    functions: Object.fromEntries(fns.rows.map(r => [r.sig, String(r.def).replace(/[ \t]+$/gm, '')])),
    triggers: trg.rows.map(r => ws(r.def)),
    rls: rls.rows.map(r => `${r.tbl} rls=${r.relrowsecurity} force=${r.relforcerowsecurity}`),
  }).toMatchSnapshot();
});
