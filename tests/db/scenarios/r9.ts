// Codex r9: transição de avaliação aberta, datas pelo servidor e pré-condição de vínculo aberto.
// Portado de codex-review/bloco1-banco-acesso/replay/r9.mjs (ver tests/README.md).
// O corpo não foi reindentado, para ficar idêntico ao original; só o makeDb deixa de fora
// as migrations que mudam regras do bloco 1 (CHANGES_BLOCO1_RULES, ver harness.ts).
import fs from 'node:fs';
import { makeDb, CHANGES_BLOCO1_RULES, as, sys, allow, denyErr, summary, REPO, NEW_MIG, note, manualFail } from '../harness';

export async function runR9(): Promise<void> {
const id = n => `${n}${n}${n}${n}${n}${n}${n}${n}-${n}${n}${n}${n}-4${n}${n}${n}-8${n}${n}${n}-${n.repeat(12)}`;
const P1 = id('1'), S1 = id('2');
const ERR = /row-level security|violates|only be completed|protocol is saved|creation date|immutable/i;
const seed = `INSERT INTO auth.users(id,email) VALUES ('${P1}','p1@x.invalid'),('${S1}','s1@x.invalid');
UPDATE public.user_roles SET role='professional' WHERE user_id='${P1}';
INSERT INTO public.professional_students(professional_id,student_id) VALUES('${P1}','${S1}');`;

note('## Transições da avaliação aberta');
{
  const { db } = await makeDb({ skip: CHANGES_BLOCO1_RULES });
  await sys(db); await db.exec(seed);
  await as(db, P1);
  const ins = await allow(db, 'P1 cria rascunho com datas retroativas',
    `INSERT INTO assessments(professional_id,student_id,status,created_at,completed_at) VALUES('${P1}','${S1}','draft','2000-01-01','2000-01-02') RETURNING id, created_at, completed_at`);
  const A = ins.rows[0].id;
  note('   created_at', ins.rows[0].created_at, 'completed_at', ins.rows[0].completed_at);
  await sys(db);
  const d = (await db.query(`SELECT created_at > now() - interval '1 hour' AS fresh, completed_at IS NULL AS nul FROM assessments WHERE id='${A}'`)).rows[0];
  note(d.fresh && d.nul ? '  PASS' : '  FAIL', ' datas do INSERT definidas pelo servidor');
  await as(db, P1);
  await denyErr(db, 'rascunho -> completed sem protocolo', `UPDATE assessments SET status='completed', completed_at='2000-01-02' WHERE id='${A}' RETURNING id`, ERR);
  await denyErr(db, 'rascunho -> archived', `UPDATE assessments SET status='archived' WHERE id='${A}' RETURNING id`, ERR);
  await denyErr(db, 'muda created_at da aberta', `UPDATE assessments SET created_at='2000-01-01' WHERE id='${A}' RETURNING id`, ERR);
  await allow(db, 'rascunho -> in_progress (anamnese)', `UPDATE assessments SET status='in_progress', started_at=now() WHERE id='${A}' RETURNING id`);
  await denyErr(db, 'in_progress -> archived', `UPDATE assessments SET status='archived' WHERE id='${A}' RETURNING id`, ERR);
  await denyErr(db, 'in_progress -> completed sem protocolo', `UPDATE assessments SET status='completed' WHERE id='${A}' RETURNING id`, ERR);
  await allow(db, 'fluxo: salva protocolo', `INSERT INTO protocols(assessment_id,name) VALUES('${A}','Protocolo') RETURNING id`);
  await allow(db, 'fluxo: conclui com completed_at do cliente', `UPDATE assessments SET status='completed', completed_at='2000-01-02' WHERE id='${A}' RETURNING id`);
  await sys(db);
  const c = (await db.query(`SELECT status, completed_at > now() - interval '1 hour' AS fresh FROM assessments WHERE id='${A}'`)).rows[0];
  note(c.status === 'completed' && c.fresh ? '  PASS' : '  FAIL', ' completed_at definido pelo servidor', c.status);
  await as(db, P1);
  await allow(db, 'concluída -> archived continua permitido', `UPDATE assessments SET status='archived' WHERE id='${A}' RETURNING id`);
  await sys(db);
  await allow(db, 'migração/superusuário segue livre', `UPDATE assessments SET created_at='2001-01-01' WHERE id='${A}' RETURNING id`);
}

note('## Pré-condição: sessão ligada a avaliação aberta');
for (const [status, expectFail] of [['draft', true], ['in_progress', true], ['completed', false], ['archived', false]]) {
  const { db } = await makeDb({ withNew: false, skip: CHANGES_BLOCO1_RULES });
  await sys(db); await db.exec(seed);
  const A = (await db.query(`INSERT INTO assessments(professional_id,student_id,status) VALUES('${P1}','${S1}','${status}') RETURNING id`)).rows[0].id;
  await db.exec(`INSERT INTO quick_protocol_sessions(professional_id,student_id,assessment_id,status) VALUES('${P1}','${S1}','${A}','completed')`);
  let err = null;
  try { await db.exec(fs.readFileSync(REPO + '/supabase/migrations/' + NEW_MIG, 'utf8')); } catch (e) { err = e.message; }
  const ok = expectFail ? /ligada a avaliação aberta/.test(err || '') : !err;
  note(ok ? '  PASS' : '  FAIL', ` migration com sessão ligada a ${status}: ${err ? 'erro: ' + err : 'aplicou'}`);
  if (!ok) manualFail();
}
summary();
}
