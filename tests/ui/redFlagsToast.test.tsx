// @vitest-environment jsdom
// Etapa 5a (E4): o aviso de red flag da anamnese é o toast que fica na tela. Antes, a página trocava na hora
// pelo "Anamnese concluída!", porque só cabe um toast por vez (TOAST_LIMIT = 1). Reais: as páginas, o toast e o
// Toaster. Falsos: Supabase, autenticação e a anamnese, que dispara o mesmo toast da real e conclui.
import type { ReactNode } from 'react';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import NewAssessment from '@/pages/NewAssessment';
import ContinueAssessment from '@/pages/ContinueAssessment';
import { Toaster } from '@/components/ui/toaster';
import { toast } from '@/hooks/use-toast';

const ASSESSMENT_ID = '00000000-0000-0000-0000-000000000001';
const STUDENT_ID = '00000000-0000-0000-0000-000000000002';

const h = vi.hoisted(() => ({
  tables: {} as Record<string, unknown>,
  user: { id: '00000000-0000-0000-0000-000000000003' },
}));

vi.mock('@/integrations/supabase/client', async () => {
  const { createSupabaseFake } = await import('./supabaseFake');
  return { supabase: { from: (table: string) => createSupabaseFake(h.tables).from(table) } };
});

vi.mock('@/hooks/useAuth', () => ({
  AuthProvider: ({ children }: { children: ReactNode }) => children,
  useAuth: () => ({ user: h.user, role: 'professional', loading: false }),
}));

// O toast da anamnese real (AnamnesisWizard.handleSubmit) com red flag, e depois onComplete
vi.mock('@/components/anamnesis/AnamnesisWizard', () => ({
  AnamnesisWizard: ({ onComplete }: { onComplete: () => void }) => (
    <button onClick={() => {
      toast({ title: 'Anamnese salva!', description: 'Atenção: Red Flags detectados. Encaminhe para avaliação médica.' });
      onComplete();
    }}>concluir anamnese (stub)</button>
  ),
}));
vi.mock('@/components/global-tests/GlobalTestsWizard', () => ({ GlobalTestsWizard: () => <div>globais (stub)</div> }));
vi.mock('@/components/segmental-tests/SegmentalTestsWizard', () => ({ SegmentalTestsWizard: () => <div>segmentados (stub)</div> }));
vi.mock('@/components/protocol/ProtocolGenerator', () => ({ ProtocolGenerator: () => <div>protocolo (stub)</div> }));

beforeEach(() => {
  h.tables = {};
  localStorage.clear();
});
afterEach(() => {
  cleanup();
});

function renderAt(url: string) {
  render(
    <MemoryRouter initialEntries={[url]}>
      <Toaster />
      <Routes>
        <Route path="/assessment/new" element={<NewAssessment />} />
        <Route path="/assessment/continue" element={<ContinueAssessment />} />
        <Route path="/dashboard" element={<div>painel</div>} />
      </Routes>
    </MemoryRouter>,
  );
}

it.each([
  ['NewAssessment', `/assessment/new?studentId=${STUDENT_ID}&assessmentId=${ASSESSMENT_ID}&studentName=Aluno`],
  ['ContinueAssessment', `/assessment/continue?assessmentId=${ASSESSMENT_ID}&studentName=Aluno`],
])('%s: o aviso de red flag continua na tela depois de concluir a anamnese', async (_page, url) => {
  h.tables = { assessments: { id: ASSESSMENT_ID, status: 'in_progress' } };
  renderAt(url);
  fireEvent.click(await screen.findByText('concluir anamnese (stub)'));
  await screen.findByText('globais (stub)');
  await act(async () => { await new Promise(resolve => setTimeout(resolve, 0)); });
  expect(screen.getByText(/Red Flags detectados/)).toBeTruthy();
  expect(screen.queryByText('Anamnese concluída!')).toBeNull();
});
