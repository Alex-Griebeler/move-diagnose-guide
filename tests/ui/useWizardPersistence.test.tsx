// @vitest-environment jsdom
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { act, cleanup, renderHook, waitFor } from '@testing-library/react';
import { useWizardPersistence } from '@/hooks/useWizardPersistence';

// Supabase falso para assessment_drafts: a carga devolve `draft`; a gravação é capturada.
const db = vi.hoisted(() => ({
  draft: null as null | { draft_data: unknown; current_step: number },
  writes: [] as unknown[],
}));

vi.mock('@/integrations/supabase/client', () => {
  const from = () => {
    let columns = '';
    const q = {
      select: (cols: string) => { columns = cols; return q; },
      eq: () => q,
      maybeSingle: () => Promise.resolve({
        data: columns.includes('draft_data') ? db.draft : null,
        error: null,
      }),
      insert: (rows: Array<{ draft_data: unknown }>) => {
        db.writes.push(...rows.map((r) => r.draft_data));
        return Promise.resolve({ error: null });
      },
    };
    return q;
  };
  return { supabase: { from } };
});

type Anamnesis = { fullName: string; birthDate: Date | undefined };
const initialData: Anamnesis = { fullName: '', birthDate: undefined };
const props = { key: 'anamnesis_wizard', initialData, assessmentId: '00000000-0000-0000-0000-000000000001' };

beforeEach(() => {
  db.draft = null;
  db.writes = [];
  localStorage.clear();
});
afterEach(cleanup);

it('F-01: retoma um rascunho com data ISO como Date', async () => {
  db.draft = { draft_data: { fullName: 'Aluno Sintético', birthDate: '1990-05-15T03:00:00.000Z' }, current_step: 1 };
  const { result } = renderHook(() => useWizardPersistence<Anamnesis>(props));
  await waitFor(() => expect(result.current.isLoading).toBe(false));
  expect(result.current.data.birthDate).toBeInstanceOf(Date);
  expect(result.current.data.birthDate?.toISOString()).toBe('1990-05-15T03:00:00.000Z');
});

it('F-01: rascunho já corrompido ({}) vira data vazia, não Invalid Date', async () => {
  db.draft = { draft_data: { fullName: 'Aluno Sintético', birthDate: {} }, current_step: 1 };
  const { result } = renderHook(() => useWizardPersistence<Anamnesis>(props));
  await waitFor(() => expect(result.current.isLoading).toBe(false));
  expect(result.current.data.birthDate).toBeUndefined();
});

it('F-01: grava a data como ISO no rascunho', async () => {
  const { result } = renderHook(() => useWizardPersistence<Anamnesis>(props));
  await waitFor(() => expect(result.current.isLoading).toBe(false));
  act(() => result.current.updateData({ birthDate: new Date('1990-05-15T03:00:00.000Z') }));
  await waitFor(() => expect(db.writes).toHaveLength(1), { timeout: 4000 });
  expect(db.writes[0]).toStrictEqual({ fullName: '', birthDate: '1990-05-15T03:00:00.000Z' });
});
