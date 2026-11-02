// @vitest-environment jsdom
// F-04, F-05 e F-06 no segmentar:
// - F-04: depois do envio, voltar abria os testes vazios e reenviar duplicava as linhas;
// - F-05: "Pular" num teste apagava o rascunho de todos e ia ao protocolo sem gravar nada;
// - F-06: abrir o segmentar de outra avaliação apagava o rascunho desta, e as sugestões que chegavam depois
//   do rascunho o sobrescreviam com testes vazios.
// Reais: SegmentalTestsWizard, AutoSegmentalTest e useWizardPersistence. Falsos: Supabase (tabelas por filtro,
// escritas registradas), o MediaUploader (mostra a foto que recebe), a IA e a priorização (dois testes quantitativos
// bilaterais). Dados sintéticos.
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import type { RecordedWrite } from './supabaseFake';
import { SegmentalTestsWizard } from '@/components/segmental-tests/SegmentalTestsWizard';

const ASSESSMENT = '00000000-0000-0000-0000-0000000000d1';
const OTHER_ASSESSMENT = '00000000-0000-0000-0000-0000000000d2';

const h = vi.hoisted(() => ({
  tables: {} as Record<string, unknown>,
  writes: [] as RecordedWrite[],
  completed: 0,
  toasts: [] as string[],
  cutoffs: {} as Record<string, number>,
}));

vi.mock('@/integrations/supabase/client', async () => {
  const { createSupabaseFake } = await import('./supabaseFake');
  return {
    supabase: {
      ...createSupabaseFake(h.tables, h.writes),
      functions: { invoke: () => Promise.resolve({ data: null, error: new Error('parada do teste') }) },
    },
  };
});

const test = (id: string, name: string) => ({
  id, name, bodyRegion: 'regiao', description: `descrição de ${name}`, unit: 'cm', cutoffValue: h.cutoffs[id] ?? 10,
  isBilateral: true, instructions: '', resultType: 'quantitative' as const,
});

vi.mock('@/lib/testPrioritization', () => ({
  getSuggestedTestsWithPriority: () => ({
    prioritizedTests: [{ test: test('teste_a', 'Teste A sintético') }, { test: test('teste_b', 'Teste B sintético') }],
    additionalTests: [],
    contextosAplicados: [],
    totalCausasAnalisadas: 0,
    paretoApplied: false,
  }),
}));

vi.mock('sonner', () => ({
  toast: { error: (title: string) => { h.toasts.push(title); }, success: () => {} },
}));

vi.mock('@/components/media/MediaUploader', () => ({
  MediaUploader: ({ initialPhotoUrl }: { initialPhotoUrl?: string }) => <div>foto: {initialPhotoUrl ?? 'nenhuma'}</div>,
}));
vi.mock('@/hooks/useMovementAnalysis', () => ({
  useMovementAnalysis: () => ({ isAnalyzing: false, analyzeMovement: async () => null }),
}));

const draftFor = (assessmentId: string, testResults: Record<string, unknown>) =>
  (f: Record<string, unknown>) => (
    f.assessment_id === assessmentId && f.step_type === 'segmental_tests'
      ? { draft_data: { testResults }, current_step: 1 }
      : null
  );

const result = (testId: string, testName: string, values: Record<string, unknown> = {}) => ({
  testId, testName, bodyRegion: 'regiao', leftValue: null, rightValue: null, passFailLeft: null, passFailRight: null,
  notes: '', unit: 'cm', cutoffValue: 10, ...values,
});

beforeEach(() => {
  localStorage.clear();
  for (const table of Object.keys(h.tables)) delete h.tables[table];
  h.writes.length = 0;
  h.completed = 0;
  h.toasts.length = 0;
  h.cutoffs = {};
  h.tables.global_test_results = [{ anterior_view: { compensations: ['compensacao_sintetica'] } }];
});

afterEach(() => { cleanup(); vi.restoreAllMocks(); });

const renderWizard = async () => {
  render(<SegmentalTestsWizard assessmentId={ASSESSMENT} onComplete={() => { h.completed++; }} />);
  await screen.findByText('descrição de Teste A sintético');
};

const segmentalWrites = () => h.writes.filter((w) => w.table === 'segmental_test_results');
const draftDeletes = () => h.writes.filter((w) => w.table === 'assessment_drafts' && w.op === 'delete');

// Preenche os dois lados do teste aberto (os dois campos numéricos do teste bilateral)
const typeValues = (left: string, right: string) => {
  const [leftInput, rightInput] = screen.getAllByPlaceholderText('0');
  fireEvent.change(leftInput, { target: { value: left } });
  fireEvent.change(rightInput, { target: { value: right } });
};

const goToSummary = () => {
  fireEvent.click(screen.getByRole('button', { name: /Próximo/ }));
  fireEvent.click(screen.getByRole('button', { name: /Próximo/ }));
};

it('F-04: sem rascunho, o segmentar já enviado volta com os resultados salvos', async () => {
  h.tables.segmental_test_results = (f: Record<string, unknown>) => (f.assessment_id === ASSESSMENT ? [{
    assessment_id: ASSESSMENT, test_name: 'Teste A sintético', body_region: 'regiao', left_value: 8, right_value: 12,
    pass_fail_left: false, pass_fail_right: true, cutoff_value: 10, unit: 'cm', notes: 'nota sintética', media_urls: [],
  }] : []);
  await renderWizard();
  await screen.findByDisplayValue('8');
  screen.getByDisplayValue('12');
  screen.getByDisplayValue('nota sintética');
});

it('F-04: concluir logo depois de voltar regrava a linha salva igual, com a foto e o que não se reconhece', async () => {
  const PHOTO = `${ASSESSMENT}/teste_a_photo_1700000000000.jpg`;
  const UNKNOWN = `${ASSESSMENT}/arquivo_antigo_sintetico.jpg`;
  const saved = {
    assessment_id: ASSESSMENT, test_name: 'Teste A sintético', body_region: 'regiao_salva', left_value: 8, right_value: 12,
    pass_fail_left: false, pass_fail_right: true, cutoff_value: 9, unit: 'graus', notes: 'nota sintética',
    media_urls: [PHOTO, UNKNOWN],
  };
  h.tables.segmental_test_results = (f: Record<string, unknown>) => (f.assessment_id === ASSESSMENT ? [saved] : []);
  await renderWizard();
  screen.getByText(`foto: ${PHOTO}`);
  goToSummary();
  fireEvent.click(screen.getByRole('button', { name: /Concluir Testes Segmentados/ }));
  fireEvent.click(await screen.findByRole('button', { name: 'Concluir assim' }));

  await waitFor(() => expect(segmentalWrites()).toHaveLength(1));
  const rows = segmentalWrites()[0].payload as Array<{ test_name: string }>;
  expect(rows.find((r) => r.test_name === 'Teste A sintético')).toStrictEqual(saved);
});

it('F-04: se os resultados salvos não puderem ser lidos, o segmentar não abre para concluir', async () => {
  h.tables.segmental_test_results = () => { throw new Error('falha sintética de leitura'); };
  render(<SegmentalTestsWizard assessmentId={ASSESSMENT} onComplete={() => { h.completed++; }} />);
  await screen.findByText('Nenhum teste segmentado sugerido');
  expect(screen.queryByRole('button', { name: /Concluir Testes Segmentados/ })).toBeNull();
  expect(segmentalWrites()).toHaveLength(0);
});

it('F-04: o rascunho que não pôde ser lido não é apagado; concluir não grava por cima', async () => {
  h.tables.assessment_drafts = () => { throw new Error('falha sintética de leitura'); };
  await renderWizard();
  goToSummary();
  fireEvent.click(screen.getByRole('button', { name: /Concluir Testes Segmentados/ }));
  fireEvent.click(await screen.findByRole('button', { name: 'Concluir assim' }));

  await waitFor(() => expect(h.toasts).toContain('Dados salvos não carregados'));
  expect(segmentalWrites()).toHaveLength(0);
  expect(draftDeletes()).toHaveLength(0);
  expect(h.completed).toBe(0);
});

it('F-04: se a anamnese usada nas sugestões não puder ser lida, o segmentar não abre para concluir', async () => {
  h.tables.anamnesis_responses = () => { throw new Error('falha sintética de leitura'); };
  render(<SegmentalTestsWizard assessmentId={ASSESSMENT} onComplete={() => { h.completed++; }} />);
  await screen.findByText('Nenhum teste segmentado sugerido');
  expect(screen.queryByRole('button', { name: /Concluir Testes Segmentados/ })).toBeNull();
  expect(segmentalWrites()).toHaveLength(0);
});

it('F-04: o corte zero do catálogo é gravado como zero, e um zero salvo volta igual', async () => {
  h.cutoffs = { teste_a: 0, teste_b: 0 };
  const savedB = {
    assessment_id: ASSESSMENT, test_name: 'Teste B sintético', body_region: 'regiao', left_value: 3, right_value: 4,
    pass_fail_left: true, pass_fail_right: true, cutoff_value: 0, unit: 'cm', notes: null, media_urls: [],
  };
  h.tables.segmental_test_results = (f: Record<string, unknown>) => (f.assessment_id === ASSESSMENT ? [savedB] : []);
  await renderWizard();
  typeValues('8', '12');
  goToSummary();
  fireEvent.click(screen.getByRole('button', { name: /Concluir Testes Segmentados/ }));

  await waitFor(() => expect(segmentalWrites()).toHaveLength(1));
  const rows = segmentalWrites()[0].payload as Array<{ test_name: string; cutoff_value: number | null }>;
  expect(rows.find((r) => r.test_name === 'Teste A sintético')?.cutoff_value).toBe(0);
  expect(rows.find((r) => r.test_name === 'Teste B sintético')).toStrictEqual(savedB);
});

it('F-04: reenviar regrava as linhas por avaliação e teste, sem duplicar', async () => {
  await renderWizard();
  typeValues('8', '12');
  fireEvent.click(screen.getByRole('button', { name: /Próximo/ }));
  await screen.findByText('descrição de Teste B sintético');
  typeValues('11', '11');
  fireEvent.click(screen.getByRole('button', { name: /Próximo/ }));
  fireEvent.click(screen.getByRole('button', { name: /Concluir Testes Segmentados/ }));

  await waitFor(() => expect(segmentalWrites()).toHaveLength(1));
  expect(segmentalWrites()[0].op).toBe('upsert');
  expect(segmentalWrites()[0].options).toMatchObject({ onConflict: 'assessment_id,test_name' });
  expect(segmentalWrites()[0].payload).toHaveLength(2);
});

it('F-05: "Pular" vai para o próximo teste, sem apagar o rascunho nem sair do segmentar', async () => {
  await renderWizard();
  typeValues('8', '12');
  fireEvent.click(screen.getByRole('button', { name: 'Pular' }));

  await screen.findByText('descrição de Teste B sintético');
  expect(h.completed).toBe(0);
  expect(draftDeletes()).toHaveLength(0);
  expect(segmentalWrites()).toHaveLength(0);
  // O que foi preenchido no teste A continua lá
  fireEvent.click(screen.getByRole('button', { name: /Anterior/ }));
  await screen.findByDisplayValue('8');
});

it('F-05: concluir com testes sem resultado pede confirmação; cancelar não grava nada', async () => {
  await renderWizard();
  typeValues('8', '12');
  goToSummary();
  fireEvent.click(screen.getByRole('button', { name: /Concluir Testes Segmentados/ }));

  await screen.findByText('1 teste sem resultado.');
  fireEvent.click(screen.getByRole('button', { name: 'Voltar aos testes' }));
  await waitFor(() => expect(screen.queryByText('1 teste sem resultado.')).toBeNull());
  expect(segmentalWrites()).toHaveLength(0);
  expect(h.completed).toBe(0);

  fireEvent.click(screen.getByRole('button', { name: /Concluir Testes Segmentados/ }));
  fireEvent.click(await screen.findByRole('button', { name: 'Concluir assim' }));
  await waitFor(() => expect(h.completed).toBe(1));
  expect(segmentalWrites()).toHaveLength(1);
});

it('F-06: abrir o segmentar depois do de outra avaliação não apaga o rascunho desta', async () => {
  localStorage.setItem('segmentalTests_assessmentId', OTHER_ASSESSMENT);
  h.tables.assessment_drafts = draftFor(ASSESSMENT, {
    teste_a: result('teste_a', 'Teste A sintético', { leftValue: 5 }),
    teste_b: result('teste_b', 'Teste B sintético'),
  });
  await renderWizard();
  expect(draftDeletes()).toHaveLength(0);
  await screen.findByDisplayValue('5');
});

it('F-06: sugestões que chegam depois do rascunho não o sobrescrevem', async () => {
  h.tables.assessment_drafts = draftFor(ASSESSMENT, {
    teste_a: result('teste_a', 'Teste A sintético', { leftValue: 5 }),
    teste_b: result('teste_b', 'Teste B sintético'),
  });
  let releaseGlobals: () => void = () => {};
  h.tables.global_test_results = () => new Promise((resolve) => {
    releaseGlobals = () => resolve([{ anterior_view: { compensations: ['compensacao_sintetica'] } }]);
  });
  render(<SegmentalTestsWizard assessmentId={ASSESSMENT} onComplete={() => {}} />);
  await new Promise((r) => setTimeout(r, 20)); // o rascunho já carregou; as sugestões ainda não
  await act(async () => { releaseGlobals(); });

  await screen.findByText('descrição de Teste A sintético');
  expect(screen.getByDisplayValue('5')).toBeTruthy();
});
