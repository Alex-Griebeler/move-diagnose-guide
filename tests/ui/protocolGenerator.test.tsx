// @vitest-environment jsdom
// Etapa 3d (B-13, F-15): a etapa do protocolo. Real: ProtocolGenerator, o motor de prioridades, a validação
// da resposta e a montagem do pedido. Falsos: Supabase (tabelas, escritas e rpc registradas, falhas por nome)
// e a Edge generate-protocol (a resposta é a de quando foi chamada; cada chamada pode ser retida). Dados sintéticos.
import { StrictMode } from 'react';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import type { RecordedWrite } from './supabaseFake';
import { ProtocolGenerator } from '@/components/protocol/ProtocolGenerator';

const ASSESSMENT = '00000000-0000-0000-0000-0000000000e1';

const h = vi.hoisted(() => ({
  tables: {} as Record<string, unknown>,
  writes: [] as RecordedWrite[],
  fail: {} as Record<string, string>,
  invokes: [] as Array<{ name: string; body: unknown }>,
  response: null as unknown,
  holds: [] as Array<Promise<void>>,
  toasts: [] as string[],
}));

vi.mock('@/integrations/supabase/client', async () => {
  const { createSupabaseFake } = await import('./supabaseFake');
  const fake = createSupabaseFake(h.tables, h.writes, h.fail);
  return {
    supabase: {
      ...fake,
      functions: {
        invoke: async (name: string, opts: { body: unknown }) => {
          const call = h.invokes.push({ name, body: opts.body }) - 1;
          const response = h.response;
          await h.holds[call];
          return { data: response, error: null };
        },
      },
    },
  };
});

vi.mock('sonner', () => ({
  toast: {
    error: (t: string, o?: { description?: string }) => { h.toasts.push(`erro: ${t}${o?.description ? ` (${o.description})` : ''}`); },
    success: (t: string) => { h.toasts.push(`ok: ${t}`); },
  },
}));

const exercise = (name: string, phase: string, extra: Record<string, unknown> = {}) => ({
  name, phase, bodyRegion: 'Tornozelo', targetMuscles: ['sóleo'], sets: 2, reps: '10',
  instructions: 'instrução sintética', rationale: 'motivo sintético', priority: 1, ...extra,
});
const protocolWith = (exercises: unknown[], extra: Record<string, unknown> = {}) => ({
  protocol: {
    protocolName: 'Protocolo sintético', priorityLevel: 'high', frequencyPerWeek: 3, durationWeeks: 4,
    summary: 'resumo sintético', exercises, ...extra,
  },
});
const upserts = () => h.writes.filter(w => w.table === 'assessment_drafts' && w.op === 'upsert');
// Fora o cache da geração, o que a etapa escreveu
const saves = () => h.writes.filter(w => w.table !== 'assessment_drafts');
const generations = () => h.invokes.filter(i => i.name === 'generate-protocol').length;
const mount = (onComplete: () => void = () => {}) => render(<ProtocolGenerator assessmentId={ASSESSMENT} onComplete={onComplete} />);

const releases: Array<() => void> = [];
// Retém a chamada n à geração até releases[n]()
const holdCall = (call: number) => { h.holds[call] = new Promise<void>(resolve => { releases[call] = resolve; }); };
// A chave do pedido é o SHA-256 real; o espião só conta as cargas que chegaram a ela e, se pedido,
// retém a de número `held` até a função devolvida ser chamada
const watchKey = (held?: number) => {
  const real = crypto.subtle.digest.bind(crypto.subtle);
  let release = () => {};
  const gate = new Promise<void>(resolve => { release = resolve; });
  let calls = 0;
  const spy = vi.spyOn(crypto.subtle, 'digest').mockImplementation(async (algorithm, data) => {
    if (calls++ === held) await gate;
    return real(algorithm, data);
  });
  return { spy, release };
};
let draftReads = 0;

beforeEach(() => {
  h.writes.length = 0; h.invokes.length = 0; h.toasts.length = 0; h.holds.length = 0; releases.length = 0;
  draftReads = 0;
  for (const k of Object.keys(h.fail)) delete h.fail[k];
  for (const k of Object.keys(h.tables)) delete h.tables[k];
  // OHS vista lateral com calcanhares subindo: Limitação de Dorsiflexão e Restrição TC, peso 4
  h.tables.global_test_results = [{ test_name: 'OHS', lateral_view: { compensations: ['heels_rise'] } }];
  h.tables.segmental_test_results = [];
  h.tables.anamnesis_responses = { objectives: 'objetivo sintético' };
  // O rascunho do protocolo é o último que a etapa gravou, como no banco
  h.tables.assessment_drafts = (filters: Record<string, unknown>) => {
    if (filters.assessment_id !== ASSESSMENT || filters.step_type !== 'protocol') return null;
    draftReads += 1;
    const last = upserts().at(-1)?.payload as { draft_data: unknown } | undefined;
    return last ? { draft_data: last.draft_data } : null;
  };
  h.response = protocolWith([exercise('Mobilidade sintética', 'mobility')]);
});
afterEach(() => {
  releases.forEach(release => release());
  vi.restoreAllMocks();
  cleanup();
});

it('B-13 e gravação: uma chamada à função, com o achado de peso 4 do motor, e nenhuma escrita direta', async () => {
  const onComplete = vi.fn();
  mount(onComplete);
  fireEvent.click(await screen.findByText('Salvar e Finalizar'));
  await waitFor(() => expect(onComplete).toHaveBeenCalledTimes(1));
  expect(saves().map(w => `${w.table}.${w.op}`)).toStrictEqual(['save_assessment_protocol.rpc']);
  const request = saves()[0].payload as { _assessment_id: string; _protocol: { name: string }; _findings: Array<{ classification_tag: string; biomechanical_importance: number }> };
  expect(request._assessment_id).toBe(ASSESSMENT);
  expect(request._protocol.name).toBe('Protocolo sintético');
  expect(request._findings.find(f => f.classification_tag === 'dorsiflexion_limit')?.biomechanical_importance).toBe(4);
  expect(h.toasts).toStrictEqual(['ok: Protocolo salvo com sucesso!']);
});

it('erro da função: avisa que nada foi gravado pela metade, não conclui, e o reenvio é a mesma chamada', async () => {
  h.fail['save_assessment_protocol.rpc'] = 'falha sintética de rede';
  const onComplete = vi.fn();
  mount(onComplete);
  fireEvent.click(await screen.findByText('Salvar e Finalizar'));
  await waitFor(() => expect(h.toasts).toStrictEqual(['erro: Erro ao salvar protocolo (Nada foi gravado pela metade. Tente de novo.)']));
  expect(onComplete).not.toHaveBeenCalled();
  delete h.fail['save_assessment_protocol.rpc'];
  fireEvent.click(screen.getByText('Salvar e Finalizar'));
  await waitFor(() => expect(onComplete).toHaveBeenCalledTimes(1));
  expect(saves().map(w => `${w.table}.${w.op}`)).toStrictEqual(['save_assessment_protocol.rpc', 'save_assessment_protocol.rpc']);
  expect(saves()[1].payload).toStrictEqual(saves()[0].payload);
});

it('F-15: voltar à etapa com o mesmo pedido mostra o protocolo guardado sem chamar a geração', async () => {
  const first = mount();
  await screen.findByText('Salvar e Finalizar');
  expect(upserts()).toHaveLength(1);
  expect(upserts()[0].options).toStrictEqual({ onConflict: 'assessment_id,step_type' });
  first.unmount();
  mount();
  expect(await screen.findByText('Mobilidade sintética')).toBeTruthy();
  expect(generations()).toBe(1);
});

it('F-15: com outro teste global, o pedido muda e a etapa gera de novo', async () => {
  const first = mount();
  await screen.findByText('Salvar e Finalizar');
  first.unmount();
  h.tables.global_test_results = [{ test_name: 'OHS', lateral_view: { compensations: ['heels_rise', 'trunk_forward_lean'] } }];
  mount();
  await screen.findByText('Salvar e Finalizar');
  expect(generations()).toBe(2);
});

it('F-15: um protocolo guardado que não passa na validação é gerado de novo', async () => {
  const first = mount();
  await screen.findByText('Salvar e Finalizar');
  first.unmount();
  const saved = upserts()[0].payload as { draft_data: { protocol: { priorityLevel: string } } };
  saved.draft_data.protocol.priorityLevel = 'urgente';
  mount();
  await screen.findByText('Salvar e Finalizar');
  expect(generations()).toBe(2);
});

it('F-15: "Regenerar Protocolo" sempre gera e guarda o novo', async () => {
  mount();
  await screen.findByText('Salvar e Finalizar');
  h.response = protocolWith([exercise('Outra mobilidade sintética', 'mobility')]);
  fireEvent.click(screen.getByText('Regenerar Protocolo'));
  expect(await screen.findByText('Outra mobilidade sintética')).toBeTruthy();
  expect(generations()).toBe(2);
  expect(upserts()).toHaveLength(2);
});

it('F-15: no StrictMode, uma montagem gera uma vez', async () => {
  render(<StrictMode><ProtocolGenerator assessmentId={ASSESSMENT} onComplete={() => {}} /></StrictMode>);
  await screen.findByText('Salvar e Finalizar');
  expect(generations()).toBe(1);
});

it('F-15: sair e voltar enquanto a geração roda espera a mesma chamada', async () => {
  const { spy } = watchKey();
  holdCall(0);
  const first = mount();
  await waitFor(() => expect(generations()).toBe(1));
  first.unmount();
  mount();
  // A nova carga calculou a chave e, sem nada mais para esperar, já encontrou a geração em andamento
  await waitFor(() => expect(spy).toHaveBeenCalledTimes(2));
  await spy.mock.results[1].value;
  await new Promise(resolve => setTimeout(resolve, 0));
  releases[0]();
  expect(await screen.findByText('Salvar e Finalizar')).toBeTruthy();
  expect(generations()).toBe(1);
  // Só a primeira carga leu o protocolo guardado: a segunda esperou a geração
  expect(draftReads).toBe(1);
});

it('F-15: a geração que termina enquanto a etapa volta a carregar não é paga de novo', async () => {
  const { spy, release } = watchKey(1);
  holdCall(0);
  const first = mount();
  await waitFor(() => expect(generations()).toBe(1));
  first.unmount();
  mount();
  // A nova carga já leu os testes e está calculando a chave quando a geração termina e é guardada
  await waitFor(() => expect(spy).toHaveBeenCalledTimes(2));
  releases[0]();
  await waitFor(() => expect(upserts()).toHaveLength(1));
  release();
  expect(await screen.findByText('Mobilidade sintética')).toBeTruthy();
  expect(generations()).toBe(1);
});

// O protocolo guardado retido até soltar: as cargas ficam paradas logo antes de decidir se geram
const holdDraftReads = () => {
  let release = () => {};
  const gate = new Promise<null>(resolve => { release = () => resolve(null); });
  h.tables.assessment_drafts = () => { draftReads += 1; return gate; };
  return release;
};

it('F-15: duas cargas do mesmo pedido que leem o guardado ao mesmo tempo geram uma vez', async () => {
  const release = holdDraftReads();
  mount();
  mount();
  await waitFor(() => expect(draftReads).toBe(2));
  release();
  await waitFor(() => expect(screen.getAllByText('Salvar e Finalizar')).toHaveLength(2));
  expect(generations()).toBe(1);
});

it('F-15: sair da etapa enquanto ela lê o guardado não gera', async () => {
  const release = holdDraftReads();
  const view = mount();
  await waitFor(() => expect(draftReads).toBe(1));
  view.unmount();
  release();
  // A chave já foi calculada antes da leitura: daqui até decidir gerar, a carga desmontada só tem microtarefas,
  // e todas rodam antes da próxima macrotarefa. Não é espera por tempo.
  await new Promise(resolve => setTimeout(resolve, 0));
  expect(generations()).toBe(0);
});

// A etapa é montada por avaliação; se a avaliação mudar no meio, a geração antiga não pode sobrescrever a nova
it('trocar de avaliação durante a geração: a resposta atrasada da anterior não aparece', async () => {
  holdCall(0);
  holdCall(1);
  const view = mount();
  await waitFor(() => expect(generations()).toBe(1));
  h.response = protocolWith([exercise('Mobilidade da segunda avaliação', 'mobility')]);
  view.rerender(<ProtocolGenerator assessmentId="00000000-0000-0000-0000-0000000000e2" onComplete={() => {}} />);
  await waitFor(() => expect(generations()).toBe(2));
  releases[1]();
  expect(await screen.findByText('Mobilidade da segunda avaliação')).toBeTruthy();
  releases[0]();
  await new Promise(resolve => setTimeout(resolve, 0));
  expect(screen.queryByText('Mobilidade sintética')).toBeNull();
  expect(screen.getByText('Mobilidade da segunda avaliação')).toBeTruthy();
});

it('F-15: resposta inválida da geração vai para a tela de erro, sem salvar', async () => {
  h.response = protocolWith([exercise('Mobilidade sintética', 'mobility')], { priorityLevel: 'urgente' });
  mount();
  expect(await screen.findByText('Resposta inválida do gerador de protocolo')).toBeTruthy();
  expect(screen.getByText('Tentar Novamente')).toBeTruthy();
  expect(screen.queryByText('Salvar e Finalizar')).toBeNull();
  expect(upserts()).toHaveLength(0);
});

it('F-15: exercício de fase desconhecida aparece com aviso e o salvar fica bloqueado', async () => {
  h.response = protocolWith([exercise('Mobilidade sintética', 'mobility'), exercise('Aquecimento sintético', 'warmup')]);
  mount();
  const save = await screen.findByText('Salvar e Finalizar');
  expect(screen.getByText('2')).toBeTruthy();
  expect(screen.getByText('Fase não reconhecida')).toBeTruthy();
  expect(screen.getByText('Aquecimento sintético')).toBeTruthy();
  expect(screen.getByText(/Fase: warmup/)).toBeTruthy();
  expect(save.closest('button')?.disabled).toBe(true);
  fireEvent.click(save);
  expect(saves()).toHaveLength(0);
});

it('F-15: exercício sem targetMuscles aparece, e a etapa continua utilizável', async () => {
  h.response = protocolWith([exercise('Sem músculos sintético', 'mobility', { targetMuscles: undefined })]);
  mount();
  expect(await screen.findByText('Sem músculos sintético')).toBeTruthy();
  expect(screen.getByText('Salvar e Finalizar').closest('button')?.disabled).toBe(false);
});

it('erro na leitura da anamnese vai para a tela de erro, sem gerar sem o contexto do aluno', async () => {
  h.tables.anamnesis_responses = () => { throw new Error('falha sintética de leitura'); };
  mount();
  expect(await screen.findByText('falha sintética de leitura')).toBeTruthy();
  expect(generations()).toBe(0);
});

it('falha ao ler ou guardar a geração não bloqueia: gera e mostra', async () => {
  h.tables.assessment_drafts = () => { throw new Error('falha sintética de leitura'); };
  h.fail['assessment_drafts.upsert'] = 'falha sintética de gravação';
  mount();
  expect(await screen.findByText('Salvar e Finalizar')).toBeTruthy();
  expect(generations()).toBe(1);
});

it('o pedido à geração tem as mesmas chaves de antes, com o contexto do aluno', async () => {
  mount();
  await screen.findByText('Salvar e Finalizar');
  const body = h.invokes[0].body as Record<string, unknown>;
  expect(Object.keys(body).sort()).toStrictEqual(['anamnesis', 'compensations', 'primaryIssues', 'priorityAnalysis', 'secondaryIssues', 'segmentalResults']);
  expect(body.anamnesis).toMatchObject({ objectives: 'objetivo sintético' });
});
