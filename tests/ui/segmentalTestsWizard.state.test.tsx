// @vitest-environment jsdom
// F-07: o resultado bilateral quantitativo perdia o lado esquerdo. Passo 0: os segmentares não têm mais IA (o
// profissional digita os dois lados), e o peitoral menor passa com distância até 2,5 cm.
// Reais: SegmentalTestsWizard, AutoSegmentalTest, useWizardPersistence, o catálogo de testes e o ProtocolGenerator
// lendo a linha gravada. Falsos: Supabase (tabelas preenchidas pelo teste, escritas registradas, Edge Functions
// respondidas pelo teste), o MediaUploader (registra se recebe o botão de análise), a IA (só conta chamadas) e a
// priorização (um teste: o bilateral sintético, corte 10, ou o peitoral menor do catálogo).
// A IA do protocolo não é chamada: o teste lê o corpo enviado a generate-protocol.
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import type { RecordedWrite } from './supabaseFake';
import { SegmentalTestsWizard } from '@/components/segmental-tests/SegmentalTestsWizard';
import { ProtocolGenerator } from '@/components/protocol/ProtocolGenerator';
import { getTestById, type SegmentalTest } from '@/data/segmentalTestMappings';

const ASSESSMENT = '00000000-0000-0000-0000-0000000000b1';

const h = vi.hoisted(() => ({
  tables: {} as Record<string, unknown>,
  writes: [] as RecordedWrite[],
  invokes: [] as Array<{ name: string; body: unknown }>,
  aiCalls: 0,
  analyzeProps: [] as unknown[],
  test: null as unknown,
}));

const BILATERAL = {
  id: 'teste_bilateral', name: 'Teste bilateral sintético', bodyRegion: 'regiao', description: '',
  unit: 'cm', cutoffValue: 10, isBilateral: true, instructions: '', resultType: 'quantitative' as const,
};
const PEC_MINOR = getTestById('pec_minor_length') as SegmentalTest;

vi.mock('@/integrations/supabase/client', async () => {
  const { createSupabaseFake } = await import('./supabaseFake');
  return {
    supabase: {
      ...createSupabaseFake(h.tables, h.writes),
      functions: {
        invoke: (name: string, options: { body: unknown }) => {
          h.invokes.push({ name, body: options.body });
          return Promise.resolve({ data: null, error: new Error('parada do teste') });
        },
      },
    },
  };
});

vi.mock('@/lib/testPrioritization', () => ({
  getSuggestedTestsWithPriority: () => ({
    prioritizedTests: [{ test: h.test }],
    additionalTests: [],
    contextosAplicados: [],
    totalCausasAnalisadas: 0,
    paretoApplied: false,
  }),
}));

vi.mock('@/components/media/MediaUploader', () => ({
  MediaUploader: ({ onUploadComplete, onAnalyze }: { onUploadComplete: (u: { photoUrl?: string }) => void; onAnalyze?: () => void }) => {
    h.analyzeProps.push(onAnalyze);
    return <button onClick={() => onUploadComplete({ photoUrl: 'https://midia.test/foto-sintetica.jpg' })}>enviar foto</button>;
  },
}));

vi.mock('@/hooks/useMovementAnalysis', () => ({
  useMovementAnalysis: () => ({
    isAnalyzing: false,
    analyzeMovement: async () => { h.aiCalls++; return null; },
  }),
}));

beforeEach(() => {
  localStorage.clear();
  for (const table of Object.keys(h.tables)) delete h.tables[table];
  h.tables.global_test_results = [{ anterior_view: { compensations: ['compensacao_sintetica'] } }];
  h.writes.length = 0;
  h.invokes.length = 0;
  h.aiCalls = 0;
  h.analyzeProps.length = 0;
  h.test = BILATERAL;
});
afterEach(() => { cleanup(); vi.restoreAllMocks(); });

const renderWizard = async () => {
  render(<SegmentalTestsWizard assessmentId={ASSESSMENT} onComplete={() => {}} />);
  await screen.findByText('enviar foto');
};

// Preenche os dois lados (os dois campos numéricos do teste bilateral)
const typeValues = (left: string, right: string) => {
  const [leftInput, rightInput] = screen.getAllByPlaceholderText('0');
  fireEvent.change(leftInput, { target: { value: left } });
  fireEvent.change(rightInput, { target: { value: right } });
};

const submit = async () => {
  fireEvent.click(screen.getByRole('button', { name: /Próximo/ }));
  fireEvent.click(screen.getByRole('button', { name: /Concluir Testes Segmentados/ }));
  await waitFor(() => expect(h.writes.some((w) => w.table === 'segmental_test_results')).toBe(true));
  return h.writes.find((w) => w.table === 'segmental_test_results')!.payload as Array<Record<string, unknown>>;
};

// Entrega as linhas gravadas pelo wizard ao ProtocolGenerator real e devolve o que ele mandaria à IA.
const protocolInput = async (rows: Array<Record<string, unknown>>) => {
  cleanup();
  vi.spyOn(console, 'error').mockImplementation(() => {}); // o teste interrompe generate-protocol de propósito
  h.tables.segmental_test_results = rows;
  render(<ProtocolGenerator assessmentId={ASSESSMENT} onComplete={() => {}} />);
  await waitFor(() => expect(h.invokes.some((i) => i.name === 'generate-protocol')).toBe(true));
  return h.invokes.find((i) => i.name === 'generate-protocol')!.body as { segmentalResults: Array<Record<string, unknown>> };
};

it('F-07: o resultado bilateral quantitativo grava os dois lados, e os dois chegam ao protocolo', async () => {
  await renderWizard();
  fireEvent.click(screen.getByText('enviar foto'));
  typeValues('8', '12');

  screen.getByText('Falha');
  screen.getByText('Passa');

  const rows = await submit();
  expect(rows[0]).toMatchObject({ left_value: 8, right_value: 12, pass_fail_left: false, pass_fail_right: true });

  const body = await protocolInput(rows);
  expect(body.segmentalResults[0]).toMatchObject({ leftValue: 8, rightValue: 12, passFailLeft: false, passFailRight: true });
});

it('F-07: a observação e os dois lados ficam juntos, em qualquer ordem', async () => {
  await renderWizard();
  typeValues('8', '');
  fireEvent.change(screen.getByPlaceholderText('Observações...'), { target: { value: 'observação sintética' } });
  fireEvent.click(screen.getByText('enviar foto'));
  typeValues('8', '12');

  expect((await submit())[0]).toMatchObject({
    notes: 'observação sintética', left_value: 8, right_value: 12, media_urls: ['https://midia.test/foto-sintetica.jpg'],
  });
});

it('passo 0: o segmentar não oferece análise por IA e não a chama', async () => {
  await renderWizard();
  fireEvent.click(screen.getByText('enviar foto'));
  typeValues('8', '12');
  await submit();

  expect(h.analyzeProps.length).toBeGreaterThan(0);
  expect(h.analyzeProps.every((p) => p === undefined)).toBe(true);
  expect(screen.queryByText(/Analisar/i)).toBeNull();
  expect(h.aiCalls).toBe(0);
});

it('passo 0: peitoral menor com 1,5 cm passa e com 4 cm falha', async () => {
  h.test = PEC_MINOR;
  render(<SegmentalTestsWizard assessmentId={ASSESSMENT} onComplete={() => {}} />);
  await screen.findByText(PEC_MINOR.description);
  typeValues('1.5', '4');

  screen.getByText('Passa');
  screen.getByText('Falha');

  const rows = await submit();
  expect(rows[0]).toMatchObject({
    test_name: 'Comprimento do Peitoral Menor', left_value: 1.5, right_value: 4, cutoff_value: 2.5,
    pass_fail_left: true, pass_fail_right: false,
  });
});

it('passo 0: rascunho do peitoral menor com o booleano antigo é regravado certo ao concluir', async () => {
  h.test = PEC_MINOR;
  // Gravado pela regra antiga (≥ 2,5 passa): 1,5 "falha" e 4 "passa"
  h.tables.assessment_drafts = (f: Record<string, unknown>) => (
    f.assessment_id === ASSESSMENT && f.step_type === 'segmental_tests'
      ? {
          draft_data: {
            testResults: {
              pec_minor_length: {
                testId: 'pec_minor_length', testName: 'Comprimento do Peitoral Menor', bodyRegion: 'Ombro',
                leftValue: 1.5, rightValue: 4, passFailLeft: false, passFailRight: true, notes: '', unit: 'cm',
                cutoffValue: 2.5,
              },
            },
          },
          current_step: 1,
        }
      : null
  );
  render(<SegmentalTestsWizard assessmentId={ASSESSMENT} onComplete={() => {}} />);
  await screen.findByDisplayValue('1.5');
  screen.getByText('Passa');
  screen.getByText('Falha');

  const rows = await submit();
  expect(rows[0]).toMatchObject({ left_value: 1.5, right_value: 4, pass_fail_left: true, pass_fail_right: false });
});
