// @vitest-environment jsdom
// E8 (passo 0): no protocolo rápido de joelho (V2), a IA que falhava ou não apontava nada levava a "Nenhum déficit
// significativo… nos testes" sem teste nenhum. Agora a falha e a resposta vazia levam aos testes manuais.
// Reais: QuickProtocolWizardV2, a captura, a tela do resultado da IA e o fluxo manual. Falsos: Supabase (sessão
// criada), o toast (registra o título), o MediaUploader (um botão por vista) e a IA (resposta escolhida por vista;
// sem resposta, devolve null, como o hook real quando a chamada falha). Dados sintéticos.
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { QuickProtocolWizardV2 } from '@/components/quick-protocol/QuickProtocolWizardV2';
import { QuickProtocolMovementCapture } from '@/components/quick-protocol/QuickProtocolMovementCapture';

const VIEWS = ['anterior', 'lateral', 'posterior'] as const;
const FAILED = 'A análise automática falhou. Siga pelos testes.';
const FIRST_MANUAL_TEST = 'Wall Test';

const h = vi.hoisted(() => ({
  responses: {} as Record<string, unknown>,
  calls: [] as string[],
  toasts: [] as string[],
}));

vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    auth: { getUser: async () => ({ data: { user: { id: 'profissional-sintetico' } } }) },
    from: () => ({
      insert: () => ({ select: () => ({ single: async () => ({ data: { id: 'sessao-sintetica' }, error: null }) }) }),
      update: () => ({ eq: async () => ({ data: null, error: null }) }),
    }),
  },
}));

vi.mock('@/hooks/use-toast', () => ({
  useToast: () => ({ toast: ({ title }: { title?: string }) => { h.toasts.push(String(title)); } }),
}));

vi.mock('@/components/media/MediaUploader', () => ({
  MediaUploader: ({ viewType, onUploadComplete }: { viewType?: string; onUploadComplete: (u: { photoUrl?: string }) => void }) => (
    <button onClick={() => onUploadComplete({ photoUrl: `foto-sintetica-${viewType}` })}>{`enviar ${viewType}`}</button>
  ),
}));

vi.mock('@/hooks/useMovementAnalysis', () => ({
  useMovementAnalysis: () => ({
    isAnalyzing: false,
    analyzeMovement: async (params: { viewType: string }) => {
      h.calls.push(params.viewType);
      const response = h.responses[params.viewType];
      if (response instanceof Error) throw response;
      return response ?? null;
    },
  }),
}));

beforeEach(() => {
  h.responses = {};
  h.calls = [];
  h.toasts = [];
  // A captura passa à vista seguinte depois de 500 ms; o teste avança esse tempo em vez de esperá-lo
  vi.useFakeTimers({ shouldAdvanceTime: true });
});
afterEach(() => { cleanup(); vi.useRealTimers(); });

const captureAllAndAnalyze = async () => {
  for (const view of VIEWS) {
    fireEvent.click(await screen.findByText(`enviar ${view}`));
    await act(async () => { await vi.advanceTimersByTimeAsync(500); });
  }
  fireEvent.click(await screen.findByText('Analisar'));
};

const startWizard = async () => {
  render(
    <MemoryRouter>
      <QuickProtocolWizardV2 studentId="aluno-sintetico" protocolType="knee_pain" />
    </MemoryRouter>,
  );
  fireEvent.click(screen.getByText('Iniciar Protocolo Rápido'));
  fireEvent.click(await screen.findByText('Esquerdo'));
  await captureAllAndAnalyze();
};

const answerUpTo = (failedIndex: number) => {
  VIEWS.forEach((view, i) => {
    if (i < failedIndex) h.responses[view] = { detected_compensations: ['knee_valgus'], confidence: 0.9 };
  });
};

for (const [index, view] of VIEWS.entries()) {
  it(`a IA falha na vista ${view}: aviso, um onSkip, sem onAnalysisComplete, e as vistas seguintes não são chamadas`, async () => {
    answerUpTo(index);
    const onSkip = vi.fn();
    const onAnalysisComplete = vi.fn();
    render(<QuickProtocolMovementCapture assessmentId="sessao-sintetica" affectedSide="left" onSkip={onSkip} onAnalysisComplete={onAnalysisComplete} />);
    await captureAllAndAnalyze();

    await waitFor(() => expect(onSkip).toHaveBeenCalledTimes(1));
    expect(onAnalysisComplete).not.toHaveBeenCalled();
    expect(h.toasts).toEqual([FAILED]);
    expect(h.calls).toEqual(VIEWS.slice(0, index + 1));
  });

  it(`a IA falha na vista ${view}: o protocolo vai ao primeiro teste manual, sem "Análise Concluída"`, async () => {
    answerUpTo(index);
    await startWizard();

    await screen.findByText(FIRST_MANUAL_TEST);
    expect(screen.queryByText('Análise Concluída')).toBeNull();
    expect(screen.queryByText(/Nenhum déficit significativo/)).toBeNull();
    expect(h.toasts).toEqual([FAILED]);
    expect(h.calls).toEqual(VIEWS.slice(0, index + 1));
  });
}

it('uma exceção na análise segue o mesmo caminho', async () => {
  h.responses.anterior = new Error('falha sintética');
  vi.spyOn(console, 'error').mockImplementation(() => {});
  const onSkip = vi.fn();
  const onAnalysisComplete = vi.fn();
  render(<QuickProtocolMovementCapture assessmentId="sessao-sintetica" affectedSide="left" onSkip={onSkip} onAnalysisComplete={onAnalysisComplete} />);
  await captureAllAndAnalyze();

  await waitFor(() => expect(onSkip).toHaveBeenCalledTimes(1));
  expect(onAnalysisComplete).not.toHaveBeenCalled();
  expect(h.toasts).toEqual([FAILED]);
  vi.restoreAllMocks();
});

it('resposta válida sem compensações: o texto pede os testes, e "Continuar" vai ao primeiro teste manual', async () => {
  for (const view of VIEWS) h.responses[view] = { detected_compensations: [], confidence: 0.9 };
  await startWizard();

  await screen.findByText('A análise não sugeriu compensações.');
  screen.getByText('Faça os testes para concluir.');
  screen.getByText('Confiança: 90%');
  expect(screen.queryByText(/O padrão de movimento está adequado/)).toBeNull();
  expect(screen.queryByText(/minutos para concluir os testes/)).toBeNull();

  fireEvent.click(screen.getByText('Continuar'));
  await screen.findByText(FIRST_MANUAL_TEST);
  expect(screen.queryByText(/Nenhum déficit significativo/)).toBeNull();
  expect(h.toasts).toEqual([]);
});

it('resposta válida sem confiança: a confiança mostrada é 0%, não 70%', async () => {
  h.responses.anterior = { detected_compensations: [], confidence: 0 };
  h.responses.lateral = { detected_compensations: [] };
  h.responses.posterior = { confidence: 0 };
  await startWizard();

  expect((await screen.findByText(/^Confiança:/)).textContent).toBe('Confiança: 0%');
  screen.getByText('A análise não sugeriu compensações.');
  fireEvent.click(screen.getByText('Continuar'));
  await screen.findByText(FIRST_MANUAL_TEST);
});

it('resposta com compensações: testes confirmatórios, como antes', async () => {
  for (const view of VIEWS) h.responses[view] = { detected_compensations: ['knee_valgus'], confidence: 0.8 };
  await startWizard();

  await screen.findByText('Compensações Detectadas');
  screen.getByText('Confiança: 80%');
  fireEvent.click(screen.getByText('Iniciar Testes'));
  await screen.findByText('Confirmando hipóteses');
  expect(h.toasts).toEqual([]);
});
