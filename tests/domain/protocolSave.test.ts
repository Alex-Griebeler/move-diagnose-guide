import { describe, expect, it } from 'vitest';
import { calcularPrioridades } from '@/lib/priorityEngine';
import { buildProtocolSave } from '@/lib/protocolSave';
import type { GeneratedProtocol } from '@/lib/protocolResponse';

// O pedido de save_assessment_protocol (etapa 3d). B-13: os achados levam os pesos do motor sem
// conversão; e, com causas, a lista de achados nunca sai vazia (o servidor não sabe quantas deveria haver).
const protocol: GeneratedProtocol = {
  protocolName: 'Protocolo sintético', priorityLevel: 'high', frequencyPerWeek: 3, durationWeeks: 4, summary: 'resumo',
  exercises: [{ name: 'Mobilidade sintética', phase: 'mobility', bodyRegion: 'Tornozelo', targetMuscles: ['Sóleo'], sets: 2, reps: '10', instructions: 'i', rationale: 'r', priority: 1 }],
};
// OHS com calcanhares subindo traz Limitação de Dorsiflexão (peso 4); dor no joelho, corrida e
// vôlei somam o contexto máximo dela (6)
const engine = calcularPrioridades(
  [{ id: 'heels_rise', testName: 'OHS', view: 'Vista Lateral' }],
  { painHistory: [{ region: 'Joelho', intensity: 5 }], sports: [{ name: 'Corrida' }, { name: 'Vôlei' }] },
);

describe('buildProtocolSave', () => {
  it('um achado por causa principal, na ordem do motor, com peso 4 e contexto 6 sem conversão', () => {
    const { _findings } = buildProtocolSave('a1', protocol, engine);
    const findings = _findings as Array<Record<string, unknown>>;
    expect(engine.primaryIssues.length).toBeGreaterThan(0);
    expect(findings.map(f => f.classification_tag)).toStrictEqual(engine.primaryIssues.map(i => i.id));
    expect(findings.map(f => f.biomechanical_importance)).toStrictEqual(engine.primaryIssues.map(i => i.baseWeight));
    expect(findings.map(f => f.context_weight)).toStrictEqual(engine.primaryIssues.map(i => i.contextAdjustment));
    const dorsi = findings.find(f => f.classification_tag === 'dorsiflexion_limit');
    expect(dorsi).toMatchObject({ biomechanical_importance: 4, context_weight: 6, body_region: 'Tornozelo/Pé' });
  });

  it('cada achado tem só as colunas que a função lê, com os valores de hoje', () => {
    const { _findings } = buildProtocolSave('a1', protocol, engine);
    const issue = engine.primaryIssues[0];
    expect((_findings as unknown[])[0]).toStrictEqual({
      classification_tag: issue.id,
      body_region: expect.any(String),
      severity: expect.stringMatching(/^(mild|moderate|severe)$/),
      hyperactive_muscles: issue.categoria === 'HYPER' ? [issue.label] : [],
      hypoactive_muscles: issue.categoria === 'HYPO' ? [issue.label] : [],
      priority_score: issue.priorityScore,
      context_weight: issue.contextAdjustment,
      biomechanical_importance: issue.baseWeight,
    });
  });

  it('sem causas (aluno sem compensações) ou sem resultado do motor, a lista de achados é vazia', () => {
    expect(buildProtocolSave('a1', protocol, calcularPrioridades([], {}))._findings).toStrictEqual([]);
    expect(buildProtocolSave('a1', protocol, null)._findings).toStrictEqual([]);
  });

  it('o protocolo vai com as chaves da função, e a avaliação é a do argumento', () => {
    const request = buildProtocolSave('a1', protocol, engine);
    expect(request._assessment_id).toBe('a1');
    expect(request._protocol).toStrictEqual({
      name: 'Protocolo sintético', priority_level: 'high', frequency_per_week: 3, duration_weeks: 4, exercises: protocol.exercises,
    });
  });
});
