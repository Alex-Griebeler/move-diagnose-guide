// @vitest-environment jsdom
// Cadastro de aluno: num 4xx da create-student, o supabase-js devolve um FunctionsHttpError cuja mensagem é
// "Edge Function returned a non-2xx status code"; a tela mostrava esse texto em vez do da função. E com conta que já
// existia, o convite dizia que um e-mail ia chegar, mas nenhum sai. Real: o modal e o FunctionsHttpError do supabase-js.
// Falsos: invoke (a resposta de cada teste) e o toast (registra título e descrição). Dados sintéticos.
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { FunctionsHttpError } from '@supabase/supabase-js';
import { AddStudentModal } from '@/components/students/AddStudentModal';
import { stubMatchMedia } from './helpers';

const h = vi.hoisted(() => ({
  answer: null as null | (() => { data: unknown; error: unknown }),
  toasts: [] as string[],
  navigate: vi.fn(),
}));

vi.mock('react-router-dom', async (importOriginal) => ({
  ...(await importOriginal<typeof import('react-router-dom')>()),
  useNavigate: () => h.navigate,
}));

vi.mock('@/integrations/supabase/client', () => ({
  supabase: { functions: { invoke: async () => h.answer!() } },
}));

vi.mock('@/hooks/useAuth', () => ({
  useAuth: () => ({ user: { id: '00000000-0000-0000-0000-000000000003' }, role: 'professional', loading: false }),
}));

vi.mock('sonner', async (importOriginal) => ({
  ...(await importOriginal<typeof import('sonner')>()),
  toast: {
    success: (title: string, opts?: { description?: string }) => { h.toasts.push(`${title} | ${opts?.description ?? ''}`); },
    error: () => {},
    info: () => {},
  },
}));

const httpError = (status: number, body: unknown) => () => ({
  data: null,
  error: new FunctionsHttpError(new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } })),
});

beforeEach(() => {
  stubMatchMedia();
  h.toasts = [];
  h.navigate.mockReset();
});
afterEach(cleanup);

function sendInvite() {
  render(<AddStudentModal open onOpenChange={() => {}} />);
  fireEvent.change(screen.getByLabelText('Nome completo'), { target: { value: 'Aluno Sintético' } });
  fireEvent.change(screen.getByLabelText('Email'), { target: { value: 'prof@example.invalid' } });
  fireEvent.click(screen.getByRole('button', { name: /Enviar Convite/ }));
}

async function registerInPerson() {
  render(<AddStudentModal open onOpenChange={() => {}} />);
  const tab = screen.getByRole('tab', { name: /Cadastro Presencial/ });
  fireEvent.mouseDown(tab);
  fireEvent.click(tab);
  fireEvent.change(await screen.findByLabelText('Nome completo *'), { target: { value: 'Aluno Sintético' } });
  fireEvent.change(screen.getByLabelText('Email *'), { target: { value: 'aluno@example.invalid' } });
  fireEvent.click(screen.getByRole('button', { name: /Cadastrar e Iniciar Avaliação/ }));
}

it('convite com o próprio e-mail: mostra a mensagem da função', async () => {
  h.answer = httpError(400, { error: 'Este é o e-mail da sua conta. Digite o e-mail do aluno.' });
  sendInvite();
  await screen.findByText('Este é o e-mail da sua conta. Digite o e-mail do aluno.');
  expect(screen.queryByText(/non-2xx/)).toBeNull();
  expect(h.toasts).toStrictEqual([]);
});

it('presencial com aluno já vinculado: mostra a mensagem da função e não navega', async () => {
  h.answer = httpError(409, { error: 'Este aluno já está vinculado a você.' });
  await registerInPerson();
  await screen.findByText('Este aluno já está vinculado a você.');
  expect(screen.queryByText(/non-2xx/)).toBeNull();
  expect(h.navigate).not.toHaveBeenCalled();
});

it('erro sem corpo legível: o texto padrão, não o do supabase-js', async () => {
  h.answer = () => ({ data: null, error: new FunctionsHttpError(new Response('Internal Server Error', { status: 500 })) });
  await registerInPerson();
  await screen.findByText('Erro ao cadastrar aluno');
  expect(screen.queryByText(/non-2xx/)).toBeNull();
});

it('convite para conta que já existia: não promete e-mail', async () => {
  h.answer = () => ({
    data: { success: true, existingUser: true, message: 'Aluno Sintético já tinha conta e foi vinculado a você. Nenhum e-mail foi enviado.' },
    error: null,
  });
  sendInvite();
  await screen.findByText(/Nenhum e-mail foi enviado/);
  await waitFor(() => expect(h.toasts).toStrictEqual(['Aluno vinculado! | Ele já tinha conta no sistema. Nenhum email foi enviado.']));
});

it('convite para conta nova: convite enviado', async () => {
  h.answer = () => ({ data: { success: true, existingUser: false, message: 'Convite enviado para aluno@example.invalid' }, error: null });
  sendInvite();
  await waitFor(() => expect(h.toasts).toStrictEqual(['Convite enviado! | O aluno receberá um email para definir sua senha.']));
});
