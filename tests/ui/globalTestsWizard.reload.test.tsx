// @vitest-environment jsdom
// F-04, testes globais: depois do envio o rascunho é apagado; ao voltar, o wizard abria vazio e "Concluir"
// regravava as três linhas com compensações vazias. Agora ele carrega o que foi salvo, e reenviar regrava igual.
// Reais: GlobalTestsWizard, AutoGlobalTest e useWizardPersistence. Falsos: Supabase (tabelas por filtro, escritas
// registradas) e o MediaUploader (mostra a foto que recebe). Dados sintéticos.
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import type { RecordedWrite } from './supabaseFake';
import { GlobalTestsWizard } from '@/components/global-tests/GlobalTestsWizard';

const ASSESSMENT = '00000000-0000-0000-0000-0000000000e1';
const COMP = 'feet_abduction';
const NOTES_PLACEHOLDER = 'Anote detalhes relevantes...';
const PHOTO = `https://projeto.test/storage/v1/object/sign/assessment-media/${ASSESSMENT}/ohs_anterior_anterior_photo_1700000000000.jpg?token=sintetico`;
const SLS_VIDEO = `${ASSESSMENT}/sls_left_lateral_left_lateral_video_1700000000001.mp4`;
const UNKNOWN_MEDIA = `${ASSESSMENT}/arquivo_antigo_sintetico.jpg`;

const h = vi.hoisted(() => ({
  tables: {} as Record<string, unknown>,
  writes: [] as RecordedWrite[],
  toasts: [] as Array<{ title?: string }>,
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

vi.mock('@/hooks/use-toast', () => ({
  useToast: () => ({ toast: (t: { title?: string }) => { h.toasts.push(t); } }),
}));

vi.mock('@/components/media/MediaUploader', () => ({
  MediaUploader: ({ initialPhotoUrl }: { initialPhotoUrl?: string }) => <div>foto: {initialPhotoUrl ?? 'nenhuma'}</div>,
}));

const EVIDENCE = {
  status: 'ready', evidenceVersion: 'sintetica', thresholdSnapshot: {}, qualityScore: 0.9, qualityPassed: true,
  qualityIssues: [], aiConfidence: 0.8, poseConfidence: 0, biomechanicalScore: 0, detectedCompensations: [COMP],
  autoAppliedCompensations: [COMP], objectiveAgreementScore: 0, objectiveFindings: [], objectiveMetrics: {},
  indeterminateReasons: [], computedAt: '2026-01-01T00:00:00.000Z', predictedCompensations: [COMP],
};

// Linhas como o envio as grava
const SAVED = [
  {
    assessment_id: ASSESSMENT, test_name: 'ohs',
    anterior_view: { compensations: [COMP], evidenceMetadata: EVIDENCE },
    lateral_view: { compensations: [] },
    posterior_view: { compensations: ['compensacao_posterior_sintetica'] },
    notes: 'nota OHS sintética',
    media_urls: [PHOTO],
  },
  {
    assessment_id: ASSESSMENT, test_name: 'sls',
    left_side: {
      compensations: ['compensacao_sls_sintetica'], anterior: [], lateral: ['compensacao_sls_sintetica'], posterior: [],
      evidenceMetadata: { left_lateral: EVIDENCE },
    },
    right_side: { compensations: [], anterior: [], lateral: [], posterior: [] },
    notes: null,
    media_urls: [SLS_VIDEO],
  },
  {
    assessment_id: ASSESSMENT, test_name: 'pushup',
    lateral_view: { compensations: [] },
    posterior_view: { compensations: ['compensacao_pushup_sintetica'] },
    notes: 'nota push-up sintética',
    media_urls: [UNKNOWN_MEDIA],
  },
];

beforeEach(() => {
  localStorage.clear();
  for (const table of Object.keys(h.tables)) delete h.tables[table];
  h.writes.length = 0;
  h.toasts.length = 0;
  h.tables.global_test_results = (f: Record<string, unknown>) => (f.assessment_id === ASSESSMENT ? SAVED : []);
});

afterEach(() => { cleanup(); vi.restoreAllMocks(); });

const renderWizard = () => render(
  <MemoryRouter>
    <GlobalTestsWizard assessmentId={ASSESSMENT} onComplete={() => {}} />
  </MemoryRouter>,
);

it('F-04: sem rascunho, os globais já enviados voltam com compensações, observação e foto salvas', async () => {
  renderWizard();
  await screen.findByText('1 selecionadas');
  expect(screen.getByPlaceholderText(NOTES_PLACEHOLDER)).toHaveProperty('value', 'nota OHS sintética');
  screen.getByText(`foto: ${PHOTO}`);
});

it('F-04: "Concluir" depois de voltar regrava as três linhas iguais, sem esvaziar nada', async () => {
  renderWizard();
  // Conclui assim que a tela abre: o que estava salvo tem de estar nela desde o início
  await screen.findByPlaceholderText(NOTES_PLACEHOLDER);
  fireEvent.click(screen.getByRole('button', { name: /Próximo/ }));
  fireEvent.click(screen.getByRole('button', { name: /Próximo/ }));
  fireEvent.click(screen.getByRole('button', { name: /Próximo/ }));
  fireEvent.click(screen.getByRole('button', { name: /Concluir Testes Globais/ }));

  await waitFor(() => expect(h.writes.filter((w) => w.table === 'global_test_results')).toHaveLength(3));
  const written = h.writes.filter((w) => w.table === 'global_test_results');
  for (const saved of SAVED) {
    const row = written.find((w) => (w.payload as { test_name: string }).test_name === saved.test_name)!;
    expect(row.op).toBe('upsert');
    // O JSON gravado descarta chaves sem valor, como o banco faria
    expect(JSON.parse(JSON.stringify(row.payload))).toMatchObject(saved);
  }
});

it('F-04: se os globais salvos não puderem ser lidos, "Concluir" não grava por cima deles', async () => {
  h.tables.global_test_results = () => { throw new Error('falha sintética de leitura'); };
  renderWizard();
  await screen.findByPlaceholderText(NOTES_PLACEHOLDER);
  fireEvent.click(screen.getByRole('button', { name: /Próximo/ }));
  fireEvent.click(screen.getByRole('button', { name: /Próximo/ }));
  fireEvent.click(screen.getByRole('button', { name: /Próximo/ }));
  fireEvent.click(screen.getByRole('button', { name: /Concluir Testes Globais/ }));

  await waitFor(() => expect(h.toasts.map((t) => t.title)).toContain('Dados salvos não carregados'));
  expect(h.writes.filter((w) => w.table !== 'assessment_drafts')).toHaveLength(0);
});
