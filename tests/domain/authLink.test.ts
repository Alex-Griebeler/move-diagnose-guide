import { describe, expect, it } from 'vitest';
import { readAuthLink } from '@/lib/authLink';

// O link do convite e do "Esqueci minha senha" abre o app com a sessão no #; sem a tela de criar senha, o aluno
// convidado entrava uma vez e depois não tinha senha para entrar de novo.
describe('readAuthLink', () => {
  it.each([
    ['convite', '#access_token=t&refresh_token=r&type=invite'],
    ['recuperação', '#access_token=t&refresh_token=r&type=recovery'],
    ['sem o #', 'access_token=t&type=recovery'],
  ])('%s: pede a senha', (_label, hash) => {
    expect(readAuthLink(hash, '')).toStrictEqual({ needsPassword: true, failed: false });
  });

  it.each([
    ['sem link', '', ''],
    ['login por link mágico', '#access_token=t&type=magiclink', ''],
    ['confirmação de cadastro', '#access_token=t&type=signup', ''],
    ['tipo de convite sem sessão', '#type=invite', ''],
    ['âncora comum', '#secao', ''],
  ])('%s: não pede', (_label, hash, search) => {
    expect(readAuthLink(hash, search)).toStrictEqual({ needsPassword: false, failed: false });
  });

  it.each([
    ['link vencido no #', '#error=access_denied&error_code=otp_expired&error_description=Email+link+is+invalid+or+has+expired', ''],
    ['erro na query', '', '?error=access_denied&error_description=x'],
    ['erro junto com sessão', '#access_token=t&type=invite&error_code=x', ''],
  ])('%s: falhou, não pede', (_label, hash, search) => {
    expect(readAuthLink(hash, search)).toStrictEqual({ needsPassword: false, failed: true });
  });
});
