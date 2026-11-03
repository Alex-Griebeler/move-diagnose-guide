import fs from 'node:fs';
import type { PGlite } from '@electric-sql/pglite';
import { describe, expect, it } from 'vitest';
import { makeDb, as, sys, REPO, ETAPA5A } from './harness';

// Etapa 3c (F-04): uma anamnese por avaliação e um resultado segmentar por teste da avaliação.
// Os wizards gravam com upsert nessas chaves; antes, "Voltar" e reenviar inseria outra linha.
// Portado de work/codex-review/etapa3c-voltar-pular-rascunho/replay (fora deste repositório).
// O banco como a 3c o deixou: sem a 5a, que fecha a anamnese de avaliação concluída para todos os papéis
// (etapa5a.test.ts) e mudaria o erro esperado aqui.
const MIGRATION = '20261102120000_etapa3c_unicidade_filhas.sql';
const MIGRATION_SQL = fs.readFileSync(`${REPO}/supabase/migrations/${MIGRATION}`, 'utf8');
const ROLLBACK_SQL = fs.readFileSync(`${REPO}/supabase/rollbacks/20261102120000_etapa3c_unicidade_filhas_down.sql`, 'utf8');
const UNIQUES = `('uq_anamnesis_responses_assessment','uq_segmental_test_results_assessment_test')`;

const id = (n: string) => `${n.repeat(8)}-${n.repeat(4)}-4${n.repeat(3)}-8${n.repeat(3)}-${n.repeat(12)}`;
const P1 = id('1'), S1 = id('2'), A_OPEN = id('a'), A_DONE = id('b');
const RLS = /row-level security/, NO_KEY = /no unique or exclusion constraint/, DUP = /duplicate key/;

async function seed(db: PGlite) {
  await sys(db);
  await db.exec(`INSERT INTO auth.users(id,email) VALUES ('${P1}','p1@x.invalid'),('${S1}','s1@x.invalid');
UPDATE public.user_roles SET role='professional' WHERE user_id='${P1}';
INSERT INTO public.professional_students(professional_id,student_id) VALUES('${P1}','${S1}');
INSERT INTO public.assessments(id,professional_id,student_id,status) VALUES('${A_OPEN}','${P1}','${S1}','in_progress'),('${A_DONE}','${P1}','${S1}','completed');
INSERT INTO public.anamnesis_responses(assessment_id,weight_kg) VALUES('${A_DONE}',60);
INSERT INTO public.segmental_test_results(assessment_id,test_name,body_region,left_value) VALUES('${A_DONE}','Teste A sintético','regiao',1);`);
}
async function value(db: PGlite, sql: string) {
  await sys(db);
  return Number(Object.values((await db.query<Record<string, unknown>>(sql)).rows[0])[0]);
}
async function errorOf(db: PGlite, sql: string) {
  try { await db.query(sql); return ''; } catch (e) { return (e as Error).message; }
}
// What supabase-js sends for upsert(..., { onConflict })
const upsertAnamnesis = (a: string, w: number) => `INSERT INTO anamnesis_responses(assessment_id,weight_kg) VALUES('${a}',${w})
  ON CONFLICT (assessment_id) DO UPDATE SET weight_kg=EXCLUDED.weight_kg`;
const upsertSegmental = (a: string, rows: Array<[string, number]>) => `INSERT INTO segmental_test_results(assessment_id,test_name,body_region,left_value)
  VALUES ${rows.map(([t, v]) => `('${a}','${t}','regiao',${v})`).join(',')}
  ON CONFLICT (assessment_id,test_name) DO UPDATE SET left_value=EXCLUDED.left_value`;
const count = (table: string, a: string) => `select count(*) from ${table} where assessment_id='${a}'`;

describe('sem a migration (o defeito)', () => {
  it('reenviar insere outra anamnese e outro resultado do mesmo teste; upsert por chave falha', async () => {
    const { db } = await makeDb({ skip: [MIGRATION, ...ETAPA5A] });
    await seed(db);
    await as(db, P1);
    await db.exec(`INSERT INTO anamnesis_responses(assessment_id) VALUES('${A_OPEN}'); INSERT INTO anamnesis_responses(assessment_id) VALUES('${A_OPEN}');
INSERT INTO segmental_test_results(assessment_id,test_name,body_region) VALUES('${A_OPEN}','Teste A sintético','regiao'),('${A_OPEN}','Teste A sintético','regiao');`);
    expect(await value(db, count('anamnesis_responses', A_OPEN))).toBe(2);
    expect(await value(db, count('segmental_test_results', A_OPEN))).toBe(2);
    await as(db, P1);
    expect(await errorOf(db, upsertAnamnesis(A_OPEN, 70))).toMatch(NO_KEY);
  });
});

describe('a migration', () => {
  it('as colunas da chave são NOT NULL, então nenhum NULL escapa da unicidade', async () => {
    const { db } = await makeDb({ skip: [MIGRATION, ...ETAPA5A] });
    const r = await db.query<{ c: string; is_nullable: string }>(`select table_name||'.'||column_name c, is_nullable from information_schema.columns
      where table_schema='public' and ((table_name='anamnesis_responses' and column_name='assessment_id')
        or (table_name='segmental_test_results' and column_name in ('assessment_id','test_name'))) order by 1`);
    expect(r.rows).toStrictEqual([
      { c: 'anamnesis_responses.assessment_id', is_nullable: 'NO' },
      { c: 'segmental_test_results.assessment_id', is_nullable: 'NO' },
      { c: 'segmental_test_results.test_name', is_nullable: 'NO' },
    ]);
  });

  it.each([
    ['anamnese duplicada', `INSERT INTO anamnesis_responses(assessment_id) VALUES('${A_OPEN}'),('${A_OPEN}')`, /mais de uma anamnese/],
    ['teste segmentar repetido', `INSERT INTO segmental_test_results(assessment_id,test_name,body_region) VALUES('${A_OPEN}','t','r'),('${A_OPEN}','t','r')`, /teste segmentar repetido/],
  ])('com %s, aborta sem criar nada e sem apagar nenhuma linha', async (_label, duplicate, reason) => {
    const { db } = await makeDb({ skip: [MIGRATION, ...ETAPA5A] });
    await seed(db);
    await db.exec(duplicate);
    const rows = `select (select count(*) from anamnesis_responses)+(select count(*) from segmental_test_results)`;
    const before = await value(db, rows);
    // Como em produção: o arquivo inteiro numa transação
    let error = '';
    try { await db.exec(`BEGIN;\n${MIGRATION_SQL}\nCOMMIT;`); } catch (e) { error = (e as Error).message; await db.exec('ROLLBACK'); }
    expect(error).toMatch(reason);
    expect(await value(db, `select count(*) from pg_constraint where conname in ${UNIQUES}`)).toBe(0);
    expect(await value(db, rows)).toBe(before);
  });
});

describe('com a migration', () => {
  it('reenviar atualiza a linha salva; insert repetido falha; avaliação concluída continua fechada', async () => {
    const { db } = await makeDb({ skip: ETAPA5A });
    expect(await value(db, `select count(*) from pg_constraint where conname in ${UNIQUES} and contype='u'`)).toBe(2);
    await seed(db);
    await as(db, P1);
    await db.exec(upsertAnamnesis(A_OPEN, 70));
    await db.exec(upsertAnamnesis(A_OPEN, 71));
    expect(await value(db, count('anamnesis_responses', A_OPEN))).toBe(1);
    expect(await value(db, `select weight_kg from anamnesis_responses where assessment_id='${A_OPEN}'`)).toBe(71);
    await as(db, P1);
    expect(await errorOf(db, `INSERT INTO anamnesis_responses(assessment_id) VALUES('${A_OPEN}')`)).toMatch(DUP);

    await db.exec(upsertSegmental(A_OPEN, [['Teste A sintético', 8], ['Teste B sintético', 11]]));
    await db.exec(upsertSegmental(A_OPEN, [['Teste A sintético', 9], ['Teste B sintético', 11], ['Teste C sintético', 5]]));
    expect(await value(db, count('segmental_test_results', A_OPEN))).toBe(3);
    expect(await value(db, `select left_value from segmental_test_results where assessment_id='${A_OPEN}' and test_name='Teste A sintético'`)).toBe(9);
    await as(db, P1);
    expect(await errorOf(db, `INSERT INTO segmental_test_results(assessment_id,test_name,body_region) VALUES('${A_OPEN}','Teste A sintético','regiao')`)).toMatch(DUP);

    expect(await errorOf(db, upsertAnamnesis(A_DONE, 99))).toMatch(RLS);
    expect(await errorOf(db, upsertSegmental(A_DONE, [['Teste A sintético', 99]]))).toMatch(RLS);
    expect(await value(db, `select weight_kg from anamnesis_responses where assessment_id='${A_DONE}'`)).toBe(60);
    expect(await value(db, `select left_value from segmental_test_results where assessment_id='${A_DONE}'`)).toBe(1);
  });

  it('rollback tira as duas constraints, pode rodar de novo e não apaga dados', async () => {
    const { db } = await makeDb({ skip: ETAPA5A });
    await seed(db);
    await as(db, P1);
    await db.exec(upsertAnamnesis(A_OPEN, 70));
    await sys(db);
    await db.exec(ROLLBACK_SQL);
    await db.exec(ROLLBACK_SQL);
    expect(await value(db, `select count(*) from pg_constraint where conname in ${UNIQUES}`)).toBe(0);
    expect(await value(db, count('anamnesis_responses', A_OPEN))).toBe(1);
    // Sem as constraints o upsert do app volta a falhar: reverter o código antes do rollback
    await as(db, P1);
    expect(await errorOf(db, upsertAnamnesis(A_OPEN, 72))).toMatch(NO_KEY);
  });
});
