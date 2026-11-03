// @vitest-environment jsdom
// Etapa 5a (E6): no protocolo rápido, V1 e V2, a triagem de red flags vem antes do lado. Sem red flag, segue; com
// alguma, o cartão de liberação, e "Continuar" só com a justificativa. A sessão nasce com red_flags e a liberação é
// gravada logo depois; se ela falhar, a tela volta ao cartão. Reais: os dois wizards, a triagem e o cartão. Falsos:
// Supabase (registra insert, update e rpc; a sessão criada tem id fixo) e o toast (registra o título). Dados sintéticos.
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { QuickProtocolWizard } from '@/components/quick-protocol/QuickProtocolWizard';
import { QuickProtocolWizardV2 } from '@/components/quick-protocol/QuickProtocolWizardV2';

const SESSION = 'sessao-sintetica';
const JUSTIFICATION = 'Liberado pelo médico sintético em 10/11';
const FIRST_HIP_TEST = 'Knee-to-Chest Test';

const h = vi.hoisted(() => ({
  calls: [] as Array<{ op: string; payload: unknown }>,
  failClear: false,
  toasts: [] as string[],
}));

vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    auth: { getUser: async () => ({ data: { user: { id: 'profissional-sintetico' } } }) },
    from: (table: string) => ({
      insert: (payload: unknown) => {
        h.calls.push({ op: `${table}.insert`, payload });
        return { select: () => ({ single: async () => ({ data: { id: SESSION }, error: null }) }) };
      },
      update: (payload: Record<string, unknown>) => ({
        eq: async (_column: string, id: string) => {
          h.calls.push({ op: `${table}.update`, payload: { ...payload, id } });
          return { data: null, error: null };
        },
      }),
    }),
    rpc: async (name: string, args: unknown) => {
      h.calls.push({ op: `${name}.rpc`, payload: args });
      return h.failClear ? { data: null, error: { message: 'falha sintética' } } : { data: 'liberacao-sintetica', error: null };
    },
  },
}));

vi.mock('@/hooks/use-toast', () => ({
  useToast: () => ({ toast: ({ title }: { title?: string }) => { h.toasts.push(String(title)); } }),
}));

beforeEach(() => {
  h.calls.length = 0;
  h.failClear = false;
  h.toasts.length = 0;
});
afterEach(() => { cleanup(); vi.restoreAllMocks(); });

const NONE = {
  unexplainedWeightLoss: false, nightPain: false, fever: false, bladderBowelDysfunction: false,
  progressiveWeakness: false, recentTrauma: false, cancerHistory: false, osteoporosis: false,
};
const ops = () => h.calls.map(c => c.op);
const continueButton = () => screen.getByText('Continuar').closest('button')!;

describe.each([
  ['V1', QuickProtocolWizard],
  ['V2', QuickProtocolWizardV2],
])('%s', (_version, Wizard) => {
  const start = () => {
    render(
      <MemoryRouter>
        <Wizard studentId="aluno-sintetico" protocolType="hip_pain" />
      </MemoryRouter>,
    );
    fireEvent.click(screen.getByText('Iniciar Protocolo Rápido'));
  };

  it('a triagem vem antes do lado; sem red flag, segue, e a sessão nasce com a triagem', async () => {
    start();
    expect(await screen.findByText('Triagem de red flags')).toBeTruthy();
    expect(screen.queryByText('Esquerdo')).toBeNull();
    expect(screen.queryByText(/Red flags na triagem/)).toBeNull();
    fireEvent.click(continueButton());
    fireEvent.click(await screen.findByText('Esquerdo'));
    expect((await screen.findAllByText(FIRST_HIP_TEST)).length).toBeGreaterThan(0);
    expect(ops()).toStrictEqual(['quick_protocol_sessions.insert']);
    expect(h.calls[0].payload).toMatchObject({ status: 'in_progress', affected_side: 'left', red_flags: NONE });
  });

  it('com red flag: o cartão; "Continuar" só com a justificativa; a sessão nasce com ela e a liberação vem logo depois', async () => {
    start();
    fireEvent.click(await screen.findByText('Febre associada à dor'));
    expect(screen.getByText('Red flags na triagem — Febre associada à dor')).toBeTruthy();
    expect(continueButton().disabled).toBe(true);
    fireEvent.change(screen.getByLabelText('Justificativa (mínimo de 20 caracteres)'), { target: { value: 'x'.repeat(19) } });
    expect(continueButton().disabled).toBe(true);
    fireEvent.change(screen.getByLabelText('Justificativa (mínimo de 20 caracteres)'), { target: { value: JUSTIFICATION } });
    expect(continueButton().disabled).toBe(false);
    fireEvent.click(continueButton());
    fireEvent.click(await screen.findByText('Esquerdo'));
    expect((await screen.findAllByText(FIRST_HIP_TEST)).length).toBeGreaterThan(0);
    expect(ops()).toStrictEqual(['quick_protocol_sessions.insert', 'clear_quick_session_red_flags.rpc']);
    expect(h.calls[0].payload).toMatchObject({ red_flags: { ...NONE, fever: true } });
    expect(h.calls[1].payload).toStrictEqual({ _session_id: SESSION, _justification: JUSTIFICATION });
  });

  it('a liberação que falha volta ao cartão, sem ir aos testes; de novo, a mesma sessão é usada', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => {});
    h.failClear = true;
    start();
    fireEvent.click(await screen.findByText('Febre associada à dor'));
    fireEvent.change(screen.getByLabelText('Justificativa (mínimo de 20 caracteres)'), { target: { value: JUSTIFICATION } });
    fireEvent.click(continueButton());
    fireEvent.click(await screen.findByText('Esquerdo'));
    expect(await screen.findByText('Red flags na triagem — Febre associada à dor')).toBeTruthy();
    expect(h.toasts).toStrictEqual(['Erro ao liberar']);
    expect(screen.queryByText(FIRST_HIP_TEST)).toBeNull();

    h.failClear = false;
    fireEvent.click(continueButton());
    fireEvent.click(await screen.findByText('Direito'));
    expect((await screen.findAllByText(FIRST_HIP_TEST)).length).toBeGreaterThan(0);
    expect(ops()).toStrictEqual([
      'quick_protocol_sessions.insert', 'clear_quick_session_red_flags.rpc',
      'quick_protocol_sessions.update', 'clear_quick_session_red_flags.rpc',
    ]);
    expect(h.calls[2].payload).toStrictEqual({ affected_side: 'right', red_flags: { ...NONE, fever: true }, id: SESSION });
  });

  it('"Encerrar" sai sem criar nada', async () => {
    const onClose = vi.fn();
    render(
      <MemoryRouter>
        <Wizard studentId="aluno-sintetico" protocolType="hip_pain" onClose={onClose} />
      </MemoryRouter>,
    );
    fireEvent.click(screen.getByText('Iniciar Protocolo Rápido'));
    fireEvent.click(await screen.findByText('Febre associada à dor'));
    fireEvent.click(screen.getByText('Encerrar'));
    await waitFor(() => expect(onClose).toHaveBeenCalledTimes(1));
    expect(h.calls).toStrictEqual([]);
  });
});
