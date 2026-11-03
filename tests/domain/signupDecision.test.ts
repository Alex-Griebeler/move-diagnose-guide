import { describe, expect, it } from 'vitest';
import {
  ALREADY_LINKED, NOT_A_STUDENT, OWN_EMAIL, decideSignup, successMessage,
} from '../../supabase/functions/create-student/signupDecision';

// Cadastro de aluno: em 03/11 o profissional digitou o próprio e-mail; a função o vinculou a ele mesmo como aluno,
// não mandou e-mail e a tela disse que mandou. Depois, o convite para alunos com conta antiga que nunca entraram
// só vinculava: nenhum e-mail saía e o aluno não tinha como entrar.
const P = '11111111-1111-4111-8111-111111111111';
const S = '22222222-2222-4222-8222-222222222222';
const caller = { id: P, email: 'prof@x.invalid' };
const student = (linked = false, role: string | null = 'student', hasSignedIn = true) => ({ id: S, role, linked, hasSignedIn });

describe('decideSignup', () => {
  it.each([['invite'], ['inperson']] as const)('e-mail novo (%s): cria a conta', (mode) => {
    expect(decideSignup('aluno@x.invalid', mode, caller, null)).toStrictEqual({ action: 'create' });
  });

  it.each([
    ['o e-mail do profissional', 'prof@x.invalid', null],
    ['o e-mail do profissional, com a conta achada', 'prof@x.invalid', { id: P, role: 'professional', linked: false, hasSignedIn: true }],
    ['a conta achada é a do profissional (e-mail da sessão diferente)', 'outro@x.invalid', { id: P, role: 'professional', linked: true, hasSignedIn: true }],
    ['a conta do profissional, mesmo marcada como aluno que nunca entrou', 'outro@x.invalid', { id: P, role: 'student', linked: false, hasSignedIn: false }],
  ])('%s: recusa com 400', (_label, email, existing) => {
    for (const mode of ['invite', 'inperson'] as const) {
      expect(decideSignup(email, mode, caller, existing)).toStrictEqual({ action: 'reject', status: 400, error: OWN_EMAIL });
    }
  });

  it('compara o e-mail da sessão sem espaços nem maiúsculas', () => {
    expect(decideSignup('prof@x.invalid', 'invite', { id: P, email: ' Prof@X.invalid ' }, null))
      .toStrictEqual({ action: 'reject', status: 400, error: OWN_EMAIL });
  });

  it('sessão sem e-mail: segue pelo id', () => {
    expect(decideSignup('aluno@x.invalid', 'invite', { id: P, email: null }, null)).toStrictEqual({ action: 'create' });
    expect(decideSignup('', 'invite', { id: P, email: undefined }, null)).toStrictEqual({ action: 'create' });
  });

  it.each([['professional'], [null], ['admin']])('conta com papel %s: recusa com 409, mesmo sem nunca ter entrado', (role) => {
    for (const mode of ['invite', 'inperson'] as const) {
      for (const hasSignedIn of [true, false]) {
        expect(decideSignup('aluno@x.invalid', mode, caller, student(false, role, hasSignedIn)))
          .toStrictEqual({ action: 'reject', status: 409, error: NOT_A_STUDENT });
      }
    }
  });

  describe('aluno que já entrou alguma vez', () => {
    it.each([['invite'], ['inperson']] as const)('já vinculado (%s): recusa com 409 e diz onde avaliar de novo', (mode) => {
      expect(decideSignup('aluno@x.invalid', mode, caller, student(true)))
        .toStrictEqual({ action: 'reject', status: 409, error: ALREADY_LINKED });
    });
    it.each([['invite'], ['inperson']] as const)('não vinculado (%s): só vincula', (mode) => {
      expect(decideSignup('aluno@x.invalid', mode, caller, student())).toStrictEqual({ action: 'link', studentId: S });
    });
  });

  describe('aluno que nunca entrou', () => {
    it('convite, não vinculado: vincula e manda o e-mail de acesso', () => {
      expect(decideSignup('aluno@x.invalid', 'invite', caller, student(false, 'student', false)))
        .toStrictEqual({ action: 'sendAccess', studentId: S, link: true });
    });
    it('convite, já vinculado: só manda o e-mail de acesso de novo', () => {
      expect(decideSignup('aluno@x.invalid', 'invite', caller, student(true, 'student', false)))
        .toStrictEqual({ action: 'sendAccess', studentId: S, link: false });
    });
    it('presencial não manda e-mail: vincula, ou recusa se já vinculado', () => {
      expect(decideSignup('aluno@x.invalid', 'inperson', caller, student(false, 'student', false)))
        .toStrictEqual({ action: 'link', studentId: S });
      expect(decideSignup('aluno@x.invalid', 'inperson', caller, student(true, 'student', false)))
        .toStrictEqual({ action: 'reject', status: 409, error: ALREADY_LINKED });
    });
  });
});

describe('successMessage', () => {
  it('convite com conta nova: convite enviado', () => {
    expect(successMessage('invite', 'created', 'Ana', 'ana@x.invalid')).toBe('Convite enviado para ana@x.invalid');
  });
  it('convite com conta que já entrou: diz que nenhum e-mail foi enviado', () => {
    expect(successMessage('invite', 'linked', 'Ana', 'ana@x.invalid')).toBe('Ana já tinha conta e foi vinculado a você. Nenhum e-mail foi enviado.');
  });
  it('convite com conta que nunca entrou: diz que o link foi enviado', () => {
    expect(successMessage('invite', 'accessSent', 'Ana', 'ana@x.invalid'))
      .toBe('Ana já tinha conta e nunca entrou. Enviamos para ana@x.invalid um link para criar a senha.');
  });
  it('presencial', () => {
    expect(successMessage('inperson', 'created', 'Ana', 'ana@x.invalid')).toBe('Aluno Ana cadastrado com sucesso');
    expect(successMessage('inperson', 'linked', 'Ana', 'ana@x.invalid')).toBe('Ana já tinha conta e foi vinculado a você');
  });
});
