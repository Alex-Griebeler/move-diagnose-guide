// What create-student does with the e-mail it got: create a new account, link an account that already exists, send
// the access e-mail to an account that never signed in, or refuse. Pure on purpose (no URL imports, no Deno): Vitest
// tests it in tests/domain/signupDecision.test.ts.

export type SignupMode = 'invite' | 'inperson';

export interface ExistingAccount {
  id: string;
  role: string | null;
  linked: boolean;
  hasSignedIn: boolean;
}

export type SignupDecision =
  | { action: 'create' }
  | { action: 'link'; studentId: string }
  | { action: 'sendAccess'; studentId: string; link: boolean }
  | { action: 'reject'; status: 400 | 409; error: string };

export type SignupOutcome = 'created' | 'linked' | 'accessSent';

export const OWN_EMAIL = 'Este é o e-mail da sua conta. Digite o e-mail do aluno.';
export const NOT_A_STUDENT = 'Este e-mail é de uma conta que não é de aluno e não pode ser cadastrado como aluno.';
export const ALREADY_LINKED = 'Este aluno já está vinculado a você. Para avaliá-lo de novo, use "Nova avaliação" no painel.';

export function decideSignup(
  email: string,
  mode: SignupMode,
  caller: { id: string; email: string | null | undefined },
  existing: ExistingAccount | null,
): SignupDecision {
  // The professional's own account, found by e-mail or by id: before, it was linked to itself as a student
  const callerEmail = (caller.email ?? '').trim().toLowerCase();
  if ((callerEmail !== '' && email === callerEmail) || existing?.id === caller.id) {
    return { action: 'reject', status: 400, error: OWN_EMAIL };
  }
  if (!existing) {
    return { action: 'create' };
  }
  if (existing.role !== 'student') {
    return { action: 'reject', status: 409, error: NOT_A_STUDENT };
  }
  // An invite to a student who never signed in sends the e-mail to create the password, linked or not: before, no
  // e-mail went out and the student had no way in
  if (mode === 'invite' && !existing.hasSignedIn) {
    return { action: 'sendAccess', studentId: existing.id, link: !existing.linked };
  }
  if (existing.linked) {
    return { action: 'reject', status: 409, error: ALREADY_LINKED };
  }
  return { action: 'link', studentId: existing.id };
}

export function successMessage(mode: SignupMode, outcome: SignupOutcome, fullName: string, email: string): string {
  if (outcome === 'accessSent') {
    return `${fullName} já tinha conta e nunca entrou. Enviamos para ${email} um link para criar a senha.`;
  }
  if (outcome === 'linked') {
    // An account that already signed in keeps its password: no e-mail goes out, whatever the mode
    return mode === 'invite'
      ? `${fullName} já tinha conta e foi vinculado a você. Nenhum e-mail foi enviado.`
      : `${fullName} já tinha conta e foi vinculado a você`;
  }
  return mode === 'invite' ? `Convite enviado para ${email}` : `Aluno ${fullName} cadastrado com sucesso`;
}
