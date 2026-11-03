import { describe, expect, it, vi } from 'vitest';
import { redFlagGate } from '../../supabase/functions/generate-protocol/redFlagGate';

// Etapa 5a: a Edge generate-protocol só chama a IA com a avaliação sem red flag ativa ou com a liberação válida.
// A resposta do status é a de assessment_red_flag_status (tests/db/etapa5a.test.ts).
const ID = '0a0a0a0a-0000-4000-8000-00000000000a';
const answer = (data: unknown, error: unknown = null) => vi.fn(async () => ({ data, error }));

describe('redFlagGate', () => {
  it.each([
    ['sem assessmentId', undefined],
    ['assessmentId vazio', ''],
    ['assessmentId que não é uuid', 'avaliacao-1'],
    ['assessmentId que não é texto', 42],
  ])('%s: 400, sem consultar o status', async (_label, id) => {
    const fetchStatus = answer({ blocked: null, active_flags: [] });
    expect(await redFlagGate(id, fetchStatus)).toStrictEqual({ proceed: false, status: 400, body: { error: 'assessmentId is required' } });
    expect(fetchStatus).not.toHaveBeenCalled();
  });

  it.each([
    ['o status dá erro (não é dono, não existe)', answer(null, { message: 'assessment not found or not yours' })],
    ['o status lança', vi.fn(async () => { throw new Error('rede'); })],
    ['o status vem vazio', answer(null)],
    ['o status vem sem blocked', answer({ active_flags: [] })],
    ['blocked não é texto', answer({ blocked: true, active_flags: [] })],
  ])('%s: 403', async (_label, fetchStatus) => {
    expect(await redFlagGate(ID, fetchStatus)).toStrictEqual({ proceed: false, status: 403, body: { error: 'assessment not found or not yours' } });
    expect(fetchStatus).toHaveBeenCalledWith(ID);
  });

  it.each([
    ['red flag sem liberação', { blocked: 'red_flags_not_cleared', active_flags: ['fever', 'nightPain'] }, ['fever', 'nightPain']],
    ['sem anamnese', { blocked: 'anamnesis_missing', active_flags: [] }, []],
    ['active_flags estranho', { blocked: 'red_flags_not_cleared', active_flags: ['fever', 3, null] }, ['fever']],
    ['active_flags ausente', { blocked: 'red_flags_not_cleared' }, []],
  ])('%s: 409 com o motivo e as red flags', async (_label, data, activeFlags) => {
    expect(await redFlagGate(ID, answer(data))).toStrictEqual({ proceed: false, status: 409, body: { error: data.blocked, activeFlags } });
  });

  it.each([
    ['sem red flag', { blocked: null, active_flags: [], clearance: null }],
    ['com liberação válida', { blocked: null, active_flags: ['fever'], clearance: { id: ID, justification: 'x'.repeat(20) } }],
  ])('%s: segue', async (_label, data) => {
    expect(await redFlagGate(ID, answer(data))).toStrictEqual({ proceed: true });
  });
});
