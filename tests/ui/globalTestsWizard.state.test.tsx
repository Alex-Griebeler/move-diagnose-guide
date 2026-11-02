// @vitest-environment jsdom
// F-02: nos testes globais, a marcação manual não tinha efeito e a evidência da análise se perdia.
// Reais: GlobalTestsWizard, AutoGlobalTest, useWizardPersistence e o ProtocolGenerator lendo as linhas gravadas.
// Falsos: Supabase (tabelas preenchidas pelo teste, escritas registradas, Edge Functions respondidas pelo teste),
// o MediaUploader (dois botões), a chamada da IA (promessa que o teste resolve) e o pipeline clínico
// (qualidade ok, sem pose, fusão com uma compensação e o status que o teste escolhe).
// A IA do protocolo não é chamada: o teste lê o corpo enviado a generate-protocol.
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import type { RecordedWrite } from './supabaseFake';
import { GlobalTestsWizard } from '@/components/global-tests/GlobalTestsWizard';
import { ProtocolGenerator } from '@/components/protocol/ProtocolGenerator';

const ASSESSMENT = '00000000-0000-0000-0000-0000000000a1';
const COMP = 'feet_abduction';
const COMP_LABEL = 'Pés abduzidos (giram para fora)';
const NOTES_PLACEHOLDER = 'Anote detalhes relevantes...';

const h = vi.hoisted(() => ({
  tables: {} as Record<string, unknown>,
  writes: [] as RecordedWrite[],
  invokes: [] as Array<{ name: string; body: unknown }>,
  ai: null as null | { resolve: (r: unknown) => void },
  signedUrl: null as null | { resolve: (r: unknown) => void },
  photoUrl: '',
  fusionStatus: 'ready' as 'ready' | 'indeterminate' | 'blocked_quality',
  holdImage: false,
  imageLoaded: null as null | (() => void),
}));

vi.mock('@/integrations/supabase/client', async () => {
  const { createSupabaseFake } = await import('./supabaseFake');
  return {
    supabase: {
      ...createSupabaseFake(h.tables, h.writes),
      functions: {
        invoke: (name: string, options: { body: unknown }) => {
          h.invokes.push({ name, body: options.body });
          if (name === 'get-signed-url') return new Promise((resolve) => { h.signedUrl = { resolve }; });
          return Promise.resolve({ data: null, error: new Error('parada do teste') });
        },
      },
    },
  };
});

vi.mock('@/components/media/MediaUploader', () => ({
  MediaUploader: ({ onUploadComplete, onAnalyze }: { onUploadComplete: (u: { photoUrl?: string }) => void; onAnalyze?: () => void }) => (
    <div>
      <button onClick={() => onUploadComplete({ photoUrl: h.photoUrl })}>enviar foto</button>
      <button onClick={() => onAnalyze?.()}>analisar</button>
    </div>
  ),
}));

vi.mock('@/hooks/useMovementAnalysis', () => ({
  useMovementAnalysis: () => ({
    isAnalyzing: false,
    analyzeMovement: () => new Promise((resolve) => { h.ai = { resolve }; }),
  }),
}));

vi.mock('@/lib/clinical/mediaQuality', () => ({
  assessMediaQuality: () => ({
    passed: h.fusionStatus !== 'blocked_quality', score: 0.9, issues: h.fusionStatus === 'blocked_quality' ? ['low_brightness'] : [],
    metrics: { brightness: 128, contrast: 50, sharpness: 30, width: 640, height: 480 },
  }),
}));

vi.mock('@/lib/clinical/poseBiomechanics', () => ({
  analyzePose: async () => null,
  analyzeVideoTemporal: async () => null,
}));

vi.mock('@/lib/clinical/biomechanicalScoring', () => ({
  fuseEvidence: () => ({
    status: h.fusionStatus,
    // Sempre com a compensação: no caso indeterminado, o que impede a aplicação é o status
    autoApplyCompensations: [COMP],
    indeterminateReasons: h.fusionStatus === 'ready' ? [] : ['motivo sintético'],
    evidenceMetadata: {
      status: h.fusionStatus, evidenceVersion: 'sintetica', thresholdSnapshot: {}, qualityScore: 0.9, qualityPassed: true,
      qualityIssues: h.fusionStatus === 'blocked_quality' ? ['low_brightness'] : [], aiConfidence: 0.8, poseConfidence: 0, biomechanicalScore: 0, detectedCompensations: [COMP],
      autoAppliedCompensations: [COMP], objectiveAgreementScore: 0, objectiveFindings: [], objectiveMetrics: {},
      indeterminateReasons: h.fusionStatus === 'ready' ? [] : ['motivo sintético'],
      computedAt: '2026-01-01T00:00:00.000Z', predictedCompensations: [COMP],
    },
  }),
}));

beforeEach(() => {
  localStorage.clear();
  for (const table of Object.keys(h.tables)) delete h.tables[table];
  h.writes.length = 0;
  h.invokes.length = 0;
  h.ai = null;
  h.signedUrl = null;
  h.photoUrl = 'https://midia.test/foto-sintetica.jpg';
  h.fusionStatus = 'ready';
  h.holdImage = false;
  h.imageLoaded = null;
  // O jsdom não carrega imagens; o portão de qualidade só precisa do onload. Com holdImage, o teste decide quando.
  vi.stubGlobal('Image', class {
    onload: null | (() => void) = null;
    onerror: null | (() => void) = null;
    crossOrigin = '';
    set src(_: string) {
      if (h.holdImage) h.imageLoaded = () => this.onload?.();
      else queueMicrotask(() => this.onload?.());
    }
  });
});
afterEach(() => { cleanup(); vi.unstubAllGlobals(); vi.restoreAllMocks(); });

type ViewRow = { compensations: string[]; evidenceMetadata?: Record<string, unknown> };
type GlobalRow = { test_name: string; anterior_view: ViewRow; notes: string | null; media_urls: string[] };

const renderWizard = async () => {
  render(
    <MemoryRouter>
      <GlobalTestsWizard assessmentId={ASSESSMENT} onComplete={() => {}} />
    </MemoryRouter>,
  );
  await screen.findByText(COMP_LABEL);
};

const submit = async () => {
  fireEvent.click(screen.getByRole('button', { name: /Próximo/ }));
  fireEvent.click(screen.getByRole('button', { name: /Próximo/ }));
  fireEvent.click(screen.getByRole('button', { name: /Próximo/ }));
  fireEvent.click(screen.getByRole('button', { name: /Concluir Testes Globais/ }));
  await waitFor(() => expect(h.writes.filter((w) => w.table === 'global_test_results')).toHaveLength(3));
  return h.writes.filter((w) => w.table === 'global_test_results').map((w) => w.payload as GlobalRow);
};

const ohsRow = (rows: GlobalRow[]) => rows.find((r) => r.test_name === 'ohs')!;

// Entrega as linhas gravadas pelo wizard ao ProtocolGenerator real e devolve o que ele mandaria à IA.
const protocolInput = async (rows: GlobalRow[]) => {
  cleanup();
  vi.spyOn(console, 'error').mockImplementation(() => {}); // o teste interrompe generate-protocol de propósito
  h.tables.global_test_results = rows;
  render(<ProtocolGenerator assessmentId={ASSESSMENT} onComplete={() => {}} />);
  await waitFor(() => expect(h.invokes.some((i) => i.name === 'generate-protocol')).toBe(true));
  return h.invokes.find((i) => i.name === 'generate-protocol')!.body as { compensations: Array<Record<string, unknown>> };
};

const startAnalysis = async () => {
  fireEvent.click(screen.getByText('enviar foto'));
  fireEvent.click(screen.getByText('analisar'));
  await waitFor(() => expect(h.ai).not.toBeNull());
};

const finishAnalysis = async () => {
  await act(async () => { h.ai!.resolve({ detected_compensations: [COMP], confidence: 0.8 }); });
};

const typeNotes = () =>
  fireEvent.change(screen.getByPlaceholderText(NOTES_PLACEHOLDER), { target: { value: 'observação sintética' } });

it('F-02: marcar e desmarcar uma compensação à mão funciona, é gravado e chega ao protocolo', async () => {
  await renderWizard();

  fireEvent.click(screen.getByText(COMP_LABEL));
  screen.getByText('1 selecionadas');
  fireEvent.click(screen.getByText(COMP_LABEL));
  expect(screen.queryByText('1 selecionadas')).toBeNull();
  fireEvent.click(screen.getByText(COMP_LABEL));
  screen.getByText('1 selecionadas');

  const rows = await submit();
  expect(ohsRow(rows).anterior_view.compensations).toEqual([COMP]);
  expect(ohsRow(rows).anterior_view.evidenceMetadata).toMatchObject({ status: 'indeterminate', adjudicatedCompensations: [COMP] });

  // Regra existente: vista só com marcação manual fica "indeterminate" e entra com metade do peso
  const body = await protocolInput(rows);
  expect(body.compensations).toContainEqual(expect.objectContaining({ id: COMP, testName: 'ohs', view: 'Vista Anterior', weightFactor: 0.5 }));
});

it('F-02: a análise "pronta" grava a compensação e a evidência, e as duas chegam ao protocolo', async () => {
  await renderWizard();
  await startAnalysis();
  await finishAnalysis();

  await screen.findByText('Qualidade: 90%');
  screen.getByText('1 selecionadas');

  const rows = await submit();
  expect(ohsRow(rows).anterior_view.compensations).toEqual([COMP]);
  expect(ohsRow(rows).anterior_view.evidenceMetadata).toMatchObject({ status: 'ready', qualityScore: 0.9, aiConfidence: 0.8 });

  const body = await protocolInput(rows);
  expect(body.compensations).toContainEqual(expect.objectContaining({ id: COMP, testName: 'ohs', view: 'Vista Anterior', weightFactor: 1 }));
});

it('F-02: o que muda durante a análise não é sobrescrito quando ela termina', async () => {
  await renderWizard();
  await startAnalysis();

  typeNotes();
  await finishAnalysis();

  await screen.findByText('Qualidade: 90%');
  expect(screen.getByPlaceholderText(NOTES_PLACEHOLDER)).toHaveProperty('value', 'observação sintética');

  const row = ohsRow(await submit());
  expect(row.notes).toBe('observação sintética');
  expect(row.anterior_view.compensations).toEqual([COMP]);
});

it('F-02: a análise "indeterminada" grava a evidência e não aplica compensações, como antes', async () => {
  h.fusionStatus = 'indeterminate';
  await renderWizard();
  await startAnalysis();
  await finishAnalysis();

  await screen.findByText('motivo sintético');
  expect(screen.queryByText('1 selecionadas')).toBeNull();

  const row = ohsRow(await submit());
  expect(row.anterior_view.compensations).toEqual([]);
  expect(row.anterior_view.evidenceMetadata).toMatchObject({ status: 'indeterminate', indeterminateReasons: ['motivo sintético'] });
});

it('F-02: foto expirada (404) durante a análise sai da vista sem apagar o que mudou enquanto isso', async () => {
  h.photoUrl = 'https://midia.test/storage/v1/object/sign/assessment-media/sintetico/foto.jpg?token=sintetico';
  await renderWizard();
  fireEvent.click(screen.getByText('enviar foto'));
  fireEvent.click(screen.getByText('analisar'));
  await waitFor(() => expect(h.signedUrl).not.toBeNull());

  typeNotes();
  await act(async () => { h.signedUrl!.resolve({ data: { error: 'não encontrado', code: 404 }, error: null }); });

  expect(h.ai).toBeNull();
  const row = ohsRow(await submit());
  expect(row.notes).toBe('observação sintética');
  expect(row.media_urls).toEqual([]);
});

it('F-02: qualidade bloqueada grava só a evidência, sem apagar o que mudou enquanto a imagem carregava', async () => {
  h.fusionStatus = 'blocked_quality';
  h.holdImage = true;
  await renderWizard();
  fireEvent.click(screen.getByText(COMP_LABEL));
  fireEvent.click(screen.getByText('enviar foto'));
  fireEvent.click(screen.getByText('analisar'));
  await waitFor(() => expect(h.imageLoaded).not.toBeNull());

  typeNotes();
  await act(async () => { h.imageLoaded!(); });

  await screen.findByText('Qualidade insuficiente para análise');
  expect(h.ai).toBeNull();
  const row = ohsRow(await submit());
  expect(row.notes).toBe('observação sintética');
  expect(row.anterior_view.compensations).toEqual([COMP]);
  expect(row.anterior_view.evidenceMetadata).toMatchObject({ status: 'blocked_quality', qualityIssues: ['low_brightness'] });
});
