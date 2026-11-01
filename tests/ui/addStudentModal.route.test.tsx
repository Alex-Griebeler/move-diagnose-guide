// @vitest-environment jsdom
// F-08: o cadastro presencial levava para /new-assessment, que não existe (404).
// O teste pega a URL que o modal gera e a abre no App real (tabela de rotas real, páginas stub).
import type { ReactNode } from 'react';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { AddStudentModal } from '@/components/students/AddStudentModal';
import App from '@/App';
import { stubMatchMedia } from './helpers';

const STUDENT_ID = '00000000-0000-0000-0000-000000000002';
const ASSESSMENT_ID = '00000000-0000-0000-0000-000000000001';
const STUDENT_NAME = 'Aluno 50% Sintético';

const h = vi.hoisted(() => ({ navigate: vi.fn() }));

vi.mock('react-router-dom', async (importOriginal) => ({
  ...(await importOriginal<typeof import('react-router-dom')>()),
  useNavigate: () => h.navigate,
}));

vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    functions: {
      invoke: (name: string) => {
        if (name !== 'create-student') throw new Error(`função inesperada: ${name}`);
        return Promise.resolve({
          data: { success: true, studentId: STUDENT_ID, studentName: STUDENT_NAME, assessmentId: ASSESSMENT_ID },
          error: null,
        });
      },
    },
  },
}));

vi.mock('@/hooks/useAuth', () => ({
  AuthProvider: ({ children }: { children: ReactNode }) => children,
  useAuth: () => ({ user: { id: '00000000-0000-0000-0000-000000000003' }, role: 'professional', loading: false }),
}));

vi.mock('sonner', async (importOriginal) => ({
  ...(await importOriginal<typeof import('sonner')>()),
  toast: { success: () => {}, error: () => {}, info: () => {} },
}));

vi.mock('@/pages/Index', async () => (await import('./helpers')).pageStub('início'));
vi.mock('@/pages/Auth', async () => (await import('./helpers')).pageStub('login'));
vi.mock('@/pages/Dashboard', async () => (await import('./helpers')).pageStub('painel'));
vi.mock('@/pages/NewAssessment', async () => (await import('./helpers')).pageStub('nova avaliação'));
vi.mock('@/pages/ContinueAssessment', async () => (await import('./helpers')).pageStub('continuar avaliação'));
vi.mock('@/pages/QuickProtocol', async () => (await import('./helpers')).pageStub('protocolo rápido'));
vi.mock('@/pages/OAuthConsent', async () => (await import('./helpers')).pageStub('consentimento'));
vi.mock('@/pages/NotFound', async () => (await import('./helpers')).pageStub('404'));

beforeEach(() => {
  stubMatchMedia();
  h.navigate.mockReset();
  window.history.pushState({}, '', '/');
});
afterEach(cleanup);

it('o cadastro presencial abre a nova avaliação, com ids e nome intactos', async () => {
  render(<AddStudentModal open onOpenChange={() => {}} />);
  const tab = screen.getByRole('tab', { name: /Cadastro Presencial/ });
  fireEvent.mouseDown(tab);
  fireEvent.click(tab);
  fireEvent.change(await screen.findByLabelText('Nome completo *'), { target: { value: STUDENT_NAME } });
  fireEvent.change(screen.getByLabelText('Email *'), { target: { value: 'aluno@example.invalid' } });
  fireEvent.click(screen.getByRole('button', { name: /Cadastrar e Iniciar Avaliação/ }));

  await waitFor(() => expect(h.navigate).toHaveBeenCalledTimes(1));
  const url = new URL(h.navigate.mock.calls[0][0], 'http://localhost');
  expect(url.pathname).toBe('/assessment/new');
  expect(Object.fromEntries(url.searchParams)).toStrictEqual({
    studentId: STUDENT_ID,
    assessmentId: ASSESSMENT_ID,
    studentName: STUDENT_NAME,
  });
  cleanup();

  // A mesma URL no App real cai na página de nova avaliação, não no 404.
  window.history.pushState({}, '', url.pathname + url.search);
  render(<App />);
  await screen.findByText('página: nova avaliação');
  expect(screen.queryByText('página: 404')).toBeNull();
});
