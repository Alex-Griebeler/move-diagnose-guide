// Testes do bloco 1 no replay: negativos, positivos (ordem real da tela), matriz dos triggers.
// Portado de codex-review/bloco1-banco-acesso/replay/bloco1.mjs (ver tests/README.md).
// O corpo não foi reindentado, para ficar idêntico ao original.
import { makeDb, as, asService, sys, allow, deny, denyErr, quiet, summary, note } from '../harness';

export async function runBloco1(): Promise<void> {
const { db } = await makeDb();
const id = n => `${n}${n}${n}${n}${n}${n}${n}${n}-${n}${n}${n}${n}-4${n}${n}${n}-8${n}${n}${n}-${n.repeat(12)}`;
const P1 = id('1'), S1 = id('2'), X = id('3'), P2 = id('7'), S2 = id('6'), R = id('5'); // R: profissional que perde o papel
const A_DONE = id('a'), PR_DONE = id('b'), A_P2 = id('c'), PR_P2 = id('d');
let A_OPEN = 'e0000000-0000-4000-8000-000000000001', A_CASC = 'e0000000-0000-4000-8000-000000000002';
const A_P1S2 = 'e0000000-0000-4000-8000-000000000004', A_P2B = 'e0000000-0000-4000-8000-000000000005', Q_P2B = 'f0000000-0000-4000-8000-000000000005';
let Q1 = 'f0000000-0000-4000-8000-000000000001';
const Q_P2 = 'f0000000-0000-4000-8000-000000000002', EX_R = 'f0000000-0000-4000-8000-000000000009', A_R = 'e0000000-0000-4000-8000-000000000003', Q_R = 'f0000000-0000-4000-8000-000000000003';
const RLS = /row-level security|violates/i, IMM = /immutable/i, IDS = /cannot be changed/i;

await sys(db);
await db.exec(`INSERT INTO auth.users(id,email) VALUES ('${P1}','p1@x.invalid'),('${S1}','s1@x.invalid'),('${X}','x@x.invalid'),('${P2}','p2@x.invalid'),('${S2}','s2@x.invalid'),('${R}','r@x.invalid');
UPDATE public.user_roles SET role='professional' WHERE user_id IN ('${P1}','${P2}','${R}');
INSERT INTO public.professional_students(professional_id,student_id) VALUES('${P1}','${S1}'),('${P2}','${S2}'),('${P1}','${S2}'),('${R}','${S1}');
INSERT INTO public.assessments(id,professional_id,student_id,status) VALUES('${A_R}','${R}','${S1}','in_progress');
INSERT INTO public.quick_protocol_sessions(id,professional_id,student_id,status) VALUES('${Q_R}','${R}','${S1}','completed'),('${Q_P2}','${P2}','${S2}','in_progress'),('${Q_P2B}','${P2}','${S2}','completed');
INSERT INTO public.assessments(id,professional_id,student_id,status) VALUES('${A_P1S2}','${P1}','${S2}','draft'),('${A_P2B}','${P2}','${S2}','completed');
INSERT INTO public.assessments(id,professional_id,student_id,status) VALUES('${A_DONE}','${P1}','${S1}','completed'),('${A_P2}','${P2}','${S2}','completed');
INSERT INTO public.anamnesis_responses(assessment_id) VALUES('${A_DONE}');
INSERT INTO public.global_test_results(assessment_id,test_name) VALUES('${A_DONE}','overhead_squat');
INSERT INTO public.segmental_test_results(assessment_id,test_name,body_region) VALUES('${A_DONE}','thomas','hip');
INSERT INTO public.functional_findings(assessment_id,classification_tag,body_region,severity) VALUES('${A_DONE}','synthetic','knee','moderate');
INSERT INTO public.protocols(id,assessment_id,name) VALUES('${PR_DONE}','${A_DONE}','Protocolo P1'),('${PR_P2}','${A_P2}','Protocolo P2');
INSERT INTO public.assessment_drafts(assessment_id,step_type,draft_data) VALUES('${A_DONE}','anamnesis','{}');
INSERT INTO storage.objects(bucket_id,name,owner) VALUES('assessment-media','${A_DONE}/ohs_anterior_photo_1.jpg','${P1}'),('assessment-media','${A_P2}/ohs_anterior_photo_p2.jpg','${P2}'),('assessment-media','${Q_P2}/quick_photo_p2.jpg','${P2}');
INSERT INTO public.exercises(id,name,body_region,fabrik_phase,created_by) SELECT '${EX_R}','Exercicio de R',body_region,fabrik_phase,'${R}' FROM public.exercises WHERE created_by IS NULL LIMIT 1;`)
  .catch(e => { throw new Error('SEED_ERR ' + e.message); });

const childTables = [
  ['anamnesis_responses', `(assessment_id) VALUES('${A_DONE}')`, `sleep_quality=5`],
  ['global_test_results', `(assessment_id,test_name) VALUES('${A_DONE}','single_leg_squat')`, `test_name=test_name`],
  ['segmental_test_results', `(assessment_id,test_name,body_region) VALUES('${A_DONE}','x','hip')`, `test_name='alterado'`],
  ['functional_findings', `(assessment_id,classification_tag,body_region,severity) VALUES('${A_DONE}','t','knee','mild')`, `severity='none'`],
  ['protocols', `(assessment_id,name) VALUES('${A_DONE}','novo')`, `name='alterado'`],
  ['assessment_drafts', `(assessment_id,step_type,draft_data) VALUES('${A_DONE}','segmental','{}')`, `draft_data='{"x":1}'`],
];

note('## Negativos: aluno na própria avaliação (6 tabelas + Storage)');
await as(db, S1);
for (const [t, ins, set] of childTables) {
  await denyErr(db, `S1 INSERT ${t}`, `INSERT INTO ${t}${ins} RETURNING assessment_id`, RLS);
  await deny(db, `S1 UPDATE ${t}`, `UPDATE ${t} SET ${set} WHERE assessment_id='${A_DONE}' RETURNING assessment_id`);
  await deny(db, `S1 DELETE ${t}`, `DELETE FROM ${t} WHERE assessment_id='${A_DONE}' RETURNING assessment_id`);
}
await denyErr(db, 'S1 upload Storage', `INSERT INTO storage.objects(bucket_id,name,owner) VALUES('assessment-media','${A_DONE}/fake.jpg','${S1}') RETURNING name`, RLS);
await deny(db, 'S1 UPDATE Storage', `UPDATE storage.objects SET metadata='{}' WHERE name='${A_DONE}/ohs_anterior_photo_1.jpg' RETURNING name`);
await deny(db, 'S1 DELETE Storage', `DELETE FROM storage.objects WHERE name='${A_DONE}/ohs_anterior_photo_1.jpg' RETURNING name`);
await deny(db, 'S1 lê rascunhos', `SELECT 1 FROM assessment_drafts WHERE assessment_id='${A_DONE}'`);

note('## Negativos: terceiro (X) e outro profissional (P2)');
await as(db, X);
for (const [t] of childTables) await deny(db, `X SELECT ${t}`, `SELECT 1 FROM ${t} WHERE assessment_id='${A_DONE}'`);
await denyErr(db, 'X INSERT protocols', `INSERT INTO protocols(assessment_id,name) VALUES('${A_DONE}','x') RETURNING id`, RLS);
await deny(db, 'X lê mídia', `SELECT 1 FROM storage.objects WHERE name LIKE '${A_DONE}/%'`);
await as(db, P2);
await denyErr(db, 'P2 INSERT finding em avaliação de P1', `INSERT INTO functional_findings(assessment_id,classification_tag,body_region,severity) VALUES('${A_DONE}','t','knee','mild') RETURNING id`, RLS);
await deny(db, 'P2 lê protocolo de P1', `SELECT 1 FROM protocols WHERE id='${PR_DONE}'`);

note('## Negativos: vínculo pela API e troca de titular');
await denyErr(db, 'P2 se vincula a X', `INSERT INTO professional_students(professional_id,student_id) VALUES('${P2}','${X}') RETURNING id`, RLS);
await denyErr(db, 'P2 se vincula a S1', `INSERT INTO professional_students(professional_id,student_id) VALUES('${P2}','${S1}') RETURNING id`, RLS);
await as(db, P1);
await denyErr(db, 'P1 troca student_id de A_DONE', `UPDATE assessments SET student_id='${X}' WHERE id='${A_DONE}' RETURNING id`, IDS);
await denyErr(db, 'P1 troca professional_id de A_DONE', `UPDATE assessments SET professional_id='${P2}' WHERE id='${A_DONE}' RETURNING id`, /cannot be changed|row-level/i);

note('## Negativos: avaliação concluída imutável');
await denyErr(db, 'P1 reabre A_DONE (completed→in_progress)', `UPDATE assessments SET status='in_progress' WHERE id='${A_DONE}' RETURNING id`, IMM);
await denyErr(db, 'P1 reabre A_DONE (completed→draft)', `UPDATE assessments SET status='draft' WHERE id='${A_DONE}' RETURNING id`, IMM);
await denyErr(db, 'P1 edita notes de A_DONE', `UPDATE assessments SET notes='alterado' WHERE id='${A_DONE}' RETURNING id`, IMM);
await denyErr(db, 'P1 edita completed_at de A_DONE', `UPDATE assessments SET completed_at=now() WHERE id='${A_DONE}' RETURNING id`, IMM);
for (const [t, ins, set] of childTables) {
  await denyErr(db, `P1 INSERT ${t} em concluída`, `INSERT INTO ${t}${ins} RETURNING assessment_id`, RLS);
  await deny(db, `P1 UPDATE ${t} em concluída`, `UPDATE ${t} SET ${set} WHERE assessment_id='${A_DONE}' RETURNING assessment_id`);
  await deny(db, `P1 DELETE ${t} em concluída`, `DELETE FROM ${t} WHERE assessment_id='${A_DONE}' RETURNING assessment_id`);
}
await denyErr(db, 'P1 upload em concluída', `INSERT INTO storage.objects(bucket_id,name,owner) VALUES('assessment-media','${A_DONE}/novo.jpg','${P1}') RETURNING name`, RLS);
await deny(db, 'P1 DELETE mídia de concluída', `DELETE FROM storage.objects WHERE name='${A_DONE}/ohs_anterior_photo_1.jpg' RETURNING name`);

note('## Negativos: exercícios');
await as(db, P2);
await deny(db, 'P2 UPDATE curado', `UPDATE exercises SET name='ALTERADO' WHERE created_by IS NULL RETURNING id`);
await deny(db, 'P2 DELETE curado', `DELETE FROM exercises WHERE created_by IS NULL RETURNING id`);
await deny(db, 'P2 toma posse de curado', `UPDATE exercises SET created_by='${P2}' WHERE created_by IS NULL RETURNING id`);
await denyErr(db, 'P2 cria exercício com created_by nulo', `INSERT INTO exercises(name,body_region,fabrik_phase) SELECT 'n',body_region,fabrik_phase FROM exercises LIMIT 1 RETURNING id`, RLS);
await denyErr(db, 'P2 cria exercício em nome de P1', `INSERT INTO exercises(name,body_region,fabrik_phase,created_by) SELECT 'n',body_region,fabrik_phase,'${P1}' FROM exercises LIMIT 1 RETURNING id`, RLS);
await allow(db, 'P2 cria exercício próprio', `INSERT INTO exercises(name,body_region,fabrik_phase,created_by) SELECT 'meu',body_region,fabrik_phase,'${P2}' FROM exercises WHERE created_by IS NULL LIMIT 1 RETURNING id`);
await allow(db, 'P2 edita exercício próprio', `UPDATE exercises SET name='meu2' WHERE created_by='${P2}' RETURNING id`);
await denyErr(db, 'P2 transforma exercício próprio em curado', `UPDATE exercises SET created_by=NULL WHERE created_by='${P2}' RETURNING id`, RLS);
await as(db, S1);
await deny(db, 'S1 UPDATE exercício', `UPDATE exercises SET name='aluno' RETURNING id`);
await sys(db); await db.exec(`UPDATE public.user_roles SET role='student' WHERE user_id='${R}'`);
await as(db, R);
await deny(db, 'R (papel revogado) edita exercício próprio', `UPDATE exercises SET name='r2' WHERE id='${EX_R}' RETURNING id`);
await deny(db, 'R (papel revogado) apaga exercício próprio', `DELETE FROM exercises WHERE id='${EX_R}' RETURNING id`);
await deny(db, 'R (papel revogado) edita notes da própria avaliação aberta', `UPDATE assessments SET notes='x' WHERE id='${A_R}' RETURNING id`);
await deny(db, 'R (papel revogado) muda status da própria avaliação aberta', `UPDATE assessments SET status='completed' WHERE id='${A_R}' RETURNING id`);
await deny(db, 'R (papel revogado) apaga a própria avaliação aberta', `DELETE FROM assessments WHERE id='${A_R}' RETURNING id`);
await denyErr(db, 'R (papel revogado) grava protocolo na própria avaliação aberta', `INSERT INTO protocols(assessment_id,name) VALUES('${A_R}','r') RETURNING id`, RLS);
await deny(db, 'R (papel revogado) edita a própria sessão rápida', `UPDATE quick_protocol_sessions SET retest_feedback='x' WHERE id='${Q_R}' RETURNING id`);
await deny(db, 'R (papel revogado) apaga a própria sessão rápida', `DELETE FROM quick_protocol_sessions WHERE id='${Q_R}' RETURNING id`);
await denyErr(db, 'R (papel revogado) faz upload na própria avaliação aberta', `INSERT INTO storage.objects(bucket_id,name,owner) VALUES('assessment-media','${A_R}/r.jpg','${R}') RETURNING name`, RLS);

note('## Negativos e positivos: progress_logs');
await as(db, X);
await denyErr(db, 'X registra progresso no protocolo de S1', `INSERT INTO progress_logs(protocol_id,student_id,exercise_id) VALUES('${PR_DONE}','${X}',(SELECT id FROM exercises WHERE is_active LIMIT 1)) RETURNING id`, RLS);
await as(db, S1);
await allow(db, 'S1 registra progresso no próprio protocolo', `INSERT INTO progress_logs(protocol_id,student_id,exercise_id,notes) VALUES('${PR_DONE}','${S1}',(SELECT id FROM exercises WHERE is_active LIMIT 1),'ok') RETURNING id`);
await denyErr(db, 'S1 troca protocol_id para protocolo alheio', `UPDATE progress_logs SET protocol_id='${PR_P2}' WHERE student_id='${S1}' RETURNING id`, RLS);
await denyErr(db, 'S1 registra em nome de X', `INSERT INTO progress_logs(protocol_id,student_id,exercise_id) VALUES('${PR_DONE}','${X}',(SELECT id FROM exercises WHERE is_active LIMIT 1)) RETURNING id`, RLS);
await as(db, P1);
await allow(db, 'P1 lê progresso de S1', `SELECT 1 FROM progress_logs WHERE protocol_id='${PR_DONE}'`);

note('## Negativos: sessão rápida');
await as(db, S1);
await denyErr(db, 'S1 (aluno) cria sessão rápida', `INSERT INTO quick_protocol_sessions(professional_id,student_id) VALUES('${S1}','${X}') RETURNING id`, RLS);
await as(db, P1);
await denyErr(db, 'P1 cria sessão com aluno não vinculado', `INSERT INTO quick_protocol_sessions(professional_id,student_id) VALUES('${P1}','${X}') RETURNING id`, RLS);
await denyErr(db, 'P1 cria sessão com avaliação de P2', `INSERT INTO quick_protocol_sessions(professional_id,student_id,assessment_id) VALUES('${P1}','${S2}','${A_P2}') RETURNING id`, RLS);
await denyErr(db, 'P1 cria sessão em nome de P2', `INSERT INTO quick_protocol_sessions(professional_id,student_id) VALUES('${P2}','${S2}') RETURNING id`, RLS);

note('## anon');
await as(db, null);
await denyErr(db, 'anon executa can_author_assessment', `SELECT public.can_author_assessment('${A_DONE}') r`, /permission denied/i);

note('## Positivos: sequência real da tela (avaliação nova)');
await as(db, P1);
A_OPEN = (await allow(db, '1. cria avaliação draft', `INSERT INTO assessments(professional_id,student_id,status) VALUES('${P1}','${S1}','draft') RETURNING id`)).rows?.[0]?.id ?? A_OPEN;
await allow(db, '1. rascunho da anamnese (insert)', `INSERT INTO assessment_drafts(assessment_id,step_type,draft_data) VALUES('${A_OPEN}','anamnesis','{"a":1}') RETURNING id`);
await allow(db, '2. rascunho (update)', `UPDATE assessment_drafts SET draft_data='{"a":2}' WHERE assessment_id='${A_OPEN}' RETURNING id`);
await allow(db, '1. anamnese grava em draft', `INSERT INTO anamnesis_responses(assessment_id,sleep_quality) VALUES('${A_OPEN}',7) RETURNING id`);
await allow(db, '1. status → in_progress', `UPDATE assessments SET status='in_progress', started_at=now() WHERE id='${A_OPEN}' RETURNING id`);
await allow(db, '2. rascunho (delete)', `DELETE FROM assessment_drafts WHERE assessment_id='${A_OPEN}' RETURNING id`);
await allow(db, '3. upsert globais (1ª vez)', `INSERT INTO global_test_results(assessment_id,test_name) VALUES('${A_OPEN}','overhead_squat') ON CONFLICT (assessment_id,test_name) DO UPDATE SET test_name=EXCLUDED.test_name RETURNING id`);
await allow(db, '3. upsert globais (2ª vez, conflito)', `INSERT INTO global_test_results(assessment_id,test_name) VALUES('${A_OPEN}','overhead_squat') ON CONFLICT (assessment_id,test_name) DO UPDATE SET test_name=EXCLUDED.test_name RETURNING id`);
await allow(db, '3. fallback delete', `DELETE FROM global_test_results WHERE assessment_id='${A_OPEN}' AND test_name='overhead_squat' RETURNING id`);
await allow(db, '3. fallback insert', `INSERT INTO global_test_results(assessment_id,test_name) VALUES('${A_OPEN}','overhead_squat') RETURNING id`);
await allow(db, '3. GlobalTestsWizard repete status in_progress', `UPDATE assessments SET status='in_progress' WHERE id='${A_OPEN}' RETURNING id`);
await allow(db, '5. mídia: upload', `INSERT INTO storage.objects(bucket_id,name,owner) VALUES('assessment-media','${A_OPEN}/ohs_anterior_photo_1.jpg','${P1}') RETURNING name`);
await allow(db, '5. mídia: upsert (troca)', `INSERT INTO storage.objects(bucket_id,name,owner) VALUES('assessment-media','${A_OPEN}/ohs_anterior_photo_1.jpg','${P1}') ON CONFLICT (bucket_id,name) DO UPDATE SET metadata='{"v":2}' RETURNING name`);
await allow(db, '5. mídia: upload 2', `INSERT INTO storage.objects(bucket_id,name,owner) VALUES('assessment-media','${A_OPEN}/ohs_lateral_video_2.mp4','${P1}') RETURNING name`);
await allow(db, '5. mídia: remoção', `DELETE FROM storage.objects WHERE name='${A_OPEN}/ohs_lateral_video_2.mp4' RETURNING name`);
await allow(db, '4. segmentares', `INSERT INTO segmental_test_results(assessment_id,test_name,body_region) VALUES('${A_OPEN}','thomas','hip') RETURNING id`);
await allow(db, '4. protocolo', `INSERT INTO protocols(assessment_id,name) VALUES('${A_OPEN}','Protocolo') RETURNING id`);
await allow(db, '4. achados', `INSERT INTO functional_findings(assessment_id,classification_tag,body_region,severity) VALUES('${A_OPEN}','t','knee','mild') RETURNING id`);
await allow(db, '4. status → completed', `UPDATE assessments SET status='completed', completed_at=now() WHERE id='${A_OPEN}' RETURNING id`);
await denyErr(db, '4b. depois de concluída, protocolo novo', `INSERT INTO protocols(assessment_id,name) VALUES('${A_OPEN}','extra') RETURNING id`, RLS);
await allow(db, '4c. concluída → archived (sem mudar mais nada)', `UPDATE assessments SET status='archived' WHERE id='${A_OPEN}' RETURNING id`);
await denyErr(db, '4d. archived → completed', `UPDATE assessments SET status='completed' WHERE id='${A_OPEN}' RETURNING id`, IMM);

note('## Positivos: leitura do aluno');
await as(db, S1);
await allow(db, '8. aluno lê avaliação concluída', `SELECT 1 FROM assessments WHERE id='${A_DONE}'`);
for (const [t] of childTables.filter(([t]) => t !== 'assessment_drafts')) await allow(db, `8. aluno lê ${t}`, `SELECT 1 FROM ${t} WHERE assessment_id='${A_DONE}'`);
await allow(db, '8. aluno lê mídia', `SELECT 1 FROM storage.objects WHERE name='${A_DONE}/ohs_anterior_photo_1.jpg'`);

note('## Positivos e negativos: sessão rápida');
await as(db, P1);
Q1 = (await allow(db, '6. P1 cria sessão para S1 vinculado', `INSERT INTO quick_protocol_sessions(professional_id,student_id,protocol_type,status) VALUES('${P1}','${S1}','knee_pain','in_progress') RETURNING id`)).rows?.[0]?.id ?? Q1;
await allow(db, '6. upload na sessão in_progress', `INSERT INTO storage.objects(bucket_id,name,owner) VALUES('assessment-media','${Q1}/quick_photo_1.jpg','${P1}') RETURNING name`);
await allow(db, '6. upsert na sessão in_progress', `INSERT INTO storage.objects(bucket_id,name,owner) VALUES('assessment-media','${Q1}/quick_photo_1.jpg','${P1}') ON CONFLICT (bucket_id,name) DO UPDATE SET metadata='{"v":2}' RETURNING name`);
await denyErr(db, 'troca student_id da sessão', `UPDATE quick_protocol_sessions SET student_id='${S2}' WHERE id='${Q1}' RETURNING id`, IDS);
await denyErr(db, 'troca assessment_id da sessão', `UPDATE quick_protocol_sessions SET assessment_id='${A_DONE}' WHERE id='${Q1}' RETURNING id`, IDS);
await denyErr(db, 'troca professional_id da sessão', `UPDATE quick_protocol_sessions SET professional_id='${P2}' WHERE id='${Q1}' RETURNING id`, /cannot be changed|row-level/i);
await allow(db, '6. sessão → completed (campos reais do wizard)', `UPDATE quick_protocol_sessions SET status='completed', test_results='{"a":1}', primary_deficit='x', secondary_deficits='[]', intervention_applied='{}', retest_result='better', retest_feedback='ok', completed_at=now() WHERE id='${Q1}' RETURNING id`);
await denyErr(db, 'upload em sessão completed', `INSERT INTO storage.objects(bucket_id,name,owner) VALUES('assessment-media','${Q1}/late.jpg','${P1}') RETURNING name`, RLS);
await deny(db, 'trava: edita sessão concluída', `UPDATE quick_protocol_sessions SET retest_feedback='mudou' WHERE id='${Q1}' RETURNING id`);
await deny(db, 'trava: reabre sessão concluída', `UPDATE quick_protocol_sessions SET status='in_progress' WHERE id='${Q1}' RETURNING id`);
await quiet(db, 'trava: concluir de novo (clique duplo) não dá erro e não muda nada', `UPDATE quick_protocol_sessions SET status='completed', primary_deficit='outro' WHERE id='${Q1}' RETURNING id`);
await deny(db, 'trava: apaga sessão concluída', `DELETE FROM quick_protocol_sessions WHERE id='${Q1}' RETURNING id`);
await allow(db, 'trava: sessão concluída continua igual', `SELECT 1 FROM quick_protocol_sessions WHERE id='${Q1}' AND status='completed' AND primary_deficit='x' AND retest_feedback='ok'`);
const qDel = (await allow(db, 'P1 abre sessão para apagar', `INSERT INTO quick_protocol_sessions(professional_id,student_id,status) VALUES('${P1}','${S1}','in_progress') RETURNING id`)).rows?.[0]?.id;
await allow(db, 'P1 apaga sessão em andamento', `DELETE FROM quick_protocol_sessions WHERE id='${qDel}' RETURNING id`);
const qOdd = (await allow(db, 'P1 abre sessão (status inventado)', `INSERT INTO quick_protocol_sessions(professional_id,student_id,status) VALUES('${P1}','${S1}','in_progress') RETURNING id`)).rows?.[0]?.id;
await denyErr(db, 'trava: sessão só sai de in_progress para completed', `UPDATE quick_protocol_sessions SET status='cancelada' WHERE id='${qOdd}' RETURNING id`, RLS);
await as(db, S1);
await allow(db, 'aluno lê a própria sessão', `SELECT 1 FROM quick_protocol_sessions WHERE id='${Q1}'`);
await allow(db, 'aluno lê mídia da sessão', `SELECT 1 FROM storage.objects WHERE name='${Q1}/quick_photo_1.jpg'`);
await denyErr(db, 'aluno faz upload na sessão', `INSERT INTO storage.objects(bucket_id,name,owner) VALUES('assessment-media','${Q1}/aluno.jpg','${S1}') RETURNING name`, RLS);

note('## Identificadores: o cliente não escolhe nem troca o id (é o nome da pasta da mídia)');
await as(db, P1);
await deny(db, 'P1 cria sessão com o id da própria avaliação concluída (id mantido?)', `WITH i AS (INSERT INTO quick_protocol_sessions(id,professional_id,student_id,status) VALUES('${A_DONE}','${P1}','${S1}','in_progress') RETURNING id) SELECT 1 FROM i WHERE id='${A_DONE}'`);
await denyErr(db, 'P1 grava mídia na concluída pela sessão-clone', `INSERT INTO storage.objects(bucket_id,name,owner) VALUES('assessment-media','${A_DONE}/tampered.jpg','${P1}') RETURNING name`, RLS);
await deny(db, 'P1 apaga mídia da concluída pela sessão-clone', `DELETE FROM storage.objects WHERE name='${A_DONE}/ohs_anterior_photo_1.jpg' RETURNING name`);
await deny(db, 'P1 cria sessão com o id da avaliação de P2 (id mantido?)', `WITH i AS (INSERT INTO quick_protocol_sessions(id,professional_id,student_id,status) VALUES('${A_P2}','${P1}','${S1}','in_progress') RETURNING id) SELECT 1 FROM i WHERE id='${A_P2}'`);
await deny(db, 'P1 lê mídia da avaliação de P2', `SELECT name FROM storage.objects WHERE name LIKE '${A_P2}/%'`);
await denyErr(db, 'P1 grava mídia na pasta da avaliação de P2', `INSERT INTO storage.objects(bucket_id,name,owner) VALUES('assessment-media','${A_P2}/planted.jpg','${P1}') RETURNING name`, RLS);
await deny(db, 'P1 apaga mídia da avaliação de P2', `DELETE FROM storage.objects WHERE name LIKE '${A_P2}/%' RETURNING name`);
await deny(db, 'P1 cria avaliação com o id da sessão de P2 (id mantido?)', `WITH i AS (INSERT INTO assessments(id,professional_id,student_id,status) VALUES('${Q_P2}','${P1}','${S1}','draft') RETURNING id) SELECT 1 FROM i WHERE id='${Q_P2}'`);
await deny(db, 'P1 lê mídia da sessão de P2', `SELECT name FROM storage.objects WHERE name LIKE '${Q_P2}/%'`);
await deny(db, 'P1 apaga mídia da sessão de P2', `DELETE FROM storage.objects WHERE name LIKE '${Q_P2}/%' RETURNING name`);
await deny(db, 'P1 upsert ON CONFLICT no id da concluída (id mantido?)', `WITH i AS (INSERT INTO assessments(id,professional_id,student_id,status) VALUES('${A_DONE}','${P1}','${S1}','draft') ON CONFLICT (id) DO UPDATE SET status='draft' RETURNING id) SELECT 1 FROM i WHERE id='${A_DONE}'`);
await allow(db, 'a concluída continua concluída depois do upsert', `SELECT 1 FROM assessments WHERE id='${A_DONE}' AND status='completed'`);
const qSwap = (await allow(db, 'P1 abre sessão (para tentar trocar o id)', `INSERT INTO quick_protocol_sessions(professional_id,student_id,status) VALUES('${P1}','${S1}','in_progress') RETURNING id`)).rows?.[0]?.id;
await denyErr(db, 'P1 troca o id da própria sessão pelo de outra avaliação de P2', `UPDATE quick_protocol_sessions SET id='${A_P2B}' WHERE id='${qSwap}' RETURNING id`, IDS);
const aSwap = (await allow(db, 'P1 abre avaliação draft (para tentar trocar o id)', `INSERT INTO assessments(professional_id,student_id,status) VALUES('${P1}','${S1}','draft') RETURNING id`)).rows?.[0]?.id;
await denyErr(db, 'P1 troca o id da própria avaliação pelo de outra sessão de P2', `UPDATE assessments SET id='${Q_P2B}' WHERE id='${aSwap}' RETURNING id`, IDS);
await denyErr(db, 'P1 cria sessão do aluno S1 ligada à avaliação de S2', `INSERT INTO quick_protocol_sessions(professional_id,student_id,assessment_id) VALUES('${P1}','${S1}','${A_P1S2}') RETURNING id`, RLS);
await as(db, S1);
await deny(db, 'S1 (aluno das linhas-clone) lê mídia de P2', `SELECT name FROM storage.objects WHERE name LIKE '${A_P2}/%' OR name LIKE '${Q_P2}/%'`);
await asService(db);
await allow(db, 'service_role mantém o id que escolhe', `WITH i AS (INSERT INTO assessments(id,professional_id,student_id,status) VALUES('e0000000-0000-4000-8000-0000000000aa','${P2}','${S2}','draft') RETURNING id) SELECT 1 FROM i WHERE id='e0000000-0000-4000-8000-0000000000aa'`);

note('## Travas de conclusão: concluída e arquivada não se apagam (decisão do Alex, 01/11)');
await as(db, P1);
A_CASC = (await allow(db, 'cria A_CASC', `INSERT INTO assessments(professional_id,student_id) VALUES('${P1}','${S1}') RETURNING id`)).rows?.[0]?.id ?? A_CASC;
await allow(db, 'protocolo em A_CASC', `INSERT INTO protocols(assessment_id,name) VALUES('${A_CASC}','p') RETURNING id`);
await denyErr(db, 'fria4: P1 liga sessão a A_CASC ainda aberta', `INSERT INTO quick_protocol_sessions(professional_id,student_id,assessment_id) VALUES('${P1}','${S1}','${A_CASC}') RETURNING id`, RLS);
await allow(db, 'A_CASC → completed', `UPDATE assessments SET status='completed' WHERE id='${A_CASC}' RETURNING id`);
const qCasc = (await allow(db, 'sessão ligada a A_CASC concluída (contexto, como no V1)', `INSERT INTO quick_protocol_sessions(professional_id,student_id,assessment_id) VALUES('${P1}','${S1}','${A_CASC}') RETURNING id`)).rows?.[0]?.id;
await deny(db, '7. P1 apaga A_CASC concluída', `DELETE FROM assessments WHERE id='${A_CASC}' RETURNING id`);
await deny(db, '7. P1 apaga A_DONE concluída (com protocolo e progresso do aluno)', `DELETE FROM assessments WHERE id='${A_DONE}' RETURNING id`);
await deny(db, '7. P1 apaga A_OPEN arquivada', `DELETE FROM assessments WHERE id='${A_OPEN}' RETURNING id`);
await sys(db);
await allow(db, '7. A_CASC continua lá', `SELECT 1 FROM assessments WHERE id='${A_CASC}' AND status='completed'`);
await allow(db, '7. protocolo de A_CASC continua lá', `SELECT 1 FROM protocols WHERE assessment_id='${A_CASC}'`);
await allow(db, '7. progresso de S1 continua lá', `SELECT 1 FROM progress_logs WHERE protocol_id='${PR_DONE}'`);
await allow(db, '7. sessão continua ligada a A_CASC', `SELECT 1 FROM quick_protocol_sessions WHERE id='${qCasc}' AND assessment_id='${A_CASC}'`);
await as(db, P1);
const aDraft = (await allow(db, 'P1 abre avaliação draft para apagar', `INSERT INTO assessments(professional_id,student_id) VALUES('${P1}','${S1}') RETURNING id`)).rows?.[0]?.id;
await allow(db, 'rascunho em aDraft', `INSERT INTO assessment_drafts(assessment_id,step_type,draft_data) VALUES('${aDraft}','anamnesis','{}') RETURNING id`);
await denyErr(db, 'fria4: P1 liga sessão a rascunho (apagá-lo mudaria a sessão concluída)', `INSERT INTO quick_protocol_sessions(professional_id,student_id,assessment_id) VALUES('${P1}','${S1}','${aDraft}') RETURNING id`, RLS);
await denyErr(db, 'fria4: P1 cria sessão já concluída', `INSERT INTO quick_protocol_sessions(professional_id,student_id,status,retest_result) VALUES('${P1}','${S1}','completed','inventado') RETURNING id`, RLS);
await denyErr(db, 'fria4: P1 cria sessão com status inventado', `INSERT INTO quick_protocol_sessions(professional_id,student_id,status) VALUES('${P1}','${S1}','qualquer') RETURNING id`, RLS);
await denyErr(db, 'fria4: P1 cria avaliação já concluída', `INSERT INTO assessments(professional_id,student_id,status,notes) VALUES('${P1}','${S1}','completed','inventado') RETURNING id`, RLS);
await denyErr(db, 'fria4: P1 cria avaliação já em andamento', `INSERT INTO assessments(professional_id,student_id,status) VALUES('${P1}','${S1}','in_progress') RETURNING id`, RLS);
await allow(db, '7. P1 apaga avaliação draft (lixeira continua)', `DELETE FROM assessments WHERE id='${aDraft}' RETURNING id`);
const aProg = (await allow(db, 'P1 abre avaliação para apagar', `INSERT INTO assessments(professional_id,student_id,status) VALUES('${P1}','${S1}','draft') RETURNING id`)).rows?.[0]?.id;
await allow(db, 'aProg → in_progress', `UPDATE assessments SET status='in_progress' WHERE id='${aProg}' RETURNING id`);
await allow(db, '7. P1 apaga avaliação in_progress (lixeira continua)', `DELETE FROM assessments WHERE id='${aProg}' RETURNING id`);
await sys(db);
await deny(db, '7. rascunho de aDraft sumiu (cascata)', `SELECT 1 FROM assessment_drafts WHERE assessment_id='${aDraft}'`);
await asService(db);
await allow(db, '7. service_role (administração) ainda apaga concluída', `DELETE FROM assessments WHERE id='${A_CASC}' RETURNING id`);
await sys(db);
await deny(db, '7. filhos de A_CASC sumiram com ela', `SELECT 1 FROM protocols WHERE assessment_id='${A_CASC}'`);
await allow(db, '7. sessão de A_CASC ficou com assessment_id nulo', `SELECT 1 FROM quick_protocol_sessions WHERE id='${qCasc}' AND assessment_id IS NULL`);
await as(db, P1);
const qS2 = (await allow(db, 'P1 abre sessão para S2', `INSERT INTO quick_protocol_sessions(professional_id,student_id,status) VALUES('${P1}','${S2}','in_progress') RETURNING id`)).rows?.[0]?.id;
await allow(db, 'P1 remove vínculo (DELETE continua)', `DELETE FROM professional_students WHERE professional_id='${P1}' AND student_id='${S2}' RETURNING id`);
await allow(db, 'P1 conclui a sessão de S2 depois de desvincular (como antes do bloco)', `UPDATE quick_protocol_sessions SET status='completed', completed_at=now() WHERE id='${qS2}' RETURNING id`);

note('## Matriz dos triggers');
await sys(db);
await db.exec(`INSERT INTO public.assessments(id,professional_id,student_id,status) VALUES('${A_DONE}','${P1}','${S1}','completed') ON CONFLICT (id) DO NOTHING`);
await db.exec(`BEGIN; CREATE POLICY tmp_anon_upd ON public.assessments FOR UPDATE TO anon USING (true) WITH CHECK (true); CREATE POLICY tmp_anon_sel ON public.assessments FOR SELECT TO anon USING (true);
CREATE POLICY tmp_anon_qupd ON public.quick_protocol_sessions FOR UPDATE TO anon USING (true) WITH CHECK (true); CREATE POLICY tmp_anon_qsel ON public.quick_protocol_sessions FOR SELECT TO anon USING (true);`);
await as(db, null);
const sp = async (fn) => { await db.exec('SAVEPOINT sp'); await fn(); await db.exec('ROLLBACK TO SAVEPOINT sp'); };
await sp(() => denyErr(db, 'anon (policy aberta) troca student_id', `UPDATE assessments SET student_id='${X}' WHERE id='${A_DONE}' RETURNING id`, IDS));
await sp(() => denyErr(db, 'anon (policy aberta) reabre concluída', `UPDATE assessments SET status='draft' WHERE id='${A_DONE}' RETURNING id`, IMM));
await sp(() => denyErr(db, 'anon (policy aberta) troca aluno da sessão', `UPDATE quick_protocol_sessions SET student_id='${X}' WHERE id='${Q1}' RETURNING id`, IDS));
await sys(db); await db.exec('ROLLBACK');
await asService(db);
await allow(db, 'service_role troca student_id', `UPDATE assessments SET student_id='${S2}' WHERE id='${A_DONE}' RETURNING id`);
await allow(db, 'service_role edita concluída', `UPDATE assessments SET notes='correção' WHERE id='${A_DONE}' RETURNING id`);
await allow(db, 'service_role troca aluno da sessão', `UPDATE quick_protocol_sessions SET student_id='${S2}' WHERE id='${Q1}' RETURNING id`);
await allow(db, 'service_role cria vínculo + avaliação (create-student)', `WITH l AS (INSERT INTO professional_students(professional_id,student_id) VALUES('${P2}','${X}') RETURNING student_id) INSERT INTO assessments(professional_id,student_id,status) SELECT '${P2}',student_id,'draft' FROM l RETURNING id`);

summary();
}
