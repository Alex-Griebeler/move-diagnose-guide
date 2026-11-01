// @vitest-environment jsdom
// F-08 (complemento): searchParams.get já decodifica o nome; decodificar de novo lançava URIError com "%".
import type { ReactNode } from 'react';
import { afterEach, beforeEach, it, vi } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import NewAssessment from '@/pages/NewAssessment';
import ContinueAssessment from '@/pages/ContinueAssessment';

const ASSESSMENT_ID = '00000000-0000-0000-0000-000000000001';
const STUDENT_ID = '00000000-0000-0000-0000-000000000002';

const h = vi.hoisted(() => ({ tables: {} as Record<string, unknown> }));

vi.mock('@/integrations/supabase/client', async () => {
  const { createSupabaseFake } = await import('./supabaseFake');
  return { supabase: { from: (table: string) => createSupabaseFake(h.tables).from(table) } };
});

vi.mock('@/hooks/useAuth', () => ({
  AuthProvider: ({ children }: { children: ReactNode }) => children,
  useAuth: () => ({ user: { id: '00000000-0000-0000-0000-000000000003' }, role: 'professional', loading: false }),
}));

vi.mock('@/components/anamnesis/AnamnesisWizard', () => ({ AnamnesisWizard: () => <div>anamnese (stub)</div> }));
vi.mock('@/components/global-tests/GlobalTestsWizard', () => ({ GlobalTestsWizard: () => <div>globais (stub)</div> }));
vi.mock('@/components/segmental-tests/SegmentalTestsWizard', () => ({ SegmentalTestsWizard: () => <div>segmentados (stub)</div> }));
vi.mock('@/components/protocol/ProtocolGenerator', () => ({ ProtocolGenerator: () => <div>protocolo (stub)</div> }));

beforeEach(() => {
  h.tables = {};
  localStorage.clear();
});
afterEach(cleanup);

function renderAt(url: string) {
  render(
    <MemoryRouter initialEntries={[url]}>
      <Routes>
        <Route path="/assessment/new" element={<NewAssessment />} />
        <Route path="/assessment/continue" element={<ContinueAssessment />} />
        <Route path="/dashboard" element={<div>painel</div>} />
      </Routes>
    </MemoryRouter>,
  );
}

it('NewAssessment: nome com "%" vindo do cadastro presencial', async () => {
  renderAt(`/assessment/new?studentId=${STUDENT_ID}&assessmentId=${ASSESSMENT_ID}&studentName=${encodeURIComponent('Aluno 50%')}`);
  await screen.findByText('anamnese (stub)');
  screen.getByText('Aluno 50%');
});

it('ContinueAssessment: nome com "%" vindo do painel', async () => {
  h.tables = { assessments: { id: ASSESSMENT_ID, status: 'in_progress' } };
  renderAt(`/assessment/continue?assessmentId=${ASSESSMENT_ID}&studentName=${encodeURIComponent('Aluno 50%')}`);
  await screen.findByText('anamnese (stub)');
  screen.getByText('Aluno 50%');
});
