import { describe, expect, it } from 'vitest';
import { cutoffLabel, getTestById, passesCutoff, segmentalTests } from '@/data/segmentalTestMappings';

const test = (id: string) => {
  const found = getTestById(id);
  if (!found) throw new Error(`teste ${id} não está no catálogo`);
  return found;
};

describe('segmentares: direção do corte (passo 0)', () => {
  it('peitoral menor passa com distância até 2,5 cm', () => {
    const pec = test('pec_minor_length');
    expect(pec.passWhen).toBe('atMost');
    expect(passesCutoff(1.5, pec.cutoffValue, pec.passWhen)).toBe(true);
    expect(passesCutoff(2.5, pec.cutoffValue, pec.passWhen)).toBe(true);
    expect(passesCutoff(4, pec.cutoffValue, pec.passWhen)).toBe(false);
    expect(cutoffLabel(pec.cutoffValue!, pec.unit, pec.passWhen)).toBe('≤ 2.5 cm');
  });

  it('dorsiflexão continua passando com 10 cm ou mais', () => {
    const ankle = test('ankle_dorsiflexion');
    expect(ankle.passWhen).toBeUndefined();
    expect(passesCutoff(12, ankle.cutoffValue, ankle.passWhen)).toBe(true);
    expect(passesCutoff(8, ankle.cutoffValue, ankle.passWhen)).toBe(false);
    expect(cutoffLabel(ankle.cutoffValue!, ankle.unit, ankle.passWhen)).toBe('≥ 10 cm');
  });

  it('corte 0 (Thomas): 0 passa, −5 falha', () => {
    const thomas = test('hip_flexor_length');
    expect(thomas.cutoffValue).toBe(0);
    expect(passesCutoff(0, thomas.cutoffValue, thomas.passWhen)).toBe(true);
    expect(passesCutoff(-5, thomas.cutoffValue, thomas.passWhen)).toBe(false);
  });

  it('sem valor ou sem corte, não há resultado', () => {
    expect(passesCutoff(null, 10)).toBeNull();
    expect(passesCutoff(undefined, 10)).toBeNull();
    expect(passesCutoff(Number.NaN, 10)).toBeNull();
    expect(passesCutoff(10, null)).toBeNull();
    expect(passesCutoff(10, undefined)).toBeNull();
  });

  it('só o peitoral menor mudou de direção', () => {
    const atMost = segmentalTests.filter(t => t.passWhen === 'atMost').map(t => t.id);
    expect(atMost).toEqual(['pec_minor_length']);
    expect(segmentalTests.filter(t => t.passWhen !== undefined && t.passWhen !== 'atMost')).toEqual([]);
  });

  it('Thomas e Ober dizem na instrução o que é positivo e negativo', () => {
    for (const id of ['hip_flexor_length', 'ober_test']) {
      expect(test(id).instructions, id).toMatch(/positivo = (coxa )?abaixo da horizontal; negativo = acima/);
    }
  });
});
