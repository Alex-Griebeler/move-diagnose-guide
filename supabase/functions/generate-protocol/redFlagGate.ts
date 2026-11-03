// Etapa 5a: no protocol is generated while the assessment has a red flag the professional has not cleared.
// Pure on purpose (no URL imports, no Deno): Vitest tests it in tests/domain/redFlagGate.test.ts.
// Saving goes through save_assessment_protocol, which checks again; this only keeps the AI from being called.

export type RedFlagGateResult =
  | { proceed: true }
  | { proceed: false; status: 400 | 403 | 409; body: { error: string; activeFlags?: string[] } };

// The answer of supabase.rpc('assessment_red_flag_status'), called with the user's own client
export type RedFlagStatusFetcher = (assessmentId: string) => PromiseLike<{ data: unknown; error: unknown }>;

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export async function redFlagGate(assessmentId: unknown, fetchStatus: RedFlagStatusFetcher): Promise<RedFlagGateResult> {
  if (typeof assessmentId !== 'string' || !UUID.test(assessmentId)) {
    return { proceed: false, status: 400, body: { error: 'assessmentId is required' } };
  }

  let answer: { data: unknown; error: unknown };
  try {
    answer = await fetchStatus(assessmentId);
  } catch {
    answer = { data: null, error: true };
  }
  const status = answer.data as { blocked?: unknown; active_flags?: unknown } | null;
  // Not the owner, no such assessment, or an answer we cannot read: nothing is generated
  if (answer.error || !status || typeof status !== 'object' || (status.blocked !== null && typeof status.blocked !== 'string')) {
    return { proceed: false, status: 403, body: { error: 'assessment not found or not yours' } };
  }

  if (status.blocked === null) {
    return { proceed: true };
  }
  const activeFlags = Array.isArray(status.active_flags) ? status.active_flags.filter((f): f is string => typeof f === 'string') : [];
  return { proceed: false, status: 409, body: { error: status.blocked, activeFlags } };
}
