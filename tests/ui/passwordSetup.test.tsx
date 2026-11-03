// @vitest-environment jsdom
// Criar senha: o convite e o "Esqueci minha senha" precisam levar o aluno a /definir-senha, de qualquer página onde o
// link cair. Real: App (tabela de rotas e o desvio), SetPassword e Auth. Falsos: useAuth (estado de cada teste) e o
// toast. Dados sintéticos.
import type { ReactNode } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { HelmetProvider } from 'react-helmet-async';
import App from '@/App';
import SetPassword from '@/pages/SetPassword';
import Auth from '@/pages/Auth';
import { stubMatchMedia } from './helpers';

const h = vi.hoisted(() => ({
  auth: {} as Record<string, unknown>,
  toasts: [] as Array<{ title?: string; description?: string; variant?: string }>,
}));

vi.mock('@/hooks/useAuth', () => ({
  AuthProvider: ({ children }: { children: ReactNode }) => children,
  useAuth: () => h.auth,
}));

vi.mock('@/hooks/use-toast', () => ({
  useToast: () => ({ toasts: [], toast: (t: { title?: string; description?: string; variant?: string }) => { h.toasts.push(t); } }),
}));

vi.mock('@/pages/Index', async () => (await import('./helpers')).pageStub('início'));
vi.mock('@/pages/Dashboard', async () => (await import('./helpers')).pageStub('painel'));
vi.mock('@/pages/NewAssessment', async () => (await import('./helpers')).pageStub('nova avaliação'));
vi.mock('@/pages/ContinueAssessment', async () => (await import('./helpers')).pageStub('continuar avaliação'));
vi.mock('@/pages/QuickProtocol', async () => (await import('./helpers')).pageStub('protocolo rápido'));
vi.mock('@/pages/OAuthConsent', async () => (await import('./helpers')).pageStub('consentimento'));
vi.mock('@/pages/NotFound', async () => (await import('./helpers')).pageStub('404'));

const USER = { id: '00000000-0000-0000-0000-000000000009', email: 'aluno@example.invalid' };

function authState(over: Record<string, unknown> = {}) {
  return {
    user: null, session: null, role: null, loading: false,
    needsPassword: false, authLinkFailed: false,
    clearAuthLinkFailed: vi.fn(),
    setPassword: vi.fn(async () => ({ error: null })),
    requestPasswordReset: vi.fn(async () => ({ error: null })),
    signIn: vi.fn(), signUp: vi.fn(), signOut: vi.fn(),
    ...over,
  };
}

beforeEach(() => {
  stubMatchMedia();
  h.toasts = [];
  h.auth = authState();
  window.history.pushState({}, '', '/');
});
afterEach(cleanup);

// main.tsx põe o HelmetProvider em volta do App
const renderApp = () => render(<HelmetProvider><App /></HelmetProvider>);

describe('desvio para /definir-senha (App real)', () => {
  it('entrou pelo link do convite: de qualquer página vai criar a senha', async () => {
    h.auth = authState({ user: USER, needsPassword: true });
    window.history.pushState({}, '', '/dashboard');
    renderApp();
    await screen.findByText('Crie sua senha');
    expect(window.location.pathname).toBe('/definir-senha');
    expect(screen.queryByText('página: painel')).toBeNull();
  });

  it('link vencido: vai para a mensagem de link expirado', async () => {
    h.auth = authState({ authLinkFailed: true });
    renderApp();
    await screen.findByText('Este link expirou ou já foi usado');
    expect(window.location.pathname).toBe('/definir-senha');
  });

  it('ainda carregando: não desvia (o supabase-js ainda lê a sessão do link)', async () => {
    h.auth = authState({ user: USER, needsPassword: true, loading: true });
    renderApp();
    await screen.findByText('página: início');
    expect(window.location.pathname).toBe('/');
  });

  it('link sem sessão (token ruim): não prende ninguém em /definir-senha', async () => {
    h.auth = authState({ needsPassword: true });
    renderApp();
    await screen.findByText('página: início');
    expect(window.location.pathname).toBe('/');
  });

  it('sem link: nada muda', async () => {
    h.auth = authState({ user: USER });
    window.history.pushState({}, '', '/dashboard');
    renderApp();
    await screen.findByText('página: painel');
  });
});

function renderAt(path: string, element: ReactNode) {
  return render(
    <HelmetProvider>
      <MemoryRouter initialEntries={[path]}>
        <Routes>
          <Route path={path} element={element} />
          <Route path="/dashboard" element={<div>página: painel</div>} />
          <Route path="/auth" element={<div>página: login</div>} />
        </Routes>
      </MemoryRouter>
    </HelmetProvider>,
  );
}

function fillPassword(password: string, confirm: string) {
  fireEvent.change(screen.getByLabelText('Nova senha'), { target: { value: password } });
  fireEvent.change(screen.getByLabelText('Confirmar senha'), { target: { value: confirm } });
  fireEvent.click(screen.getByRole('button', { name: /Salvar senha/ }));
}

describe('SetPassword', () => {
  it('salva a senha e vai para o painel', async () => {
    h.auth = authState({ user: USER, needsPassword: true });
    renderAt('/definir-senha', <SetPassword />);
    screen.getByText(/Para aluno@example\.invalid/);
    fillPassword('senha-forte-1', 'senha-forte-1');
    await screen.findByText('página: painel');
    expect(h.auth.setPassword).toHaveBeenCalledWith('senha-forte-1');
    expect(h.toasts.map((t) => t.title)).toStrictEqual(['Senha criada!']);
  });

  it.each([
    ['curta', 'curta1', 'curta1', 'A senha deve ter no mínimo 8 caracteres'],
    ['diferente da confirmação', 'senha-forte-1', 'senha-forte-2', 'Senhas não coincidem'],
  ])('senha %s: não salva', async (_label, password, confirm, message) => {
    h.auth = authState({ user: USER, needsPassword: true });
    renderAt('/definir-senha', <SetPassword />);
    fillPassword(password, confirm);
    await screen.findByText(message);
    expect(h.auth.setPassword).not.toHaveBeenCalled();
  });

  it('erro do servidor: mostra e fica na página', async () => {
    h.auth = authState({ user: USER, needsPassword: true, setPassword: vi.fn(async () => ({ error: new Error('x') })) });
    renderAt('/definir-senha', <SetPassword />);
    fillPassword('senha-forte-1', 'senha-forte-1');
    await waitFor(() => expect(h.toasts).toStrictEqual([{ variant: 'destructive', title: 'Erro ao salvar a senha', description: 'x' }]));
    expect(screen.queryByText('página: painel')).toBeNull();
  });

  it('link vencido: explica, aponta para a entrada e limpa o aviso', async () => {
    h.auth = authState({ authLinkFailed: true });
    renderAt('/definir-senha', <SetPassword />);
    screen.getByText('Este link expirou ou já foi usado');
    screen.getByText(/Esqueci minha senha/);
    expect(h.auth.clearAuthLinkFailed).toHaveBeenCalled();
    fireEvent.click(screen.getByRole('link', { name: 'Ir para a entrada' }));
    await screen.findByText('página: login');
  });

  it('sem sessão e sem link: pede para abrir o e-mail', () => {
    renderAt('/definir-senha', <SetPassword />);
    screen.getByText('Abra o link do e-mail');
    expect(screen.queryByLabelText('Nova senha')).toBeNull();
  });
});

describe('Esqueci minha senha (Auth)', () => {
  function openForgot(email = '') {
    renderAt('/auth-real', <Auth />);
    if (email) fireEvent.change(screen.getByLabelText('Email', { selector: '#login-email' }), { target: { value: email } });
    fireEvent.click(screen.getByRole('button', { name: 'Esqueci minha senha' }));
  }

  it('aproveita o e-mail digitado, envia o link e responde igual com ou sem conta', async () => {
    openForgot('aluno@example.invalid');
    const field = screen.getByLabelText('Email', { selector: '#forgot-email' }) as HTMLInputElement;
    expect(field.value).toBe('aluno@example.invalid');
    fireEvent.click(screen.getByRole('button', { name: 'Enviar link' }));
    await screen.findByText(/Se este e-mail tiver conta/);
    expect(h.auth.requestPasswordReset).toHaveBeenCalledWith('aluno@example.invalid');
  });

  it('e-mail inválido: não envia', async () => {
    openForgot();
    const field = screen.getByLabelText('Email', { selector: '#forgot-email' });
    fireEvent.change(field, { target: { value: 'nao-e-email' } });
    // submit direto: o jsdom barra o clique pela validação do type="email", e aqui o que vale é a do zod
    fireEvent.submit(field.closest('form')!);
    await screen.findByText('Email inválido');
    expect(h.auth.requestPasswordReset).not.toHaveBeenCalled();
  });

  it('pedido repetido em menos de um minuto: diz para esperar', async () => {
    const tooSoon = Object.assign(new Error('For security purposes, you can only request this after 40 seconds.'), { status: 429 });
    h.auth = authState({ requestPasswordReset: vi.fn(async () => ({ error: tooSoon })) });
    openForgot('aluno@example.invalid');
    fireEvent.click(screen.getByRole('button', { name: 'Enviar link' }));
    await waitFor(() => expect(h.toasts).toStrictEqual([
      { variant: 'destructive', title: 'Não foi possível enviar o link', description: 'Espere um minuto antes de pedir outro link.' },
    ]));
    expect(screen.queryByText(/Se este e-mail tiver conta/)).toBeNull();
  });

  it('volta para a entrada', () => {
    openForgot();
    fireEvent.click(screen.getByRole('button', { name: 'Voltar para a entrada' }));
    screen.getByText('Bem-vindo de volta');
  });
});
