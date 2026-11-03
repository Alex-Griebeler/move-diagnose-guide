import fs from 'node:fs';
import type { PGlite } from '@electric-sql/pglite';
import { describe, expect, it } from 'vitest';
import { makeDb, as, asService, sys, snapshot, REPO, ETAPA5A } from './harness';

// Etapa 5a (C-01): uma red flag marcada na anamnese trava o protocolo até o profissional dono da avaliação liberar,
// com justificativa. No protocolo rápido, a triagem vem antes do lado, com a mesma liberação.
// Antes: o protocolo era gerado e salvo com red flag, o service_role gravava direto em protocols, e a sessão
// rápida era criada e concluída sem triagem nenhuma. Plano: outputs/plano-5a-red-flags.md (fora do repositório).
// Cada contorno tem de dar erro explícito, não "0 linhas". As corridas, que pedem duas conexões, estão em
// tests/integration/race/red_flags_race.sh (PostgreSQL real, manual).
const [M1, M2] = ETAPA5A;
const read = (path: string) => fs.readFileSync(`${REPO}/${path}`, 'utf8');
const M1_SQL = read(`supabase/migrations/${M1}`);
const M2_DOWN = read('supabase/rollbacks/20261105120000_etapa5a_triagem_rapida_down.sql');
const M1_DOWN = read('supabase/rollbacks/20261104120000_etapa5a_red_flags_down.sql');
const TYPES = read('src/integrations/supabase/types.ts');

const id = (n: string) => `${n.repeat(8)}-${n.repeat(4)}-4${n.repeat(3)}-8${n.repeat(3)}-${n.repeat(12)}`;
const P1 = id('1'), S1 = id('2'), P2 = id('3'), A = id('a'), A_OTHER = id('c'), A_DONE = id('d');
const J = 'Liberado pelo médico sintético em 10/11';
const R = 'Motivo sintético da revogação, com data';
const NOT_CLEARED = /red_flags_not_cleared/, DENIED = /permission denied/, ONLY_SAVE = /written only by save_assessment_protocol/;
const CLOSED = /anamnesis changes only while its assessment is open/;

type Flags = Record<string, unknown>;
const json = (v: unknown) => `'${JSON.stringify(v).replace(/'/g, "''")}'::jsonb`;
const anyTrue = (f: Flags) => Object.values(f).some(v => v === true);

// P1 e P2 profissionais, S1 aluno dos dois; A (de P1) e A_OTHER (de P2) abertas. A ganha a anamnese, se pedida.
async function seed(db: PGlite, flags: Flags | null = {}, has?: boolean) {
  await sys(db);
  await db.exec(`INSERT INTO auth.users(id,email) VALUES ('${P1}','p1@x.invalid'),('${S1}','s1@x.invalid'),('${P2}','p2@x.invalid');
UPDATE public.user_roles SET role='professional' WHERE user_id IN ('${P1}','${P2}');
INSERT INTO public.professional_students(professional_id,student_id) VALUES('${P1}','${S1}'),('${P2}','${S1}');
INSERT INTO public.assessments(id,professional_id,student_id,status) VALUES ('${A}','${P1}','${S1}','in_progress'),('${A_OTHER}','${P2}','${S1}','in_progress');`);
  if (flags) await db.exec(anamnesis(A, flags, has));
}
const anamnesis = (a: string, flags: Flags, has = anyTrue(flags)) =>
  `INSERT INTO public.anamnesis_responses(assessment_id,red_flags,has_red_flags) VALUES ('${a}',${json(flags)},${has})`;
// O que a tela manda ao marcar ou desmarcar (o upsert por assessment_id cai no UPDATE)
const setFlags = (a: string, flags: Flags, has = anyTrue(flags)) =>
  `UPDATE public.anamnesis_responses SET red_flags=${json(flags)}, has_red_flags=${has} WHERE assessment_id='${a}'`;

async function errorOf(db: PGlite, sql: string) {
  try { await db.query(sql); return ''; } catch (e) { return (e as Error).message; }
}
// Para um arquivo com vários comandos
async function execError(db: PGlite, sql: string) {
  try { await db.exec(sql); return ''; } catch (e) { return (e as Error).message; }
}
async function value(db: PGlite, sql: string) {
  await sys(db);
  return Object.values((await db.query<Record<string, unknown>>(sql)).rows[0])[0];
}
async function one<T = unknown>(db: PGlite, sql: string) {
  return Object.values((await db.query<Record<string, unknown>>(sql)).rows[0])[0] as T;
}
// Como P1, devolvendo a mensagem de erro ('' se passou)
async function asP1(db: PGlite, sql: string) { await as(db, P1); return errorOf(db, sql); }

const save = (a: string) => `select public.save_assessment_protocol('${a}',
  '{"name":"Protocolo sintético","priority_level":"high","frequency_per_week":3,"duration_weeks":4,"exercises":[]}'::jsonb, '[]'::jsonb)`;
const clear = (a: string, text = J) => `select public.clear_assessment_red_flags('${a}', ${text === null ? 'null' : `'${text}'`}) as id`;
const revoke = (c: string, text = R) => `select public.revoke_red_flag_clearance('${c}', '${text}')`;
const status = (a: string) => `select public.assessment_red_flag_status('${a}') as s`;
const state = (a: string) => `select json_build_object('status', (select status from assessments where id='${a}'),
  'protocols', (select count(*) from protocols where assessment_id='${a}'))`;
const directProtocol = (a: string) => `INSERT INTO protocols(assessment_id,name,priority_level,exercises) VALUES('${a}','direto','high','[]')`;
const version = (a: string) => `select red_flags_version from anamnesis_responses where assessment_id='${a}'`;
async function clearAs(db: PGlite, a: string) { await as(db, P1); return one<string>(db, clear(a)); }

describe('sem a 5a (o defeito)', () => {
  it('E2/E3: o protocolo é salvo com red flag marcada e nenhuma liberação', async () => {
    const { db } = await makeDb({ skip: ETAPA5A });
    await seed(db, { nightPain: true });
    expect(await asP1(db, save(A))).toBe('');
    expect(await value(db, state(A))).toStrictEqual({ status: 'completed', protocols: 1 });
  });

  it('E5: o service_role grava, muda e apaga protocolo direto', async () => {
    const { db } = await makeDb({ skip: ETAPA5A });
    await seed(db, { nightPain: true });
    for (const sql of [directProtocol(A), `UPDATE protocols SET name='x'`, `DELETE FROM protocols`]) {
      await asService(db);
      expect((await db.query(sql)).affectedRows).toBe(1);
    }
  });

  it('E6: a sessão rápida nasce sem triagem e é concluída com intervenção', async () => {
    const { db } = await makeDb({ skip: ETAPA5A });
    await seed(db);
    await as(db, P1);
    const q = await one<string>(db, `INSERT INTO quick_protocol_sessions(professional_id,student_id,status) VALUES('${P1}','${S1}','in_progress') RETURNING id`);
    await as(db, P1);
    expect((await db.query(`UPDATE quick_protocol_sessions SET status='completed', intervention_applied='{"x":1}' WHERE id='${q}'`)).affectedRows).toBe(1);
  });
});

describe('a porta, na gravação', () => {
  it('red flag sem liberação: erro, nada gravado, avaliação aberta', async () => {
    const { db } = await makeDb();
    await seed(db, { nightPain: true });
    expect(await asP1(db, save(A))).toMatch(NOT_CLEARED);
    expect(await value(db, state(A))).toStrictEqual({ status: 'in_progress', protocols: 0 });
  });

  it('com liberação válida, grava; sem red flag, grava sem liberação', async () => {
    const { db } = await makeDb();
    await seed(db, { nightPain: true, fever: false });
    await clearAs(db, A);
    expect(await asP1(db, save(A))).toBe('');
    expect(await value(db, state(A))).toStrictEqual({ status: 'completed', protocols: 1 });
    await sys(db);
    await db.exec(anamnesis(A_OTHER, { nightPain: false }));
    await as(db, P2);
    expect(await errorOf(db, save(A_OTHER))).toBe('');
  });

  it('liberação e depois uma red flag nova: erro', async () => {
    const { db } = await makeDb();
    await seed(db, { nightPain: true });
    await clearAs(db, A);
    expect(await asP1(db, setFlags(A, { nightPain: true, fever: true }))).toBe('');
    expect(await asP1(db, save(A))).toMatch(NOT_CLEARED);
  });

  it('true, liberação, false, true na mesma red flag: erro', async () => {
    const { db } = await makeDb();
    await seed(db, { nightPain: true });
    await clearAs(db, A);
    await asP1(db, setFlags(A, { nightPain: false }));
    await asP1(db, setFlags(A, { nightPain: true }));
    expect(await asP1(db, save(A))).toMatch(NOT_CLEARED);
  });

  it('liberação e depois uma red flag desmarcada: grava', async () => {
    const { db } = await makeDb();
    await seed(db, { nightPain: true, fever: true });
    await clearAs(db, A);
    expect(await asP1(db, setFlags(A, { nightPain: true, fever: false }))).toBe('');
    expect(await asP1(db, save(A))).toBe('');
  });

  it('duas liberações parciais em versões diferentes não se somam', async () => {
    const { db } = await makeDb();
    await seed(db, { nightPain: true });
    await clearAs(db, A);
    await asP1(db, setFlags(A, { nightPain: false, fever: true }));
    await clearAs(db, A);
    await asP1(db, setFlags(A, { nightPain: true, fever: true }));
    expect(await asP1(db, save(A))).toMatch(NOT_CLEARED);
  });

  it('apagar a anamnese e gravar de novo com a mesma red flag: versão nova, erro', async () => {
    const { db } = await makeDb();
    await seed(db, { nightPain: true });
    await clearAs(db, A);
    const before = Number(await value(db, version(A)));
    expect(await asP1(db, `DELETE FROM anamnesis_responses WHERE assessment_id='${A}'`)).toBe('');
    expect(await asP1(db, anamnesis(A, { nightPain: true }))).toBe('');
    expect(Number(await value(db, version(A)))).toBeGreaterThan(before);
    expect(await asP1(db, save(A))).toMatch(NOT_CLEARED);
  });

  it('liberação revogada: erro; revogada e liberada de novo: grava', async () => {
    const { db } = await makeDb();
    await seed(db, { nightPain: true });
    const c = await clearAs(db, A);
    expect(await asP1(db, revoke(c))).toBe('');
    expect(await asP1(db, save(A))).toMatch(NOT_CLEARED);
    await clearAs(db, A);
    expect(await asP1(db, save(A))).toBe('');
  });

  it('has_red_flags true com todas false: trava, e a liberação cobre "unspecified"', async () => {
    const { db } = await makeDb();
    await seed(db, { nightPain: false }, true);
    expect(await asP1(db, save(A))).toMatch(NOT_CLEARED);
    const c = await clearAs(db, A);
    expect(await value(db, `select cleared_flags from red_flag_clearances where id='${c}'`)).toStrictEqual(['unspecified']);
    expect(await asP1(db, save(A))).toBe('');
  });

  it('chave desconhecida true trava; valor que não é JSON true não conta', async () => {
    const { db } = await makeDb();
    await seed(db, { flagNova: true, nightPain: 'true', fever: 1 }, false);
    await as(db, P1);
    expect(await one(db, status(A))).toMatchObject({ blocked: 'red_flags_not_cleared', active_flags: ['flagNova'] });
    expect(await asP1(db, save(A))).toMatch(NOT_CLEARED);
  });

  it('sem anamnese: erro anamnesis_missing', async () => {
    const { db } = await makeDb();
    await seed(db, null);
    expect(await asP1(db, save(A))).toMatch(/anamnesis_missing/);
    expect(await value(db, state(A))).toStrictEqual({ status: 'in_progress', protocols: 0 });
  });

  it('repetir depois de concluída devolve o protocolo salvo, como na 3d', async () => {
    const { db } = await makeDb();
    await seed(db, { nightPain: true });
    await clearAs(db, A);
    await as(db, P1);
    const first = await one<string>(db, save(A));
    await as(db, P1);
    expect(await one<string>(db, save(A))).toBe(first);
  });
});

describe('escrita direta em protocols', () => {
  // A com protocolo salvo e red flag liberada; A_OTHER com protocolo salvo e sem red flag
  async function saved(db: PGlite) {
    await seed(db, { nightPain: true });
    await clearAs(db, A);
    await asP1(db, save(A));
    await sys(db);
    await db.exec(anamnesis(A_OTHER, {}));
    await as(db, P2);
    await db.query(save(A_OTHER));
  }
  const writes = (a: string) => [directProtocol(a), `UPDATE protocols SET name='x' WHERE assessment_id='${a}'`, `DELETE FROM protocols WHERE assessment_id='${a}'`];

  it('o profissional: o INSERT dá erro; UPDATE e DELETE não veem linha, como na 3d', async () => {
    const { db } = await makeDb();
    await saved(db);
    for (const [who, a] of [[P1, A], [P2, A_OTHER]]) {
      await as(db, who);
      expect(await errorOf(db, writes(a)[0])).toMatch(ONLY_SAVE);
      for (const sql of writes(a).slice(1)) {
        await as(db, who);
        expect((await db.query(sql)).affectedRows).toBe(0);
      }
    }
    expect(await value(db, `select count(*) from protocols`)).toBe(2);
  });

  it('o profissional, com uma policy permissiva recriada: erro nas três', async () => {
    const { db } = await makeDb();
    await saved(db);
    await sys(db);
    await db.exec(`CREATE POLICY "teste permissiva" ON public.protocols FOR ALL TO authenticated USING (true) WITH CHECK (true);
GRANT INSERT, UPDATE, DELETE ON public.protocols TO authenticated;`);
    for (const [who, a] of [[P1, A], [P2, A_OTHER]]) {
      for (const sql of writes(a)) {
        await as(db, who);
        expect(await errorOf(db, sql)).toMatch(ONLY_SAVE);
      }
    }
    expect(await value(db, `select count(*) from protocols`)).toBe(2);
  });

  it('o service_role: erro nas três, com e sem red flag', async () => {
    const { db } = await makeDb();
    await saved(db);
    for (const a of [A, A_OTHER]) {
      for (const sql of writes(a)) {
        await asService(db);
        expect(await errorOf(db, sql)).toMatch(ONLY_SAVE);
      }
    }
    expect(await value(db, `select count(*) from protocols`)).toBe(2);
  });

  it('o dono da tabela também passa pela porta ao gravar', async () => {
    const { db } = await makeDb();
    await seed(db, { nightPain: true });
    await sys(db);
    expect(await errorOf(db, directProtocol(A))).toMatch(NOT_CLEARED);
    expect(await errorOf(db, directProtocol(A_OTHER))).toMatch(/anamnesis_missing/);
  });

  it('o service_role apaga a avaliação concluída: o cascade passa e o protocolo sai junto, como hoje', async () => {
    const { db } = await makeDb();
    await saved(db);
    await asService(db);
    expect((await db.query(`DELETE FROM assessments WHERE id='${A}'`)).affectedRows).toBe(1);
    expect(await value(db, `select json_build_object('protocols', (select count(*) from protocols where assessment_id='${A}'),
      'anamnesis', (select count(*) from anamnesis_responses where assessment_id='${A}'),
      'clearances', (select count(*) from red_flag_clearances where assessment_id='${A}'))`)).toStrictEqual({ protocols: 0, anamnesis: 0, clearances: 0 });
  });

  it('TRUNCATE: sem permissão; com um GRANT de teste, o trigger de comando recusa', async () => {
    const { db } = await makeDb();
    await saved(db);
    // CASCADE porque progress_logs referencia protocols: sem ele, a chave estrangeira recusa antes do trigger
    const truncates = ['TRUNCATE protocols CASCADE', 'TRUNCATE assessments CASCADE'];
    for (const role of [() => as(db, P1), () => asService(db)]) {
      for (const sql of [...truncates, 'TRUNCATE red_flag_clearances', 'TRUNCATE red_flag_clearance_revocations CASCADE']) {
        await role();
        expect(await errorOf(db, sql)).toMatch(DENIED);
      }
    }
    await sys(db);
    await db.exec(`GRANT TRUNCATE ON ALL TABLES IN SCHEMA public TO authenticated, service_role`);
    for (const role of [() => as(db, P1), () => asService(db)]) {
      for (const sql of truncates) {
        await role();
        expect(await errorOf(db, sql)).toMatch(ONLY_SAVE);
      }
    }
    expect(await value(db, `select count(*) from protocols`)).toBe(2);
  });
});

describe('versão das red flags', () => {
  it('o cliente não escreve a versão, nem no INSERT nem no UPDATE; o service_role também não', async () => {
    const { db } = await makeDb();
    await seed(db, null);
    expect(await asP1(db, `INSERT INTO anamnesis_responses(assessment_id,red_flags,has_red_flags,red_flags_version) VALUES('${A}','{}',false,999)`)).toBe('');
    expect(await value(db, version(A))).toBe(0);
    expect(await asP1(db, `UPDATE anamnesis_responses SET red_flags_version=999 WHERE assessment_id='${A}'`)).toBe('');
    expect(await value(db, version(A))).toBe(0);
    await asService(db);
    await db.query(`UPDATE anamnesis_responses SET red_flags='{"fever":true}', red_flags_version=5 WHERE assessment_id='${A}'`);
    const v = Number(await value(db, version(A)));
    expect(v).toBeGreaterThan(0);
    await asService(db);
    await db.query(`UPDATE anamnesis_responses SET red_flags_version=v_old.v FROM (select 1 as v) v_old WHERE assessment_id='${A}'`);
    expect(Number(await value(db, version(A)))).toBe(v);
  });

  it('o upsert da tela: mesma marcação mantém a versão; marcar outra gera versão nova', async () => {
    const { db } = await makeDb();
    await seed(db, null);
    const upsert = (flags: Flags) => `INSERT INTO anamnesis_responses(assessment_id,red_flags,has_red_flags) VALUES('${A}',${json(flags)},${anyTrue(flags)})
      ON CONFLICT (assessment_id) DO UPDATE SET red_flags=EXCLUDED.red_flags, has_red_flags=EXCLUDED.has_red_flags`;
    await asP1(db, upsert({ nightPain: true }));
    const v1 = Number(await value(db, version(A)));
    await asP1(db, upsert({ nightPain: true }));
    expect(Number(await value(db, version(A)))).toBe(v1);
    await asP1(db, upsert({ nightPain: true, fever: true }));
    expect(Number(await value(db, version(A)))).toBeGreaterThan(v1);
  });

  it('a anamnese levada para outra avaliação ganha versão nova', async () => {
    const { db } = await makeDb();
    await seed(db, { nightPain: true });
    const v = Number(await value(db, version(A)));
    await sys(db);
    await db.exec(`INSERT INTO public.assessments(id,professional_id,student_id,status) VALUES ('${A_DONE}','${P1}','${S1}','in_progress')`);
    await asService(db);
    await db.query(`UPDATE anamnesis_responses SET assessment_id='${A_DONE}' WHERE assessment_id='${A}'`);
    expect(Number(await value(db, version(A_DONE)))).toBeGreaterThan(v);
  });

  it('o cliente não mexe na sequência', async () => {
    const { db } = await makeDb();
    for (const sql of [`select nextval('public.red_flags_version_seq')`, `select setval('public.red_flags_version_seq', 1)`]) {
      for (const role of [() => as(db, P1), () => asService(db), () => as(db)]) {
        await role();
        expect(await errorOf(db, sql)).toMatch(DENIED);
      }
    }
  });
});

describe('anamnese de avaliação fechada', () => {
  it('não muda mais, nem pelo service_role', async () => {
    const { db } = await makeDb();
    await seed(db, {});
    await asP1(db, save(A));
    await sys(db);
    await db.exec(`INSERT INTO public.assessments(id,professional_id,student_id,status) VALUES ('${A_DONE}','${P1}','${S1}','completed')`);
    for (const sql of [setFlags(A, { nightPain: true }), `DELETE FROM anamnesis_responses WHERE assessment_id='${A}'`, anamnesis(A_DONE, {})]) {
      await asService(db);
      expect(await errorOf(db, sql)).toMatch(CLOSED);
      await sys(db);
      expect(await errorOf(db, sql)).toMatch(CLOSED);
    }
  });

  it('apagar a avaliação aberta leva a anamnese e a liberação junto', async () => {
    const { db } = await makeDb();
    await seed(db, { nightPain: true });
    const c = await clearAs(db, A);
    await asP1(db, revoke(c));
    expect(await asP1(db, `DELETE FROM assessments WHERE id='${A}'`)).toBe('');
    expect(await value(db, `select (select count(*) from anamnesis_responses) + (select count(*) from red_flag_clearances)
      + (select count(*) from red_flag_clearance_revocations) as n`)).toBe(0);
  });
});

describe('liberação e revogação', () => {
  it('grava as red flags e a versão da linha, e quem liberou; o status mostra a liberação', async () => {
    const { db } = await makeDb();
    await seed(db, { nightPain: true, fever: true, recentTrauma: false });
    await as(db, P1);
    expect(await one(db, status(A))).toStrictEqual({ blocked: 'red_flags_not_cleared', active_flags: ['fever', 'nightPain'], clearance: null });
    await as(db, P1);
    const c = await one<string>(db, clear(A, `  ${J}  `));
    expect(await value(db, `select json_build_object('flags', cleared_flags, 'version', red_flags_version, 'by', professional_id, 'text', justification)
      from red_flag_clearances where id='${c}'`)).toStrictEqual({ flags: ['fever', 'nightPain'], version: Number(await value(db, version(A))), by: P1, text: J });
    await as(db, P1);
    expect(await one(db, status(A))).toMatchObject({ blocked: null, active_flags: ['fever', 'nightPain'], clearance: { id: c, justification: J } });
  });

  it.each([
    ['outro profissional', P2, /not found or not yours/],
    ['o aluno', S1, /not found or not yours/],
  ])('%s não libera, não revoga e não vê o status', async (_label, who, reason) => {
    const { db } = await makeDb();
    await seed(db, { nightPain: true });
    const c = await clearAs(db, A);
    for (const sql of [clear(A), revoke(c), status(A)]) {
      await as(db, who);
      expect(await errorOf(db, sql)).toMatch(reason);
    }
    await as(db);
    for (const sql of [clear(A), revoke(c), status(A)]) {
      await as(db);
      expect(await errorOf(db, sql)).toMatch(DENIED);
    }
  });

  it('sem anamnese, sem red flag ativa ou com a avaliação concluída: erro', async () => {
    const { db } = await makeDb();
    await seed(db, null);
    expect(await asP1(db, clear(A))).toMatch(/anamnesis_missing/);
    await sys(db);
    await db.exec(anamnesis(A, { nightPain: false }));
    expect(await asP1(db, clear(A))).toMatch(/no active red flag/);
    await asP1(db, setFlags(A, { nightPain: true }));
    const c = await clearAs(db, A);
    await asP1(db, save(A));
    expect(await asP1(db, clear(A))).toMatch(/not found or not yours/);
    expect(await asP1(db, revoke(c))).toMatch(/not found or not yours/);
  });

  it.each([
    ['vazia', ''],
    ['só espaços', '                         '],
    ['com 19 caracteres', 'x'.repeat(19)],
    ['com 19 caracteres e espaços nas pontas', `   ${'x'.repeat(19)}   `],
    ['com mais de 2000', 'x'.repeat(2001)],
  ])('justificativa ou motivo %s: erro', async (_label, text) => {
    const { db } = await makeDb();
    await seed(db, { nightPain: true });
    expect(await asP1(db, clear(A, text))).toMatch(/20 to 2000 characters/);
    const c = await clearAs(db, A);
    expect(await asP1(db, revoke(c, text))).toMatch(/20 to 2000 characters/);
  });

  it('justificativa nula: erro; com 20 caracteres: passa', async () => {
    const { db } = await makeDb();
    await seed(db, { nightPain: true });
    expect(await asP1(db, `select public.clear_assessment_red_flags('${A}', null)`)).toMatch(/20 to 2000 characters/);
    expect(await asP1(db, clear(A, 'x'.repeat(20)))).toBe('');
  });

  it('revogar duas vezes: erro', async () => {
    const { db } = await makeDb();
    await seed(db, { nightPain: true });
    const c = await clearAs(db, A);
    expect(await asP1(db, revoke(c))).toBe('');
    expect(await asP1(db, revoke(c))).toMatch(/already revoked/);
  });

  it('ninguém escreve direto nas tabelas de liberação; o profissional lê as suas', async () => {
    const { db } = await makeDb();
    await seed(db, { nightPain: true });
    const c = await clearAs(db, A);
    const sqls = [
      `INSERT INTO red_flag_clearances(assessment_id,professional_id,justification,cleared_flags,red_flags_version) VALUES('${A}','${P1}','${J}','{nightPain}',1)`,
      `UPDATE red_flag_clearances SET red_flags_version=1`,
      `DELETE FROM red_flag_clearances`,
      `INSERT INTO red_flag_clearance_revocations(clearance_id,professional_id,reason) VALUES('${c}','${P1}','${R}')`,
      `UPDATE red_flag_clearance_revocations SET reason='${R}'`,
      `DELETE FROM red_flag_clearance_revocations`,
    ];
    for (const role of [() => as(db, P1), () => asService(db)]) {
      for (const sql of sqls) {
        await role();
        expect(await errorOf(db, sql)).toMatch(DENIED);
      }
    }
    await as(db, P1);
    expect((await db.query(`select 1 from red_flag_clearances`)).rows).toHaveLength(1);
    await as(db, P2);
    expect((await db.query(`select 1 from red_flag_clearances`)).rows).toHaveLength(0);
  });
});

describe('protocolo rápido', () => {
  const insertSession = (flags: Flags | null, extra = '') => `INSERT INTO quick_protocol_sessions(professional_id,student_id,status,red_flags${extra ? ',' + extra.split('=')[0] : ''})
    VALUES('${P1}','${S1}','in_progress',${flags === null ? 'null' : json(flags)}${extra ? ',' + extra.split('=').slice(1).join('=') : ''}) RETURNING id`;
  const complete = (q: string) => `UPDATE quick_protocol_sessions SET status='completed', completed_at=now(), intervention_applied='{"exercicio":"sintético"}' WHERE id='${q}'`;
  const clearQ = (q: string) => `select public.clear_quick_session_red_flags('${q}', '${J}') as id`;
  async function session(db: PGlite, flags: Flags) { await as(db, P1); return one<string>(db, insertSession(flags)); }
  const qVersion = (q: string) => `select red_flags_version from quick_protocol_sessions where id='${q}'`;

  it('sem triagem a sessão não nasce, nem pelo service_role', async () => {
    const { db } = await makeDb();
    await seed(db);
    expect(await asP1(db, insertSession(null))).toMatch(/triage_missing/);
    expect(await asP1(db, insertSession(null).replace(',null)', `,'[]'::jsonb)`))).toMatch(/triage_missing/);
    await asService(db);
    expect(await errorOf(db, insertSession(null))).toMatch(/triage_missing/);
  });

  it.each([
    ['com intervenção, sem red flag', {}, `intervention_applied='{"x":1}'::jsonb`],
    ['com intervenção, com red flag', { fever: true }, `intervention_applied='{"x":1}'::jsonb`],
    ['com intervenção null do JSON', {}, `intervention_applied='null'::jsonb`],
  ])('a sessão não nasce %s', async (_label, flags, extra) => {
    const { db } = await makeDb();
    await seed(db);
    expect(await asP1(db, insertSession(flags, extra))).toMatch(/starts in progress and without an intervention/);
    await asService(db);
    expect(await errorOf(db, insertSession(flags, extra))).toMatch(/starts in progress and without an intervention/);
  });

  it('a sessão não nasce concluída, nem pelo service_role', async () => {
    const { db } = await makeDb();
    await seed(db);
    await asService(db);
    expect(await errorOf(db, insertSession({}).replace(`'in_progress'`, `'completed'`))).toMatch(/starts in progress/);
  });

  it('red flag sem liberação: não conclui nem grava intervenção', async () => {
    const { db } = await makeDb();
    await seed(db);
    const q = await session(db, { fever: true });
    expect(await asP1(db, complete(q))).toMatch(NOT_CLEARED);
    expect(await asP1(db, `UPDATE quick_protocol_sessions SET intervention_applied='{"x":1}' WHERE id='${q}'`)).toMatch(NOT_CLEARED);
    await asService(db);
    expect(await errorOf(db, complete(q))).toMatch(NOT_CLEARED);
  });

  it('com liberação conclui; sem red flag conclui sem liberação', async () => {
    const { db } = await makeDb();
    await seed(db);
    const q = await session(db, { fever: true });
    expect(await asP1(db, clearQ(q))).toBe('');
    expect(await asP1(db, complete(q))).toBe('');
    const q2 = await session(db, { fever: false });
    expect(await asP1(db, complete(q2))).toBe('');
  });

  it('red flag que acende depois da liberação: a conclusão dá erro', async () => {
    const { db } = await makeDb();
    await seed(db);
    const q = await session(db, { fever: true });
    await asP1(db, clearQ(q));
    expect(await asP1(db, `UPDATE quick_protocol_sessions SET red_flags='{"fever":true,"nightPain":true}' WHERE id='${q}'`)).toBe('');
    expect(await asP1(db, complete(q))).toMatch(NOT_CLEARED);
  });

  it.each([
    ['reacende a red flag liberada', { fever: true }],
    ['acende uma red flag nova', { fever: false, nightPain: true }],
  ])('um UPDATE só que %s e conclui: erro', async (_label, flags) => {
    const { db } = await makeDb();
    await seed(db);
    const q = await session(db, { fever: true });
    await asP1(db, clearQ(q));
    await asP1(db, `UPDATE quick_protocol_sessions SET red_flags='{"fever":false}' WHERE id='${q}'`);
    const relight = `red_flags=${json(flags)}`;
    expect(await asP1(db, `UPDATE quick_protocol_sessions SET ${relight}, status='completed' WHERE id='${q}'`)).toMatch(NOT_CLEARED);
    expect(await asP1(db, `UPDATE quick_protocol_sessions SET ${relight}, intervention_applied='{"x":1}' WHERE id='${q}'`)).toMatch(NOT_CLEARED);
    // Com triggers de teste antes e depois na ordem alfabética, o resultado é o mesmo
    await sys(db);
    await db.exec(`CREATE FUNCTION public.probe_passthrough() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN RETURN NEW; END $$;
CREATE TRIGGER a_probe BEFORE UPDATE ON public.quick_protocol_sessions FOR EACH ROW EXECUTE FUNCTION public.probe_passthrough();
CREATE TRIGGER z_probe BEFORE UPDATE ON public.quick_protocol_sessions FOR EACH ROW EXECUTE FUNCTION public.probe_passthrough();`);
    expect(await asP1(db, `UPDATE quick_protocol_sessions SET ${relight}, status='completed' WHERE id='${q}'`)).toMatch(NOT_CLEARED);
    // Desmarcada, a liberação antiga ainda vale
    expect(await asP1(db, `UPDATE quick_protocol_sessions SET red_flags='{"fever":false}', status='completed' WHERE id='${q}'`)).toBe('');
  });

  it('a versão é do servidor, e desmarcar não muda', async () => {
    const { db } = await makeDb();
    await seed(db);
    await as(db, P1);
    const q = await one<string>(db, insertSession({ fever: true }, 'red_flags_version=999'));
    const v = Number(await value(db, qVersion(q)));
    expect(v).toBeGreaterThan(0);
    expect(v).not.toBe(999);
    await asP1(db, `UPDATE quick_protocol_sessions SET red_flags='{"fever":false}', red_flags_version=1 WHERE id='${q}'`);
    expect(Number(await value(db, qVersion(q)))).toBe(v);
  });

  it('liberar e revogar: só o dono, com a sessão em andamento e com triagem', async () => {
    const { db } = await makeDb();
    await seed(db);
    const q = await session(db, { fever: true });
    await as(db, P2);
    expect(await errorOf(db, clearQ(q))).toMatch(/not found or not yours/);
    await as(db, P2);
    expect(await errorOf(db, `select public.quick_session_red_flag_status('${q}')`)).toMatch(/not found or not yours/);
    await as(db, P1);
    expect(await one(db, `select public.quick_session_red_flag_status('${q}')`)).toStrictEqual({ blocked: 'red_flags_not_cleared', active_flags: ['fever'], clearance: null });
    await asP1(db, `UPDATE quick_protocol_sessions SET red_flags=null WHERE id='${q}'`);
    expect(await asP1(db, clearQ(q))).toMatch(/triage_missing/);
    await as(db, P1);
    expect(await one(db, `select public.quick_session_red_flag_status('${q}')`)).toMatchObject({ blocked: 'triage_missing' });
    await asP1(db, `UPDATE quick_protocol_sessions SET red_flags='{"fever":true}' WHERE id='${q}'`);
    await as(db, P1);
    const c = await one<string>(db, clearQ(q));
    await as(db, P1);
    expect(await one(db, `select public.quick_session_red_flag_status('${q}')`)).toMatchObject({ blocked: null, clearance: { id: c } });
    expect(await asP1(db, revoke(c))).toBe('');
    expect(await asP1(db, complete(q))).toMatch(NOT_CLEARED);
    await as(db, P1);
    await one(db, clearQ(q));
    await asP1(db, complete(q));
    expect(await asP1(db, clearQ(q))).toMatch(/not found or not yours/);
  });

  it('só com a M1: a tela antiga cria e conclui sem triagem, e a versão já é calculada', async () => {
    const { db } = await makeDb({ skip: [M2] });
    await seed(db);
    await as(db, P1);
    const q = await one<string>(db, `INSERT INTO quick_protocol_sessions(professional_id,student_id,status) VALUES('${P1}','${S1}','in_progress') RETURNING id`);
    expect(await asP1(db, complete(q))).toBe('');
    const q2 = await session(db, { fever: true });
    expect(Number(await value(db, qVersion(q2)))).toBeGreaterThan(0);
  });
});

describe('permissões e dono', () => {
  const internal = [
    'active_red_flags(jsonb,boolean)', 'red_flags_next_version(text[],text[],bigint)', 'valid_red_flag_clearance(uuid,uuid,text[],bigint)',
    'red_flags_cleared(uuid,uuid,text[],bigint)', 'guard_protocol_write()', 'guard_anamnesis_red_flags()',
    'quick_session_red_flags_version()', 'guard_quick_session_red_flags()',
  ];
  const forClients = ['clear_assessment_red_flags(uuid,text)', 'clear_quick_session_red_flags(uuid,text)', 'revoke_red_flag_clearance(uuid,text)',
    'assessment_red_flag_status(uuid)', 'quick_session_red_flag_status(uuid)'];

  it('a porta e as funções internas não são executáveis por nenhum papel de cliente; as da tela, só por authenticated', async () => {
    const { db } = await makeDb();
    const grants = await value(db, `select json_object_agg(f || ' ' || r, has_function_privilege(r, 'public.' || f, 'EXECUTE'))
      from unnest(array[${[...internal, ...forClients].map(f => `'${f}'`).join(',')}]) f, unnest(array['anon','authenticated','service_role']) r`) as Record<string, boolean>;
    const expected = Object.fromEntries([...internal, ...forClients].flatMap(f => ['anon', 'authenticated', 'service_role']
      .map(r => [`${f} ${r}`, forClients.includes(f) && r === 'authenticated'])));
    expect(grants).toStrictEqual(expected);
    await as(db, P1);
    expect(await errorOf(db, `select public.red_flags_cleared(null, null, '{}', 0)`)).toMatch(DENIED);
  });

  it('as funções SECURITY DEFINER da 5a são do dono de protocols, que nenhum papel de cliente é nem assume', async () => {
    const { db } = await makeDb();
    const rows = (await db.query<{ f: string; owner: string; client: boolean }>(`select p.proname f, pg_get_userbyid(p.proowner) owner,
      (pg_get_userbyid(p.proowner) in ('anon','authenticated','service_role') or pg_has_role('anon', p.proowner, 'MEMBER')
        or pg_has_role('authenticated', p.proowner, 'MEMBER') or pg_has_role('service_role', p.proowner, 'MEMBER')) client
      from pg_proc p where p.pronamespace = 'public'::regnamespace and p.prosecdef
        and p.proname in (${[...internal, ...forClients, 'save_assessment_protocol()'].map(f => `'${f.split('(')[0]}'`).join(',')})
      order by 1`)).rows;
    expect(rows.map(r => r.f)).toStrictEqual([...internal, ...forClients, 'save_assessment_protocol()']
      .map(f => f.split('(')[0]).filter(f => !['active_red_flags', 'guard_protocol_write'].includes(f)).sort());
    const owner = await one<string>(db, `select pg_get_userbyid(relowner) from pg_class where oid = 'public.protocols'::regclass`);
    expect(rows.every(r => r.owner === owner && !r.client)).toBe(true);
  });

  it('a M1 para se rodar como papel de cliente, como papel que um cliente assume ou sem ser dona de protocols', async () => {
    for (const setup of [
      'SET ROLE service_role',
      'CREATE ROLE dono_suspeito; GRANT dono_suspeito TO authenticated; SET ROLE dono_suspeito',
      'CREATE ROLE outro_dono; ALTER TABLE public.protocols OWNER TO outro_dono',
    ]) {
      const { db } = await makeDb({ skip: ETAPA5A });
      await sys(db);
      await db.exec(setup);
      let error = '';
      try { await db.exec(`BEGIN;\n${M1_SQL}\nCOMMIT;`); } catch (e) { error = (e as Error).message; await db.exec('ROLLBACK'); }
      expect(error).toMatch(/etapa 5a: /);
      await sys(db);
      expect(await value(db, `select count(*) from pg_proc where proname = 'red_flags_cleared'`)).toBe(0);
    }
  });

  it('os argumentos das funções novas em types.ts são os do banco', async () => {
    const { db } = await makeDb();
    for (const f of forClients.map(s => s.split('(')[0])) {
      const names = await value(db, `select to_json(proargnames) from pg_proc where proname='${f}'`) as string[];
      const block = TYPES.match(new RegExp(`${f}: \\{\\s*Args: \\{([^}]*)\\}\\s*Returns: (\\w+)`));
      expect(block, f).not.toBeNull();
      expect(block![1].split(';').map(s => s.split(':')[0].trim()).filter(Boolean).sort(), f).toStrictEqual([...names].sort());
    }
  });
});

describe('reversão', () => {
  it('M2 e depois M1: save volta ao texto da 3d, os triggers e as funções saem, os registros ficam', async () => {
    const base = await makeDb({ skip: ETAPA5A });
    const before = await snapshot(base.db);
    const saveBefore = await value(base.db, `select pg_get_functiondef('public.save_assessment_protocol(uuid,jsonb,jsonb)'::regprocedure)`);
    const { db } = await makeDb();
    await seed(db, { nightPain: true });
    const c = await clearAs(db, A);
    await asP1(db, revoke(c));
    await as(db, P1);
    const q = await one<string>(db, `INSERT INTO quick_protocol_sessions(professional_id,student_id,status,red_flags) VALUES('${P1}','${S1}','in_progress','{"fever":true}') RETURNING id`);
    await sys(db);
    expect(await execError(db, M1_DOWN)).toMatch(/reverter 20261105120000/);
    await db.exec(M2_DOWN);
    await db.exec(M1_DOWN);
    const after = await snapshot(db);
    expect(before.filter(x => !after.includes(x))).toStrictEqual([]);
    // Ficam as tabelas de liberação, com a policy de leitura
    expect(after.filter(x => !before.includes(x))).toStrictEqual([
      'POLICY [public.red_flag_clearance_revocations] "Professionals can view their red flag revocations" SELECT {authenticated} PERMISSIVE USING (professional_id = auth.uid()) CHECK ',
      'POLICY [public.red_flag_clearances] "Professionals can view their red flag clearances" SELECT {authenticated} PERMISSIVE USING (professional_id = auth.uid()) CHECK ',
    ]);
    expect(await value(db, `select pg_get_functiondef('public.save_assessment_protocol(uuid,jsonb,jsonb)'::regprocedure)`)).toBe(saveBefore);
    expect(await value(db, `select json_build_object('c', (select count(*) from red_flag_clearances), 'r', (select count(*) from red_flag_clearance_revocations),
      'q', (select red_flags from quick_protocol_sessions where id='${q}'), 'v', (select red_flags_version > 0 from anamnesis_responses))`))
      .toStrictEqual({ c: 1, r: 1, q: { fever: true }, v: true });
    // De volta à 3d: grava com red flag, e a tela antiga insere anamnese sem mandar a versão
    expect(await asP1(db, save(A))).toBe('');
    await sys(db);
    await db.exec(`INSERT INTO public.assessments(id,professional_id,student_id,status) VALUES ('${A_DONE}','${P1}','${S1}','in_progress')`);
    expect(await asP1(db, anamnesis(A_DONE, {}))).toBe('');
  });

  it('só a M2: a tela antiga volta a criar sessão sem triagem; a nova continua funcionando', async () => {
    const { db } = await makeDb();
    await seed(db);
    await sys(db);
    await db.exec(M2_DOWN);
    await as(db, P1);
    const old = await one<string>(db, `INSERT INTO quick_protocol_sessions(professional_id,student_id,status) VALUES('${P1}','${S1}','in_progress') RETURNING id`);
    expect(await asP1(db, `UPDATE quick_protocol_sessions SET status='completed', intervention_applied='{"x":1}' WHERE id='${old}'`)).toBe('');
    await as(db, P1);
    const q = await one<string>(db, `INSERT INTO quick_protocol_sessions(professional_id,student_id,status,red_flags) VALUES('${P1}','${S1}','in_progress','{"fever":true}') RETURNING id`);
    expect(Number(await value(db, `select red_flags_version from quick_protocol_sessions where id='${q}'`))).toBeGreaterThan(0);
    expect(await asP1(db, `select public.clear_quick_session_red_flags('${q}', '${J}')`)).toBe('');
  });

  it('reaplicar a M1 depois da reversão não repete versão', async () => {
    const { db } = await makeDb();
    await seed(db, { nightPain: true });
    await sys(db);
    await db.exec(M2_DOWN);
    await db.exec(M1_DOWN);
    // Sem trigger, a versão gravada fica; a sequência recomeça se alguém a apagar
    await db.exec(`UPDATE anamnesis_responses SET red_flags_version = 500; DROP SEQUENCE public.red_flags_version_seq`);
    await db.exec(M1_SQL);
    await asP1(db, setFlags(A, { nightPain: true, fever: true }));
    expect(Number(await value(db, version(A)))).toBeGreaterThan(500);
  });
});
