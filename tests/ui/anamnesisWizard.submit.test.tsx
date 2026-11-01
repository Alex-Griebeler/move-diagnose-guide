// @vitest-environment jsdom
// F-01, envio: uma data inválida não pode derrubar o envio da anamnese (antes: RangeError em toISOString).
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { AnamnesisWizard } from '@/components/anamnesis/AnamnesisWizard';

const ASSESSMENT_ID = '00000000-0000-0000-0000-000000000001';
const STUDENT_ID = '00000000-0000-0000-0000-000000000002';

const h = vi.hoisted(() => ({
  overrides: {} as Record<string, unknown>,
  inserts: [] as Array<Record<string, unknown>>,
  profileUpdates: [] as Array<{ payload: Record<string, unknown>; id: unknown }>,
}));

// Supabase falso por tabela e operação; qualquer outra chamada lança.
vi.mock('@/integrations/supabase/client', () => {
  const ok = { error: null };
  const from = (table: string) => ({
    select: () => ({
      eq: () => ({
        maybeSingle: () => {
          if (table !== 'profiles') throw new Error(`select inesperado em ${table}`);
          return Promise.resolve({ data: null, error: null });
        },
      }),
    }),
    insert: (row: Record<string, unknown>) => {
      if (table !== 'anamnesis_responses') throw new Error(`insert inesperado em ${table}`);
      h.inserts.push(row);
      return Promise.resolve(ok);
    },
    update: (payload: Record<string, unknown>) => ({
      eq: (_column: string, id: unknown) => {
        if (table === 'profiles') h.profileUpdates.push({ payload, id });
        else if (table !== 'assessments') throw new Error(`update inesperado em ${table}`);
        return Promise.resolve(ok);
      },
    }),
  });
  return { supabase: { from } };
});

// Persistência em memória, já no último passo (consentimento), com os dados do teste.
vi.mock('@/hooks/useWizardPersistence', async () => {
  const { useCallback, useState } = await import('react');
  return {
    useWizardPersistence: <T,>({ initialData }: { initialData: T }) => {
      const [data, setData] = useState<T>(() => ({ ...initialData, ...h.overrides }));
      const [currentStep, setCurrentStep] = useState(8);
      const updateData = useCallback((updates: Partial<T> | ((prev: T) => T)) => {
        setData((prev) => (typeof updates === 'function' ? updates(prev) : { ...prev, ...updates }));
      }, []);
      const clearPersistedData = useCallback(async () => {}, []);
      return { data, setData, updateData, currentStep, setCurrentStep, clearPersistedData, isLoading: false, isSyncing: false };
    },
  };
});

vi.mock('@/hooks/use-toast', () => ({ useToast: () => ({ toast: () => {} }) }));

beforeEach(() => {
  h.inserts = [];
  h.profileUpdates = [];
});
afterEach(cleanup);

async function submit(birthDate: Date) {
  h.overrides = { lgpdConsent: true, laterality: 'right', birthDate };
  const onComplete = vi.fn();
  render(
    <MemoryRouter>
      <AnamnesisWizard assessmentId={ASSESSMENT_ID} studentId={STUDENT_ID} onComplete={onComplete} />
    </MemoryRouter>,
  );
  fireEvent.click(await screen.findByRole('button', { name: /Concluir Anamnese/ }));
  await waitFor(() => expect(onComplete).toHaveBeenCalledTimes(1));
}

it('Invalid Date: grava birth_date null e não manda birth_date ao perfil', async () => {
  await submit(new Date(NaN));
  expect(h.inserts).toHaveLength(1);
  expect(h.inserts[0].birth_date).toBeNull();
  expect(h.profileUpdates).toStrictEqual([{ payload: { laterality: 'right' }, id: STUDENT_ID }]);
});

it('data válida: grava o mesmo dia de antes na anamnese e no perfil', async () => {
  await submit(new Date('1990-05-15T03:00:00.000Z'));
  expect(h.inserts[0].birth_date).toBe('1990-05-15');
  expect(h.profileUpdates).toStrictEqual([
    { payload: { birth_date: '1990-05-15', laterality: 'right' }, id: STUDENT_ID },
  ]);
});
