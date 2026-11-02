import { describe, expect, it } from 'vitest';
import { parseGeneratedProtocol, PRIORITY_LEVELS } from '@/lib/protocolResponse';

// F-15: a resposta de generate-protocol é conferida antes de ir para a tela ou para o banco.
const exercise = { name: 'Agachamento sintético', phase: 'strength', bodyRegion: 'Quadril', targetMuscles: ['Glúteo'], sets: 3, reps: '10', instructions: 'i', rationale: 'r', priority: 1 };
const valid = { protocolName: 'Protocolo sintético', priorityLevel: 'medium', frequencyPerWeek: 3, durationWeeks: 4, summary: 's', exercises: [exercise] };

describe('parseGeneratedProtocol', () => {
  it('aceita a resposta completa sem mudar nada', () => {
    expect(parseGeneratedProtocol(valid)).toStrictEqual(valid);
  });

  it('os níveis aceitos são os do enum priority_level do banco', () => {
    expect(PRIORITY_LEVELS).toStrictEqual(['critical', 'high', 'medium', 'low', 'maintenance']);
    for (const level of PRIORITY_LEVELS) expect(parseGeneratedProtocol({ ...valid, priorityLevel: level })).not.toBeNull();
  });

  it('normaliza o que a tela contorna: músculos ausentes, textos ausentes, repetições numéricas', () => {
    const parsed = parseGeneratedProtocol({ ...valid, summary: undefined, exercises: [{ name: 'Ponte', phase: 'activation', reps: 12 }] });
    expect(parsed?.summary).toBe('');
    expect(parsed?.exercises[0]).toStrictEqual({
      name: 'Ponte', phase: 'activation', bodyRegion: '', targetMuscles: [], sets: 0, reps: '12', instructions: '', rationale: '', priority: 0,
    });
    expect(parseGeneratedProtocol({ ...valid, exercises: [{ ...exercise, targetMuscles: 'Glúteo' }] })?.exercises[0].targetMuscles).toStrictEqual([]);
    expect(parseGeneratedProtocol({ ...valid, exercises: [{ ...exercise, targetMuscles: ['Glúteo', 3, null] }] })?.exercises[0].targetMuscles).toStrictEqual(['Glúteo']);
  });

  it('mantém a fase como veio, mesmo fora das seis da tela (quem decide é a tela)', () => {
    expect(parseGeneratedProtocol({ ...valid, exercises: [{ ...exercise, phase: 'warmup' }] })?.exercises[0].phase).toBe('warmup');
  });

  it.each([
    ['não é objeto', null],
    ['lista no lugar do objeto', [valid]],
    ['sem nome', { ...valid, protocolName: '' }],
    ['nível fora do enum', { ...valid, priorityLevel: 'urgent' }],
    ['frequência zero', { ...valid, frequencyPerWeek: 0 }],
    ['frequência fracionada', { ...valid, frequencyPerWeek: 2.5 }],
    ['duração em texto', { ...valid, durationWeeks: '4' }],
    ['sem exercícios', { ...valid, exercises: [] }],
    ['exercícios não é lista', { ...valid, exercises: {} }],
    ['exercício sem nome', { ...valid, exercises: [{ ...exercise, name: '' }] }],
    ['exercício sem fase', { ...valid, exercises: [{ ...exercise, phase: undefined }] }],
    ['exercício nulo', { ...valid, exercises: [exercise, null] }],
  ])('recusa: %s', (_, raw) => {
    expect(parseGeneratedProtocol(raw)).toBeNull();
  });
});
