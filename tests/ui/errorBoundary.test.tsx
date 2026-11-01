// @vitest-environment jsdom
// ErrorBoundary: um erro de render mostra um aviso em vez de tela branca (antes não havia nenhum).
import { useState, type ReactNode } from 'react';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { ErrorBoundary } from '@/components/ErrorBoundary';
import ContinueAssessment from '@/pages/ContinueAssessment';
import NewAssessment from '@/pages/NewAssessment';
import App from '@/App';
import { stubMatchMedia } from './helpers';

const ASSESSMENT_ID = '00000000-0000-0000-0000-000000000001';

const h = vi.hoisted(() => ({ tables: {} as Record<string, unknown> }));

vi.mock('@/integrations/supabase/client', async () => {
  const { createSupabaseFake } = await import('./supabaseFake');
  return { supabase: { from: (table: string) => createSupabaseFake(h.tables).from(table) } };
});

vi.mock('@/hooks/useAuth', () => ({
  AuthProvider: ({ children }: { children: ReactNode }) => children,
  useAuth: () => ({ user: { id: '00000000-0000-0000-0000-000000000003' }, role: 'professional', loading: false }),
}));

vi.mock('@/components/anamnesis/AnamnesisWizard', () => ({ AnamnesisWizard: () => <div>anamnese ok</div> }));
vi.mock('@/components/global-tests/GlobalTestsWizard', () => ({
  GlobalTestsWizard: () => {
    throw new Error('falha sintética nos testes globais');
  },
}));
vi.mock('@/components/segmental-tests/SegmentalTestsWizard', () => ({ SegmentalTestsWizard: () => <div>segmentados</div> }));
vi.mock('@/components/protocol/ProtocolGenerator', () => ({ ProtocolGenerator: () => <div>protocolo</div> }));

vi.mock('@/pages/Dashboard', () => ({
  default: () => {
    throw new Error('falha sintética no painel');
  },
}));
vi.mock('@/pages/Index', async () => (await import('./helpers')).pageStub('início'));
vi.mock('@/pages/Auth', async () => (await import('./helpers')).pageStub('login'));
vi.mock('@/pages/QuickProtocol', async () => (await import('./helpers')).pageStub('protocolo rápido'));
vi.mock('@/pages/OAuthConsent', async () => (await import('./helpers')).pageStub('consentimento'));
vi.mock('@/pages/NotFound', async () => (await import('./helpers')).pageStub('404'));

let consoleError: ReturnType<typeof vi.spyOn>;

beforeEach(() => {
  h.tables = {};
  localStorage.clear();
  // Nenhuma classe de tema residual de outro caso pode mascarar o teste do tema.
  document.documentElement.className = '';
  document.documentElement.style.colorScheme = '';
  // O React e o logger escrevem o erro no console; silenciado, mas inspecionado.
  consoleError = vi.spyOn(console, 'error').mockImplementation(() => {});
  stubMatchMedia();
});
afterEach(() => {
  cleanup();
  consoleError.mockRestore();
});

const loggedScope = (scope: string) =>
  consoleError.mock.calls.some(([first]) => String(first).includes(`Erro de renderização em ${scope}`));

it('mostra o aviso, registra o escopo e "Tentar novamente" remonta os filhos', () => {
  let shouldThrow = true;
  function Flaky() {
    if (shouldThrow) throw new Error('falha sintética');
    return <div>conteúdo ok</div>;
  }
  render(
    <ErrorBoundary scope="unidade" variant="step">
      <Flaky />
    </ErrorBoundary>,
  );
  screen.getByText('Não foi possível exibir esta etapa.');
  expect(loggedScope('unidade')).toBe(true);
  expect(screen.getByRole('link', { name: 'Voltar ao painel' }).getAttribute('href')).toBe('/dashboard');

  shouldThrow = false;
  fireEvent.click(screen.getByRole('button', { name: 'Tentar novamente' }));
  screen.getByText('conteúdo ok');
});

// As duas páginas de avaliação, abertas na etapa de testes globais (cujo stub lança).
const pages = {
  ContinueAssessment: () => {
    h.tables = {
      assessments: { id: ASSESSMENT_ID, status: 'in_progress' },
      anamnesis_responses: { id: '00000000-0000-0000-0000-000000000004' },
    };
    render(
      <MemoryRouter initialEntries={[`/assessment/continue?assessmentId=${ASSESSMENT_ID}&studentName=Aluno%20Sint%C3%A9tico`]}>
        <Routes>
          <Route path="/assessment/continue" element={<ContinueAssessment />} />
        </Routes>
      </MemoryRouter>,
    );
  },
  NewAssessment: () => {
    localStorage.setItem(`assessment_step_${ASSESSMENT_ID}`, 'global-tests');
    render(
      <MemoryRouter
        initialEntries={[
          `/assessment/new?studentId=00000000-0000-0000-0000-000000000002&assessmentId=${ASSESSMENT_ID}&studentName=Aluno%20Sint%C3%A9tico`,
        ]}
      >
        <Routes>
          <Route path="/assessment/new" element={<NewAssessment />} />
        </Routes>
      </MemoryRouter>,
    );
  },
};

it.each(Object.entries(pages))('%s: erro numa etapa mostra o aviso só na etapa; a barra continua', async (_page, renderAtGlobalTests) => {
  renderAtGlobalTests();
  await screen.findByText('Não foi possível exibir esta etapa.');
  expect(loggedScope('assessment:global-tests')).toBe(true);
  screen.getByText('Aluno Sintético');
  screen.getByRole('button', { name: 'Anamnese' });
});

it.each(Object.entries(pages))('%s: trocar de etapa zera o aviso (key por etapa)', async (_page, renderAtGlobalTests) => {
  renderAtGlobalTests();
  await screen.findByText('Não foi possível exibir esta etapa.');
  fireEvent.click(screen.getByRole('button', { name: 'Anamnese' }));
  screen.getByText('anamnese ok');
  expect(screen.queryByText('Não foi possível exibir esta etapa.')).toBeNull();
});

it('erro numa página: aviso do App, ainda com o tema aplicado', async () => {
  window.history.pushState({}, '', '/dashboard');
  render(<App />);
  await screen.findByText('Algo deu errado nesta página.');
  expect(loggedScope('app')).toBe(true);
  // O boundary fica dentro do ThemeProvider: o provider monta e aplica o tema mesmo com a página quebrada.
  expect(document.documentElement.classList.contains('dark')).toBe(true);
});
