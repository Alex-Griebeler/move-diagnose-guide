// @vitest-environment jsdom
// useAuth real: lê o link do e-mail ao ser importado (antes de o supabase-js limpar a URL) e ouve o PASSWORD_RECOVERY.
// Falso: o cliente do Supabase (sessão, eventos, updateUser e resetPasswordForEmail registram as chamadas).
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { act, cleanup, render, waitFor } from '@testing-library/react';

const h = vi.hoisted(() => ({
  listener: null as null | ((event: string, session: unknown) => void),
  session: null as unknown,
  updateUser: vi.fn(async (_attrs: unknown) => ({ error: null as Error | null })),
  resetPasswordForEmail: vi.fn(async (_email: string, _opts: unknown) => ({ error: null })),
}));

vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    auth: {
      onAuthStateChange: (cb: (event: string, session: unknown) => void) => {
        h.listener = cb;
        return { data: { subscription: { unsubscribe: () => {} } } };
      },
      getSession: async () => ({ data: { session: h.session } }),
      updateUser: h.updateUser,
      resetPasswordForEmail: h.resetPasswordForEmail,
      signOut: async () => ({ error: null }),
    },
    from: () => ({ select: () => ({ eq: () => ({ single: async () => ({ data: { role: 'student' }, error: null }) }) }) }),
  },
}));

const SESSION = { user: { id: '00000000-0000-0000-0000-000000000009', email: 'aluno@example.invalid' } };

async function mountWithUrl(url: string) {
  window.history.replaceState(null, '', url);
  vi.resetModules();
  const { AuthProvider, useAuth } = await import('@/hooks/useAuth');
  const seen: { current: ReturnType<typeof useAuth> | null } = { current: null };
  function Probe() { seen.current = useAuth(); return null; }
  render(<AuthProvider><Probe /></AuthProvider>);
  await waitFor(() => expect(seen.current?.loading).toBe(false));
  return seen;
}

beforeEach(() => {
  h.listener = null;
  h.session = SESSION;
  h.updateUser.mockClear();
  h.resetPasswordForEmail.mockClear();
});
afterEach(cleanup);

it('link de convite na URL: pede a senha; salvar limpa o pedido', async () => {
  const seen = await mountWithUrl('/#access_token=t&refresh_token=r&type=invite');
  expect(seen.current!.needsPassword).toBe(true);
  expect(seen.current!.authLinkFailed).toBe(false);
  await act(async () => { await seen.current!.setPassword('senha-forte-1'); });
  expect(h.updateUser).toHaveBeenCalledWith({ password: 'senha-forte-1' });
  expect(seen.current!.needsPassword).toBe(false);
});

it('erro ao salvar: continua pedindo a senha', async () => {
  h.updateUser.mockResolvedValueOnce({ error: new Error('x') });
  const seen = await mountWithUrl('/#access_token=t&type=recovery');
  let result: { error: Error | null } | undefined;
  await act(async () => { result = await seen.current!.setPassword('senha-forte-1'); });
  expect(result!.error?.message).toBe('x');
  expect(seen.current!.needsPassword).toBe(true);
});

it('sem link: não pede; o evento PASSWORD_RECOVERY passa a pedir', async () => {
  const seen = await mountWithUrl('/dashboard');
  expect(seen.current!.needsPassword).toBe(false);
  act(() => { h.listener!('PASSWORD_RECOVERY', SESSION); });
  await waitFor(() => expect(seen.current!.needsPassword).toBe(true));
});

it('link vencido: marca a falha, que some ao limpar', async () => {
  h.session = null;
  const seen = await mountWithUrl('/#error=access_denied&error_code=otp_expired');
  expect(seen.current!.authLinkFailed).toBe(true);
  act(() => { seen.current!.clearAuthLinkFailed(); });
  expect(seen.current!.authLinkFailed).toBe(false);
});

it('sair: para de pedir a senha', async () => {
  const seen = await mountWithUrl('/#access_token=t&type=invite');
  await act(async () => { await seen.current!.signOut(); });
  expect(seen.current!.needsPassword).toBe(false);
});

it('Esqueci minha senha: o link volta para /definir-senha deste site', async () => {
  const seen = await mountWithUrl('/auth');
  await act(async () => { await seen.current!.requestPasswordReset('aluno@example.invalid'); });
  expect(h.resetPasswordForEmail).toHaveBeenCalledWith('aluno@example.invalid', {
    redirectTo: `${window.location.origin}/definir-senha`,
  });
});
