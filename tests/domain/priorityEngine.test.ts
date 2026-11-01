import { describe, expect, it } from 'vitest';
import { calcularPrioridades, mapearFaseFABRIK } from '@/lib/priorityEngine';

// PriorityScore = finalWeight × severidade × impacto (tabela F), arredondado a 2 casas.
// Severidade: 1 ocorrência = mild 0.7; 2 = moderate 1.0; 3+ = severe 1.5.
// Impacto: HYPO, MOB_L, INSTAB e CM = high 1.4; HYPER = medium 1.0.
const resumo = (r: ReturnType<typeof calcularPrioridades>) =>
  r.causasPriorizadas.map(c => [c.id, c.finalWeight, c.priorityScore]);

describe('calcularPrioridades', () => {
  it('sem compensação', () => {
    expect(calcularPrioridades([], {})).toStrictEqual({
      causasPriorizadas: [],
      primaryIssues: [],
      secondaryIssues: [],
      contextosAplicados: [],
      totalCompensacoes: 0,
    });
  });

  it('uma compensação: scores, ordem e fonte', () => {
    const r = calcularPrioridades([{ id: 'knee_varus', testName: 'overhead_squat', view: 'anterior' }], {});
    expect(resumo(r)).toStrictEqual([
      ['glute_max_hypo', 2, 1.96], // 2 × 0.7 × 1.4
      ['tfl_hyper', 2, 1.4], //       2 × 0.7 × 1.0 (empate: mantém a ordem da tabela)
      ['piriformis_hyper', 2, 1.4],
    ]);
    expect(r.causasPriorizadas[0].fontes).toStrictEqual(['overhead_squat (anterior)']);
    expect(r.totalCompensacoes).toBe(1);
  });

  it('causa repetida em duas compensações soma ocorrências e fontes', () => {
    const r = calcularPrioridades([
      { id: 'knee_valgus', testName: 'overhead_squat', view: 'anterior', side: 'left' },
      { id: 'knee_varus', testName: 'overhead_squat', view: 'anterior', side: 'right' },
    ], {});
    const tfl = r.causasPriorizadas.find(c => c.id === 'tfl_hyper')!;
    expect(tfl.severityModifier).toBe(1.0); // 2 ocorrências = moderate
    expect(tfl.priorityScore).toBe(2); //      2 × 1.0 × 1.0
    expect(tfl.fontes).toStrictEqual(['overhead_squat (anterior) - left', 'overhead_squat (anterior) - right']);
  });

  it('contexto da anamnese soma ao peso (dor lombar +2)', () => {
    const r = calcularPrioridades(
      [{ id: 'lumbar_hyperextension', testName: 'overhead_squat' }],
      { painHistory: [{ region: 'lombar', intensity: 6 }] },
    );
    expect(r.contextosAplicados).toStrictEqual(['dor_lombar']);
    expect(resumo(r)).toStrictEqual([
      ['core_deep_hypo', 5, 4.9], //  (3 + 2) × 0.7 × 1.4
      ['lumbar_control', 5, 4.9], //  (3 + 2) × 0.7 × 1.4
      ['hip_flexor_tight', 5, 3.5], // (3 + 2) × 0.7 × 1.0
      ['glute_max_hypo', 2, 1.96], // sem ajuste
    ]);
  });

  // Comportamento atual: com pesos diferentes para a mesma causa, vale o peso da primeira
  // compensação da lista, então a ordem muda o score.
  it('causa repetida usa o baseWeight da primeira compensação (atual)', () => {
    const hipDrop = { id: 'hip_drop', testName: 'single_leg_squat' }; //  glute_med_hypo peso 4
    const valgo = { id: 'knee_valgus', testName: 'overhead_squat' }; // glute_med_hypo peso 3
    const gm = (r: ReturnType<typeof calcularPrioridades>) => r.causasPriorizadas.find(c => c.id === 'glute_med_hypo')!;
    expect(gm(calcularPrioridades([hipDrop, valgo], {})).priorityScore).toBe(5.6); // 4 × 1.0 × 1.4
    expect(gm(calcularPrioridades([valgo, hipDrop], {})).priorityScore).toBe(4.2); // 3 × 1.0 × 1.4
  });

  it('ordena por score e separa primárias (5) e secundárias (5)', () => {
    const r = calcularPrioridades([
      { id: 'knee_valgus', testName: 'a' },
      { id: 'lumbar_hyperextension', testName: 'b' },
      { id: 'knee_varus', testName: 'c' },
      { id: 'heels_rise', testName: 'd' },
    ], {});
    const scores = r.causasPriorizadas.map(c => c.priorityScore);
    expect(scores).toStrictEqual([...scores].sort((a, b) => b - a));
    expect(r.causasPriorizadas.length).toBeGreaterThan(10);
    expect(r.primaryIssues).toStrictEqual(r.causasPriorizadas.slice(0, 5));
    expect(r.secondaryIssues).toStrictEqual(r.causasPriorizadas.slice(5, 10));
  });

  it('compensação desconhecida não gera causa, mas conta no total', () => {
    const r = calcularPrioridades([{ id: 'nao_existe', testName: 'x' }], {});
    expect(r.causasPriorizadas).toStrictEqual([]);
    expect(r.totalCompensacoes).toBe(1);
  });
});

describe('mapearFaseFABRIK', () => {
  it('fase por categoria', () => {
    expect(mapearFaseFABRIK('MOB_L')).toStrictEqual(['mobility']);
    expect(mapearFaseFABRIK('HYPER')).toStrictEqual(['inhibition', 'mobility']);
    expect(mapearFaseFABRIK('HYPO')).toStrictEqual(['activation', 'strength']);
    expect(mapearFaseFABRIK('INSTAB')).toStrictEqual(['stability']);
    expect(mapearFaseFABRIK('CM')).toStrictEqual(['stability', 'integration']);
    expect(mapearFaseFABRIK('TECH')).toStrictEqual(['integration']);
  });
});
