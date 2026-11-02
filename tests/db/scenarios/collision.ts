// Ids repetidos entre avaliação e sessão rápida (a pasta da mídia tem o nome do id):
// a migration recusa uma base que já tenha repetição, e nem o service_role cria uma nova.
// Portado de codex-review/bloco1-banco-acesso/replay/collision.mjs (ver tests/README.md).
// O corpo não foi reindentado, para ficar idêntico ao original; só o makeDb deixa de fora
// as migrations que mudam regras do bloco 1 (CHANGES_BLOCO1_RULES, ver harness.ts).
import fs from 'node:fs';
import { makeDb, CHANGES_BLOCO1_RULES, asService, sys, allow, denyErr, summary, REPO, NEW_MIG, note, manualFail } from '../harness';

export async function runCollision(): Promise<void> {
const P = '11111111-1111-4111-8111-111111111111', S = '22222222-2222-4222-8222-222222222222';
const A = 'e0000000-0000-4000-8000-0000000000c1', Q = 'f0000000-0000-4000-8000-0000000000c2';
const seed = `INSERT INTO auth.users(id,email) VALUES ('${P}','p@x.invalid'),('${S}','s@x.invalid');
UPDATE public.user_roles SET role='professional' WHERE user_id='${P}';
INSERT INTO public.professional_students(professional_id,student_id) VALUES('${P}','${S}');
INSERT INTO public.assessments(id,professional_id,student_id,status) VALUES('${A}','${P}','${S}','completed');`;
const sql = fs.readFileSync(REPO + '/supabase/migrations/' + NEW_MIG, 'utf8');

note('## Base antiga com id repetido: a migration tem de parar');
{
  const { db } = await makeDb({ withNew: false, skip: CHANGES_BLOCO1_RULES });
  await sys(db);
  await db.exec(seed + `INSERT INTO public.quick_protocol_sessions(id,professional_id,student_id,status) VALUES('${A}','${P}','${S}','in_progress');`);
  let err = null;
  try { await db.exec(sql); } catch (e) { err = e.message.split('\n')[0]; }
  const ok = !!err && /id compartilhado|shared id|resolve/i.test(err);
  note(`${ok ? 'PASS' : 'FAIL'} [error] migration recusa base com id repetido -> ${err ? 'ERROR ' + err : 'aplicou sem erro'}`);
  const left = await db.query(`select count(*)::int n from pg_proc where proname in ('can_author_assessment','assign_server_row_id')`);
  note(`${left.rows[0].n === 0 ? 'PASS' : 'FAIL'} [deny ] nada da migration ficou aplicado -> funções novas=${left.rows[0].n}`);
  if (!ok || left.rows[0].n !== 0) manualFail();
}

note('## Base sem repetição: aplica, e o service_role não cria repetição');
{
  const { db } = await makeDb({ withNew: false, skip: CHANGES_BLOCO1_RULES });
  await sys(db);
  await db.exec(seed + `INSERT INTO public.quick_protocol_sessions(id,professional_id,student_id,status) VALUES('${Q}','${P}','${S}','in_progress');`);
  let err = null;
  try { await db.exec(sql); } catch (e) { err = e.message.split('\n')[0]; }
  note(`${err ? 'FAIL' : 'PASS'} [allow] migration aplica em base sem repetição -> ${err ? 'ERROR ' + err : 'ok'}`);
  if (err) manualFail();
  await asService(db);
  await denyErr(db, 'service_role cria sessão com o id de uma avaliação', `INSERT INTO quick_protocol_sessions(id,professional_id,student_id,status) VALUES('${A}','${P}','${S}','in_progress') RETURNING id`, /already used/i);
  await denyErr(db, 'service_role cria avaliação com o id de uma sessão', `INSERT INTO assessments(id,professional_id,student_id,status) VALUES('${Q}','${P}','${S}','draft') RETURNING id`, /already used/i);
  await allow(db, 'service_role abre sessão para tentar trocar o id', `INSERT INTO quick_protocol_sessions(id,professional_id,student_id,status) VALUES('f0000000-0000-4000-8000-0000000000c4','${P}','${S}','in_progress') RETURNING id`);
  await denyErr(db, 'service_role troca o id da sessão pelo de uma avaliação', `UPDATE quick_protocol_sessions SET id='${A}' WHERE id='f0000000-0000-4000-8000-0000000000c4' RETURNING id`, /already used/i);
  await allow(db, 'service_role abre avaliação para tentar trocar o id', `INSERT INTO assessments(id,professional_id,student_id,status) VALUES('e0000000-0000-4000-8000-0000000000c5','${P}','${S}','draft') RETURNING id`);
  await denyErr(db, 'service_role troca o id da avaliação pelo de uma sessão', `UPDATE assessments SET id='${Q}' WHERE id='e0000000-0000-4000-8000-0000000000c5' RETURNING id`, /already used/i);
  await allow(db, 'service_role ainda edita a sessão sem mexer no id', `UPDATE quick_protocol_sessions SET status='completed' WHERE id='f0000000-0000-4000-8000-0000000000c4' RETURNING id`);
  await allow(db, 'service_role ainda cria avaliação com id próprio novo', `INSERT INTO assessments(id,professional_id,student_id,status) VALUES('e0000000-0000-4000-8000-0000000000c3','${P}','${S}','draft') RETURNING id`);
  summary();
}
}
