import { describe, expect, it } from 'vitest';
import {
  ALREADY_LINKED, NOT_A_STUDENT, OWN_EMAIL, decideSignup, successMessage,
} from '../../supabase/functions/create-student/signupDecision';

// Cadastro de aluno: em 03/11 o profissional digitou o próprio e-mail; a função o vinculou a ele mesmo como aluno,
// não mandou e-mail e a tela disse que mandou.
const P = '11111111-1111-4111-8111-111111111111';
const S = '22222222-2222-4222-8222-222222222222';
const caller = { id: P, email: 'prof@x.invalid' };
const student = (linked = false, role: string | null = 'student') => ({ id: S, role, linked });

describe('decideSignup', () => {
  it('e-mail novo: cria a conta', () => {
    expect(decideSignup('aluno@x.invalid', caller, null)).toStrictEqual({ action: 'create' });
  });

  it.each([
    ['o e-mail do profissional', 'prof@x.invalid', null],
    ['o e-mail do profissional, com a conta achada', 'prof@x.invalid', { id: P, role: 'professional', linked: false }],
    ['a conta achada é a do profissional (e-mail da sessão diferente)', 'outro@x.invalid', { id: P, role: 'professional', linked: true }],
  ])('%s: recusa com 400', (_label, email, existing) => {
    expect(decideSignup(email, caller, existing)).toStrictEqual({ action: 'reject', status: 400, error: OWN_EMAIL });
  });

  it('compara o e-mail da sessão sem espaços nem maiúsculas', () => {
    expect(decideSignup('prof@x.invalid', { id: P, email: ' Prof@X.invalid ' }, null))
      .toStrictEqual({ action: 'reject', status: 400, error: OWN_EMAIL });
  });

  it('sessão sem e-mail: segue pelo id', () => {
    expect(decideSignup('aluno@x.invalid', { id: P, email: null }, null)).toStrictEqual({ action: 'create' });
    expect(decideSignup('', { id: P, email: undefined }, null)).toStrictEqual({ action: 'create' });
  });

  it.each([['professional'], [null], ['admin']])('conta com papel %s: recusa com 409', (role) => {
    expect(decideSignup('aluno@x.invalid', caller, student(false, role)))
      .toStrictEqual({ action: 'reject', status: 409, error: NOT_A_STUDENT });
  });

  it('aluno já vinculado: recusa com 409 e diz onde avaliar de novo', () => {
    expect(decideSignup('aluno@x.invalid', caller, student(true)))
      .toStrictEqual({ action: 'reject', status: 409, error: ALREADY_LINKED });
  });

  it('aluno com conta, ainda não vinculado: vincula', () => {
    expect(decideSignup('aluno@x.invalid', caller, student())).toStrictEqual({ action: 'link', studentId: S });
  });
});

describe('successMessage', () => {
  it('convite com conta nova: convite enviado', () => {
    expect(successMessage('invite', false, 'Ana', 'ana@x.invalid')).toBe('Convite enviado para ana@x.invalid');
  });
  it('convite com conta que já existia: diz que nenhum e-mail foi enviado', () => {
    expect(successMessage('invite', true, 'Ana', 'ana@x.invalid')).toBe('Ana já tinha conta e foi vinculado a você. Nenhum e-mail foi enviado.');
  });
  it('presencial', () => {
    expect(successMessage('inperson', false, 'Ana', 'ana@x.invalid')).toBe('Aluno Ana cadastrado com sucesso');
    expect(successMessage('inperson', true, 'Ana', 'ana@x.invalid')).toBe('Ana já tinha conta e foi vinculado a você');
  });
});
