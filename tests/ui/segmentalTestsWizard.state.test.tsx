// @vitest-environment jsdom
// F-07: a análise bilateral quantitativa perdia o lado esquerdo.
// Reais: SegmentalTestsWizard, AutoSegmentalTest, useWizardPersistence e o ProtocolGenerator lendo a linha gravada.
// Falsos: Supabase (tabelas preenchidas pelo teste, escritas registradas, Edge Functions respondidas pelo teste),
// o MediaUploader (dois botões), a chamada da IA (promessa que o teste resolve; como no hook real, chama o
// onAnalysisComplete da render em que a análise começou) e a priorização (um teste quantitativo bilateral, corte 10).
// A IA do protocolo não é chamada: o teste lê o corpo enviado a generate-protocol.
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import type { RecordedWrite } from './supabaseFake';
import { SegmentalTestsWizard } from '@/components/segmental-tests/SegmentalTestsWizard';
import { ProtocolGenerator } from '@/components/protocol/ProtocolGenerator';

const ASSESSMENT = '00000000-0000-0000-0000-0000000000b1';

const h = vi.hoisted(() => ({
  tables: {} as Record<string, unknown>,
  writes: [] as RecordedWrite[],
  invokes: [] as Array<{ name: string; body: unknown }>,
  ai: null as null | { resolve: (r: unknown) => void },
}));

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
    prioritizedTests: [{
      test: {
        id: 'teste_bilateral', name: 'Teste bilateral sintético', bodyRegion: 'regiao', description: '',
        unit: 'cm', cutoffValue: 10, isBilateral: true, instructions: '', resultType: 'quantitative' as const,
      },
    }],
    additionalTests: [],
    contextosAplicados: [],
    totalCausasAnalisadas: 0,
    paretoApplied: false,
  }),
}));

vi.mock('@/components/media/MediaUploader', () => ({
  MediaUploader: ({ onUploadComplete, onAnalyze }: { onUploadComplete: (u: { photoUrl?: string }) => void; onAnalyze?: () => void }) => (
    <div>
      <button onClick={() => onUploadComplete({ photoUrl: 'https://midia.test/foto-sintetica.jpg' })}>enviar foto</button>
      <button onClick={() => onAnalyze?.()}>analisar</button>
    </div>
  ),
}));

vi.mock('@/hooks/useMovementAnalysis', () => ({
  useMovementAnalysis: (options: { onAnalysisComplete?: (r: unknown) => void }) => ({
    isAnalyzing: false,
    analyzeMovement: async () => {
      const result = await new Promise((resolve) => { h.ai = { resolve }; });
      options.onAnalysisComplete?.(result);
      return result;
    },
  }),
}));

beforeEach(() => {
  localStorage.clear();
  for (const table of Object.keys(h.tables)) delete h.tables[table];
  h.tables.global_test_results = [{ anterior_view: { compensations: ['compensacao_sintetica'] } }];
  h.writes.length = 0;
  h.invokes.length = 0;
  h.ai = null;
});
afterEach(() => { cleanup(); vi.restoreAllMocks(); });

const renderWizard = async () => {
  render(<SegmentalTestsWizard assessmentId={ASSESSMENT} onComplete={() => {}} />);
  await screen.findByText('enviar foto');
};

const startAnalysis = async () => {
  fireEvent.click(screen.getByText('enviar foto'));
  fireEvent.click(screen.getByText('analisar'));
  await waitFor(() => expect(h.ai).not.toBeNull());
};

const finishAnalysis = async () => {
  await act(async () => { h.ai!.resolve({ left_value: 8, right_value: 12, confidence: 0.9 }); });
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

it('F-07: a análise bilateral quantitativa grava os dois lados, e os dois chegam ao protocolo', async () => {
  await renderWizard();
  await startAnalysis();
  await finishAnalysis();

  await screen.findByDisplayValue('8');
  screen.getByDisplayValue('12');

  const rows = await submit();
  expect(rows[0]).toMatchObject({ left_value: 8, right_value: 12, pass_fail_left: false, pass_fail_right: true });

  const body = await protocolInput(rows);
  expect(body.segmentalResults[0]).toMatchObject({ leftValue: 8, rightValue: 12, passFailLeft: false, passFailRight: true });
});

it('F-07: a observação digitada durante a análise não se perde quando ela termina', async () => {
  await renderWizard();
  await startAnalysis();

  fireEvent.change(screen.getByPlaceholderText('Observações...'), { target: { value: 'observação sintética' } });
  await finishAnalysis();
  await screen.findByDisplayValue('12');

  expect((await submit())[0]).toMatchObject({ notes: 'observação sintética', left_value: 8, right_value: 12 });
});
