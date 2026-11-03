import fs from 'node:fs';
import type { PGlite } from '@electric-sql/pglite';
import { describe, expect, it } from 'vitest';
import { makeDb, as, asService, sys, snapshot, REPO, ETAPA5A } from './harness';
import { calcularPrioridades } from '@/lib/priorityEngine';
import { buildProtocolSave } from '@/lib/protocolSave';
import type { GeneratedProtocol } from '@/lib/protocolResponse';

// Etapa 3d (B-13, F-15): achados com os pesos do motor; protocolo, achados e conclusão numa transação,
// e só pela função save_assessment_protocol. Antes, um achado de peso 4 derrubava o lote, o erro era
// ignorado e a avaliação era concluída sem achados; e uma falha no meio deixava protocolo gravado,
// que o reenvio duplicava.
// Os testes que escrevem direto em protocols (o service_role, que a 3d ainda deixava) e os da reversão da 3d rodam no
// banco como a 3d o deixou, sem a 5a; a 5a fecha mais (etapa5a.test.ts). Os da gravação rodam com tudo, e a avaliação
// tem uma anamnese sem red flag, que a 5a exige.
const MIGRATION = '20261103120000_etapa3d_gravacao_protocolo.sql';
const MIGRATION_SQL = fs.readFileSync(`${REPO}/supabase/migrations/${MIGRATION}`, 'utf8');
const ROLLBACK_SQL = fs.readFileSync(`${REPO}/supabase/rollbacks/20261103120000_etapa3d_gravacao_protocolo_down.sql`, 'utf8');
const TYPES = fs.readFileSync(`${REPO}/src/integrations/supabase/types.ts`, 'utf8');

const id = (n: string) => `${n.repeat(8)}-${n.repeat(4)}-4${n.repeat(3)}-8${n.repeat(3)}-${n.repeat(12)}`;
const P1 = id('1'), S1 = id('2'), P2 = id('3'), A = id('a'), A_ARCH = id('b'), A_OTHER = id('c'), A_DONE = id('d');
const RLS = /row-level security/, DENIED = /permission denied/, NOT_YOURS = /not found or not yours/;

async function seed(db: PGlite) {
  await sys(db);
  await db.exec(`INSERT INTO auth.users(id,email) VALUES ('${P1}','p1@x.invalid'),('${S1}','s1@x.invalid'),('${P2}','p2@x.invalid');
UPDATE public.user_roles SET role='professional' WHERE user_id IN ('${P1}','${P2}');
INSERT INTO public.professional_students(professional_id,student_id) VALUES('${P1}','${S1}'),('${P2}','${S1}');
INSERT INTO public.assessments(id,professional_id,student_id,status) VALUES
  ('${A}','${P1}','${S1}','in_progress'),('${A_ARCH}','${P1}','${S1}','archived'),('${A_OTHER}','${P2}','${S1}','in_progress');
INSERT INTO public.assessment_drafts(assessment_id,step_type,draft_data) VALUES
  ('${A}','protocol','{"inputKey":"k"}'),('${A}','segmental_tests','{}');
INSERT INTO public.anamnesis_responses(assessment_id,red_flags,has_red_flags) VALUES ('${A}','{"nightPain":false}',false);`);
}
async function value(db: PGlite, sql: string) {
  await sys(db);
  return Object.values((await db.query<Record<string, unknown>>(sql)).rows[0])[0];
}
async function errorOf(db: PGlite, sql: string) {
  try { await db.query(sql); return ''; } catch (e) { return (e as Error).message; }
}
const lit = (v: unknown) => `'${JSON.stringify(v).replace(/'/g, "''")}'::jsonb`;

// O pedido do cliente, montado pelo mesmo código da tela, com o motor real:
// OHS com calcanhares subindo traz Limitação de Dorsiflexão e Restrição TC, peso 4
const generated: GeneratedProtocol = {
  protocolName: 'Protocolo sintético', priorityLevel: 'high', frequencyPerWeek: 3, durationWeeks: 4, summary: '',
  exercises: [{ name: 'Mobilidade sintética', phase: 'mobility', bodyRegion: 'Tornozelo', targetMuscles: [], sets: 2, reps: '10', instructions: '', rationale: '', priority: 1 }],
};
const engine = calcularPrioridades([{ id: 'heels_rise', testName: 'OHS', view: 'Vista Lateral' }], {});
const request = (a: string, findings?: unknown) => {
  const r = buildProtocolSave(a, generated, engine);
  return `select public.save_assessment_protocol('${a}', ${lit(r._protocol)}, ${findings === undefined ? lit(r._findings) : findings}) as id`;
};
const finding = (bio: number, ctx: number, severity = 'moderate') => ({
  classification_tag: 't', body_region: 'Tornozelo/Pé', severity, hyperactive_muscles: [], hypoactive_muscles: [],
  priority_score: 4.2, context_weight: ctx, biomechanical_importance: bio,
});
const state = (a: string) => `select json_build_object(
  'status', (select status from assessments where id='${a}'),
  'completed_at', (select completed_at is not null from assessments where id='${a}'),
  'protocols', (select count(*) from protocols where assessment_id='${a}'),
  'findings', (select count(*) from functional_findings where assessment_id='${a}'),
  'drafts', (select coalesce(json_agg(step_type order by step_type), '[]') from assessment_drafts where assessment_id='${a}'))`;
const directProtocol = (a: string) => `INSERT INTO protocols(assessment_id,name,priority_level,exercises) VALUES('${a}','direto','high','[]')`;
const directFinding = (a: string, bio = 3, ctx = 0) => `INSERT INTO functional_findings(assessment_id,classification_tag,body_region,biomechanical_importance,context_weight)
  VALUES('${a}','t','r',${bio},${ctx})`;

describe('sem a migration (o defeito)', () => {
  it('peso 4 derruba o lote, contexto 6 é recusado, e a avaliação conclui sem achados', async () => {
    const { db } = await makeDb({ skip: [MIGRATION, ...ETAPA5A] });
    await seed(db);
    await as(db, P1);
    expect(await errorOf(db, `${directFinding(A, 4)}, ('${A}','u','r',3,0)`)).toMatch(/biomechanical_importance_check/);
    await as(db, P1);
    expect(await errorOf(db, directFinding(A, 3, 6))).toMatch(/context_weight_check/);
    await as(db, P1);
    await db.query(directProtocol(A));
    await as(db, P1);
    await db.query(`UPDATE assessments SET status='completed' WHERE id='${A}'`);
    expect(await value(db, state(A))).toMatchObject({ status: 'completed', protocols: 1, findings: 0 });
  });

  it('com a avaliação aberta, reenviar grava um segundo protocolo', async () => {
    const { db } = await makeDb({ skip: [MIGRATION, ...ETAPA5A] });
    await seed(db);
    for (let i = 0; i < 2; i++) { await as(db, P1); await db.query(directProtocol(A)); }
    expect(await value(db, `select count(*) from protocols where assessment_id='${A}'`)).toBe(2);
  });
});

describe('a migration', () => {
  it('com protocolo duplicado, aborta sem mudar nada e sem apagar nenhuma linha', async () => {
    const { db } = await makeDb({ skip: [MIGRATION, ...ETAPA5A] });
    await seed(db);
    await db.exec(`${directProtocol(A)}; ${directProtocol(A)};`);
    let error = '';
    try { await db.exec(`BEGIN;\n${MIGRATION_SQL}\nCOMMIT;`); } catch (e) { error = (e as Error).message; await db.exec('ROLLBACK'); }
    expect(error).toMatch(/mais de um protocolo/);
    expect(await value(db, `select count(*) from protocols`)).toBe(2);
    expect(await value(db, `select count(*) from pg_proc where proname='save_assessment_protocol'`)).toBe(0);
    expect(await value(db, `select count(*) from pg_policies where tablename in ('protocols','functional_findings') and cmd <> 'SELECT'`)).toBe(6);
  });

  // A tela antiga gravava o protocolo antes de concluir: uma falha entre os dois deixava a avaliação aberta com
  // protocolo, e a função bateria na unicidade a cada tentativa. A concluída com protocolo é o caso normal.
  it('com avaliação aberta que já tem protocolo, aborta sem mudar nada; a concluída com protocolo não impede', async () => {
    const { db } = await makeDb({ skip: [MIGRATION, ...ETAPA5A] });
    await seed(db);
    await as(db, P1);
    await db.query(directProtocol(A));
    await sys(db);
    await db.exec(`INSERT INTO assessments(id,professional_id,student_id,status) VALUES ('${A_DONE}','${P1}','${S1}','in_progress');
${directProtocol(A_DONE)}; UPDATE assessments SET status='completed' WHERE id='${A_DONE}';`);
    let error = '';
    try { await db.exec(`BEGIN;\n${MIGRATION_SQL}\nCOMMIT;`); } catch (e) { error = (e as Error).message; await db.exec('ROLLBACK'); }
    expect(error).toMatch(/aberta que já tem protocolo/);
    expect(await value(db, `select count(*) from protocols`)).toBe(2);
    expect(await value(db, `select count(*) from pg_proc where proname='save_assessment_protocol'`)).toBe(0);
    expect(await value(db, `select count(*) from pg_policies where tablename in ('protocols','functional_findings') and cmd <> 'SELECT'`)).toBe(6);
    // Resolvida a aberta (aqui, sem o protocolo), a migration aplica com a concluída no lugar
    await sys(db);
    await db.exec(`DELETE FROM protocols WHERE assessment_id='${A}'`);
    await db.exec(`BEGIN;\n${MIGRATION_SQL}\nCOMMIT;`);
    expect(await value(db, `select count(*) from pg_proc where proname='save_assessment_protocol'`)).toBe(1);
    expect(await value(db, `select count(*) from protocols where assessment_id='${A_DONE}'`)).toBe(1);
  });

  // Achados gravados direto numa avaliação aberta, que as policies do bloco 1 deixavam, ficariam junto dos que a
  // função grava ao concluir
  it('com avaliação aberta que só tem achados, aborta sem mudar nada', async () => {
    const { db } = await makeDb({ skip: [MIGRATION, ...ETAPA5A] });
    await seed(db);
    await as(db, P1);
    await db.query(directFinding(A));
    await sys(db);
    let error = '';
    try { await db.exec(`BEGIN;\n${MIGRATION_SQL}\nCOMMIT;`); } catch (e) { error = (e as Error).message; await db.exec('ROLLBACK'); }
    expect(error).toMatch(/aberta que já tem protocolo ou achados/);
    expect(await value(db, `select count(*) from functional_findings`)).toBe(1);
    expect(await value(db, `select count(*) from pg_proc where proname='save_assessment_protocol'`)).toBe(0);
    expect(await value(db, `select count(*) from pg_policies where tablename in ('protocols','functional_findings') and cmd <> 'SELECT'`)).toBe(6);
  });

  // Um nome diferente em produção, ou uma policy de escrita fora das 6, deixaria a escrita direta aberta
  it('com outra policy de escrita nas filhas, aborta sem mudar nada', async () => {
    const { db } = await makeDb({ skip: [MIGRATION, ...ETAPA5A] });
    await sys(db);
    await db.exec(`CREATE POLICY "outra" ON public.functional_findings FOR ALL TO authenticated USING (true) WITH CHECK (true)`);
    let error = '';
    try { await db.exec(`BEGIN;\n${MIGRATION_SQL}\nCOMMIT;`); } catch (e) { error = (e as Error).message; await db.exec('ROLLBACK'); }
    expect(error).toMatch(/ainda há policy de escrita/);
    expect(await value(db, `select count(*) from pg_proc where proname='save_assessment_protocol'`)).toBe(0);
    expect(await value(db, `select count(*) from pg_policies where tablename in ('protocols','functional_findings') and cmd <> 'SELECT'`)).toBe(7);
  });

  it('a faixa aceita peso 4 e contexto 6, e recusa 5 e 7', async () => {
    const { db } = await makeDb();
    await seed(db);
    await asService(db);
    expect(await errorOf(db, directFinding(A, 4, 6))).toBe('');
    await asService(db);
    expect(await errorOf(db, directFinding(A, 5, 0))).toMatch(/biomechanical_importance_check/);
    await asService(db);
    expect(await errorOf(db, directFinding(A, 0, 7))).toMatch(/context_weight_check/);
  });

  // Com a avaliação aberta, que é quando as policies do bloco 1 deixavam escrever. As linhas
  // de alterar e apagar vêm do service_role (como as de antes da 3d).
  it('o profissional não escreve mais protocolo nem achado direto; a leitura continua', async () => {
    const { db } = await makeDb({ skip: ETAPA5A });
    await seed(db);
    await as(db, P1);
    expect(await errorOf(db, directProtocol(A))).toMatch(RLS);
    await as(db, P1);
    expect(await errorOf(db, directFinding(A))).toMatch(RLS);
    await asService(db);
    await db.query(directProtocol(A));
    await asService(db);
    await db.query(directFinding(A));
    for (const sql of [
      `UPDATE protocols SET name='x' WHERE assessment_id='${A}'`, `DELETE FROM protocols WHERE assessment_id='${A}'`,
      `UPDATE functional_findings SET body_region='x' WHERE assessment_id='${A}'`, `DELETE FROM functional_findings WHERE assessment_id='${A}'`,
    ]) {
      await as(db, P1);
      expect((await db.query(sql)).affectedRows).toBe(0);
    }
    await as(db, S1);
    expect((await db.query(`select 1 from protocols where assessment_id='${A}'`)).rows).toHaveLength(1);
    await as(db, P1);
    expect((await db.query(`select 1 from functional_findings where assessment_id='${A}'`)).rows.length).toBeGreaterThan(0);
  });

  // Sem policy de DELETE nas filhas: a cascata da chave estrangeira não passa pela RLS.
  // Uma avaliação aberta com protocolo (depois da 3d, só quem ignora a RLS a cria) ainda pode ser apagada pelo autor.
  it('o autor ainda apaga a avaliação aberta, e o protocolo e os achados vão junto', async () => {
    const { db } = await makeDb({ skip: ETAPA5A });
    await seed(db);
    await asService(db);
    await db.query(directProtocol(A));
    await asService(db);
    await db.query(directFinding(A));
    await as(db, P1);
    expect((await db.query(`DELETE FROM assessments WHERE id='${A}'`)).affectedRows).toBe(1);
    expect(await value(db, `select (select count(*) from protocols where assessment_id='${A}')
      + (select count(*) from functional_findings where assessment_id='${A}') as n`)).toBe(0);
  });

  // A avaliação aberta com protocolo aqui vem do service_role: a pré-condição impede que ela exista antes da 3d
  it('um protocolo por avaliação, também para quem ignora a RLS', async () => {
    const { db } = await makeDb({ skip: ETAPA5A });
    await seed(db);
    await asService(db);
    await db.query(directProtocol(A));
    await asService(db);
    expect(await errorOf(db, directProtocol(A))).toMatch(/duplicate key.*uq_protocols_assessment/);
    await as(db, P1);
    expect(await errorOf(db, request(A))).toMatch(/uq_protocols_assessment/);
    expect(await value(db, state(A))).toMatchObject({ status: 'in_progress', protocols: 1, findings: 0 });
  });
});

// O cache da geração (ProtocolGenerator) é o upsert de supabase-js em assessment_drafts, com a RLS do bloco 1
describe('cache da geração', () => {
  const upsertDraft = (a: string, key: string) => `INSERT INTO assessment_drafts(assessment_id,step_type,draft_data)
    VALUES('${a}','protocol','{"inputKey":"${key}"}') ON CONFLICT (assessment_id,step_type) DO UPDATE SET draft_data = excluded.draft_data`;

  it('o autor guarda e substitui a geração enquanto a avaliação está aberta; depois de concluída, não', async () => {
    const { db } = await makeDb();
    await seed(db);
    await as(db, P1);
    await db.query(upsertDraft(A, 'k2'));
    await as(db, P1);
    expect((await db.query<{ k: string }>(`select draft_data->>'inputKey' k from assessment_drafts where assessment_id='${A}' and step_type='protocol'`)).rows)
      .toStrictEqual([{ k: 'k2' }]);
    await as(db, P1);
    await db.query(request(A));
    await as(db, P1);
    expect(await errorOf(db, upsertDraft(A, 'k3'))).toMatch(RLS);
  });
});

describe('save_assessment_protocol', () => {
  it('grava o pedido do cliente: protocolo, achados com os pesos do motor e conclusão, e apaga só o rascunho do protocolo', async () => {
    const { db } = await makeDb();
    await seed(db);
    const sent = buildProtocolSave(A, generated, engine)._findings as Array<{ biomechanical_importance: number }>;
    expect(sent.some(f => f.biomechanical_importance === 4)).toBe(true);
    await as(db, P1);
    const r = await db.query<{ id: string }>(request(A));
    expect(r.rows[0].id).toMatch(/^[0-9a-f-]{36}$/);
    expect(await value(db, state(A))).toStrictEqual({ status: 'completed', completed_at: true, protocols: 1, findings: sent.length, drafts: ['segmental_tests'] });
    expect(await value(db, `select json_agg(biomechanical_importance order by biomechanical_importance) from functional_findings where assessment_id='${A}'`))
      .toStrictEqual(sent.map(f => f.biomechanical_importance).sort());
    expect(await value(db, `select json_build_object('name',name,'priority_level',priority_level,'frequency_per_week',frequency_per_week,
      'duration_weeks',duration_weeks,'phase',phase,'n',jsonb_array_length(exercises)) from protocols where assessment_id='${A}'`))
      .toStrictEqual({ name: 'Protocolo sintético', priority_level: 'high', frequency_per_week: 3, duration_weeks: 4, phase: 1, n: 1 });
  });

  it.each([
    ['severidade fora do enum', finding(3, 0, 'grave')],
    ['peso fora da faixa', finding(5, 0)],
    ['contexto fora da faixa', finding(3, 7)],
  ])('com %s, não grava nada e a avaliação continua aberta', async (_label, bad) => {
    const { db } = await makeDb();
    await seed(db);
    await as(db, P1);
    expect(await errorOf(db, request(A, lit([finding(2, 0), bad])))).not.toBe('');
    expect(await value(db, state(A))).toStrictEqual({ status: 'in_progress', completed_at: false, protocols: 0, findings: 0, drafts: ['protocol', 'segmental_tests'] });
  });

  it('a segunda chamada devolve o mesmo protocolo e não duplica', async () => {
    const { db } = await makeDb();
    await seed(db);
    await as(db, P1);
    const first = (await db.query<{ id: string }>(request(A))).rows[0].id;
    await as(db, P1);
    const second = (await db.query<{ id: string }>(request(A, lit([finding(2, 0)])))).rows[0].id;
    expect(second).toBe(first);
    expect(await value(db, state(A))).toMatchObject({ protocols: 1, findings: (engine.primaryIssues.length) });
  });

  it.each([
    ['avaliação arquivada', P1, A_ARCH, /only an open assessment/],
    ['avaliação de outro profissional', P1, A_OTHER, NOT_YOURS],
    ['aluno', S1, A, /only a professional/],
  ])('recusa %s', async (_label, who, a, reason) => {
    const { db } = await makeDb();
    await seed(db);
    await as(db, who);
    expect(await errorOf(db, request(a))).toMatch(reason);
    expect(await value(db, `select count(*) from protocols`)).toBe(0);
  });

  it('profissional sem o papel não salva nem a própria avaliação', async () => {
    const { db } = await makeDb();
    await seed(db);
    await db.exec(`UPDATE public.user_roles SET role='student' WHERE user_id='${P1}'`);
    await as(db, P1);
    expect(await errorOf(db, request(A))).toMatch(/only a professional/);
  });

  it('anon não executa a função', async () => {
    const { db } = await makeDb();
    await seed(db);
    await as(db);
    expect(await errorOf(db, request(A))).toMatch(DENIED);
  });

  it.each([
    ['nulos', 'null'],
    ['que não são lista', `'{}'::jsonb`],
  ])('recusa achados %s, para que um argumento esquecido não vire "sem achados"', async (_label, findings) => {
    const { db } = await makeDb();
    await seed(db);
    await as(db, P1);
    expect(await errorOf(db, request(A, findings))).toMatch(/findings a list/);
    expect(await value(db, state(A))).toMatchObject({ status: 'in_progress', protocols: 0 });
  });

  it.each([
    ['nulo', 'null'],
    ['que não é objeto', `'[]'::jsonb`],
  ])('recusa protocolo %s, antes de gravar', async (_label, protocol) => {
    const { db } = await makeDb();
    await seed(db);
    await as(db, P1);
    const findings = lit(buildProtocolSave(A, generated, engine)._findings);
    expect(await errorOf(db, `select public.save_assessment_protocol('${A}', ${protocol}, ${findings})`)).toMatch(/protocol must be an object/);
    expect(await value(db, state(A))).toMatchObject({ status: 'in_progress', protocols: 0, findings: 0 });
  });

  // Não acontece pelo app (a guarda exige o protocolo), mas um id vazio faria a tela dar o salvar por feito
  it('avaliação concluída sem protocolo é recusada, em vez de devolver id vazio', async () => {
    const { db } = await makeDb();
    await seed(db);
    await db.exec(`INSERT INTO public.assessments(id,professional_id,student_id,status) VALUES('${A_DONE}','${P1}','${S1}','completed')`);
    await as(db, P1);
    expect(await errorOf(db, request(A_DONE))).toMatch(/completed assessment without a protocol/);
  });

  it('sem anamnese, não grava nada e a avaliação continua aberta (5a)', async () => {
    const { db } = await makeDb();
    await seed(db);
    await sys(db);
    await db.exec(`DELETE FROM anamnesis_responses WHERE assessment_id='${A}'`);
    await as(db, P1);
    expect(await errorOf(db, request(A))).toMatch(/anamnesis_missing/);
    expect(await value(db, state(A))).toMatchObject({ status: 'in_progress', protocols: 0, findings: 0 });
  });

  it('lista vazia conclui com 0 achados (aluno sem compensações)', async () => {
    const { db } = await makeDb();
    await seed(db);
    await as(db, P1);
    await db.query(request(A, lit([])));
    expect(await value(db, state(A))).toMatchObject({ status: 'completed', protocols: 1, findings: 0 });
  });

  it('sem protocolo, o cliente continua sem conseguir concluir direto', async () => {
    const { db } = await makeDb();
    await seed(db);
    await as(db, P1);
    expect(await errorOf(db, `UPDATE assessments SET status='completed' WHERE id='${A}'`)).toMatch(/only after its protocol is saved/);
  });

  it('a definição trava a avaliação, roda como dona com search_path vazio (checagem estática: não há duas sessões no PGlite)', async () => {
    const { db } = await makeDb();
    const def = String(await value(db, `select pg_get_functiondef('public.save_assessment_protocol(uuid,jsonb,jsonb)'::regprocedure)`));
    expect(def).toMatch(/FROM public\.assessments a\s+WHERE a\.id = _assessment_id\s+FOR UPDATE/);
    expect(def).toMatch(/SECURITY DEFINER/);
    expect(def).toMatch(/SET search_path TO ''/);
  });

  it('os argumentos em types.ts são os da função no banco', async () => {
    const { db } = await makeDb();
    const names = await value(db, `select to_json(proargnames) from pg_proc where proname='save_assessment_protocol'`) as string[];
    const block = TYPES.match(/save_assessment_protocol: \{\s*Args: \{([^}]*)\}\s*Returns: (\w+)/);
    expect(block).not.toBeNull();
    const typed = block![1].split(';').map(s => s.split(':')[0].trim()).filter(Boolean);
    expect([...typed].sort()).toStrictEqual([...names].sort());
    expect(block![2]).toBe('string');
  });
});

describe('rollback', () => {
  it('volta as faixas, as policies de escrita e tira a unicidade e a função', async () => {
    const base = await makeDb({ skip: [MIGRATION, ...ETAPA5A] });
    const before = await snapshot(base.db);
    const { db } = await makeDb({ skip: ETAPA5A });
    await sys(db);
    await db.exec(ROLLBACK_SQL);
    // Policies, funções e triggers idênticos ao banco sem a 3d
    expect(await snapshot(db)).toStrictEqual(before);
    expect(await value(db, `select count(*) from pg_constraint where conname='uq_protocols_assessment'`)).toBe(0);
    expect(await value(db, `select pg_get_constraintdef(oid) from pg_constraint where conname='functional_findings_biomechanical_importance_check'`)).toMatch(/<= 3/);
    expect(await value(db, `select pg_get_constraintdef(oid) from pg_constraint where conname='functional_findings_context_weight_check'`)).toMatch(/<= 4/);
    // De volta ao bloco 1: o autor escreve direto enquanto a avaliação está aberta
    await db.exec(`INSERT INTO auth.users(id,email) VALUES ('${P1}','p1@x.invalid'),('${S1}','s1@x.invalid');
UPDATE public.user_roles SET role='professional' WHERE user_id='${P1}';
INSERT INTO public.professional_students(professional_id,student_id) VALUES('${P1}','${S1}');
INSERT INTO public.assessments(id,professional_id,student_id,status) VALUES('${A}','${P1}','${S1}','in_progress');`);
    await as(db, P1);
    expect(await errorOf(db, directProtocol(A))).toBe('');
  });

  it('com achado fora da faixa antiga, para sem apagar nada', async () => {
    const { db } = await makeDb({ skip: ETAPA5A });
    await seed(db);
    await as(db, P1);
    await db.query(request(A));
    await sys(db);
    let error = '';
    try { await db.exec(`BEGIN;\n${ROLLBACK_SQL}\nCOMMIT;`); } catch (e) { error = (e as Error).message; await db.exec('ROLLBACK'); }
    expect(error).toMatch(/fora da faixa antiga/);
    expect(Number(await value(db, `select count(*) from functional_findings`))).toBeGreaterThan(0);
    expect(await value(db, `select count(*) from pg_proc where proname='save_assessment_protocol'`)).toBe(1);
  });
});
