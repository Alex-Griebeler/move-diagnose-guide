// @vitest-environment jsdom
// F-03. Prova a fronteira de montagem: o wizard cria uma instância nova de AutoSegmentalTest
// a cada teste, então nenhum estado local (foto, análise) passa de um teste para o outro.
// Não prova upload, storage nem o MediaUploader real: o AutoSegmentalTest é um stub com estado local.
import { afterEach, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { SegmentalTestsWizard } from '@/components/segmental-tests/SegmentalTestsWizard';

afterEach(cleanup);

// Supabase falso: só as três leituras que o wizard faz ao abrir.
vi.mock('@/integrations/supabase/client', () => {
  const results: Record<string, { data: unknown; error: null }> = {
    global_test_results: { data: [{ anterior_view: { compensations: ['compensacao_sintetica'] } }], error: null },
    anamnesis_responses: { data: null, error: null },
    segmental_test_results: { data: [], error: null },
  };
  const query = (table: string) => {
    const result = Promise.resolve(results[table]);
    const q = {
      select: () => q,
      eq: () => q,
      single: () => result,
      maybeSingle: () => result,
      then: result.then.bind(result),
    };
    return q;
  };
  return { supabase: { from: query } };
});

// Dois testes sintéticos fixos; a priorização real não é o assunto aqui.
vi.mock('@/lib/testPrioritization', () => {
  const test = (id: string) => ({
    id, name: `Teste ${id}`, bodyRegion: 'regiao', description: '', unit: 'graus',
    isBilateral: true, instructions: '', resultType: 'qualitative' as const,
  });
  return {
    getSuggestedTestsWithPriority: () => ({
      prioritizedTests: [{ test: test('t1') }, { test: test('t2') }],
      additionalTests: [],
      contextosAplicados: [],
      totalCausasAnalisadas: 0,
      paretoApplied: false,
    }),
  };
});

// Persistência em memória, sem banco nem timers.
vi.mock('@/hooks/useWizardPersistence', async () => {
  const { useCallback, useState } = await import('react');
  return {
    useWizardPersistence: <T,>({ initialData }: { initialData: T }) => {
      const [data, setData] = useState<T>(initialData);
      const [currentStep, setCurrentStep] = useState(1);
      // Same contract as the real hook: a partial object or an updater on the latest data
      const updateData = useCallback(
        (updates: Partial<T> | ((prev: T) => T)) =>
          setData((prev) => (typeof updates === 'function' ? updates(prev) : { ...prev, ...updates })),
        [],
      );
      const clearPersistedData = useCallback(async () => {}, []);
      return { data, setData, updateData, currentStep, setCurrentStep, clearPersistedData, isLoading: false, isSyncing: false };
    },
  };
});

// Stub com estado local, como a foto em AutoSegmentalTest/MediaUploader.
vi.mock('@/components/segmental-tests/AutoSegmentalTest', async () => {
  const { useState } = await import('react');
  return {
    AutoSegmentalTest: ({ test }: { test: { id: string } }) => {
      const [photo, setPhoto] = useState<string | null>(null);
      return (
        <div>
          <span>{`teste=${test.id} foto=${photo ?? 'nenhuma'}`}</span>
          <button onClick={() => setPhoto(`foto-de-${test.id}`)}>enviar foto</button>
        </div>
      );
    },
  };
});

it('F-03: a foto de um teste segmentar não aparece no teste seguinte', async () => {
  render(<SegmentalTestsWizard assessmentId="00000000-0000-0000-0000-000000000001" onComplete={() => {}} />);

  await screen.findByText('teste=t1 foto=nenhuma');
  fireEvent.click(screen.getByText('enviar foto'));
  screen.getByText('teste=t1 foto=foto-de-t1');

  fireEvent.click(screen.getByRole('button', { name: /Próximo/ }));
  screen.getByText('teste=t2 foto=nenhuma');

  fireEvent.click(screen.getByRole('button', { name: /Anterior/ }));
  screen.getByText('teste=t1 foto=nenhuma');
});
