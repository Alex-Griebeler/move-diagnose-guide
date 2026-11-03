import { describe, expect, it } from 'vitest';
import { FunctionsFetchError, FunctionsHttpError } from '@supabase/supabase-js';
import { functionErrorMessage } from '@/lib/functionError';

// Cadastro de aluno: num 4xx/5xx da Edge, a tela mostrava "Edge Function returned a non-2xx status code"
// em vez da mensagem da função, que vem no corpo como { error }.
const http = (body: string, status = 409) =>
  new FunctionsHttpError(new Response(body, { status, headers: { 'Content-Type': 'application/json' } }));

describe('functionErrorMessage', () => {
  it('mostra a mensagem da função', async () => {
    const err = http(JSON.stringify({ error: 'Este aluno já está vinculado a você' }));
    expect(err.message).toBe('Edge Function returned a non-2xx status code');
    expect(await functionErrorMessage(err, 'Erro ao cadastrar aluno')).toBe('Este aluno já está vinculado a você');
  });

  it('pode ser lida duas vezes (o corpo não se gasta)', async () => {
    const err = http(JSON.stringify({ error: 'x' }), 400);
    expect(await functionErrorMessage(err, 'f')).toBe('x');
    expect(await functionErrorMessage(err, 'f')).toBe('x');
  });

  it.each([
    ['corpo que não é JSON', http('Internal Server Error', 500)],
    ['JSON sem error', http(JSON.stringify({ message: 'x' }))],
    ['error vazio', http(JSON.stringify({ error: '  ' }))],
    ['error que não é texto', http(JSON.stringify({ error: { code: 1 } }))],
    ['falha de rede', new FunctionsFetchError(new TypeError('Failed to fetch'))],
    ['erro comum', new Error('boom')],
    ['nada', null],
  ])('%s: usa o texto padrão', async (_label, err) => {
    expect(await functionErrorMessage(err, 'Erro ao cadastrar aluno')).toBe('Erro ao cadastrar aluno');
  });
});
