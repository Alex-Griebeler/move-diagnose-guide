import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  getClinicalThresholds,
  getDefaultClinicalThresholds,
  POSE_OBJECTIVE_FINDINGS_ENABLED,
  type PoseObjectiveThresholds,
} from '@/lib/clinical/clinicalThresholds';
import { evaluatePoseFindings } from '@/lib/clinical/poseBiomechanics';
import type { MetricThreshold } from '@/lib/clinical/types';
import { resetThresholdSource, THRESHOLD_SOURCES, useThresholdSource } from './thresholdSources';

vi.mock('@/integrations/supabase/client', () => import('./thresholdSources'));

afterEach(resetThresholdSource);

const TEST_TYPES = { ohs: 'overhead_squat', sls: 'single_leg_squat', pushup: 'pushup' } as const;

// Cada regra do config com uma métrica que passa do limiar dela
function triggeringCases(poseObjective: PoseObjectiveThresholds) {
  return (Object.keys(TEST_TYPES) as (keyof typeof TEST_TYPES)[]).flatMap(testKey =>
    Object.entries(poseObjective[testKey]).flatMap(([viewType, rules]) =>
      (rules as MetricThreshold[]).map(rule => ({
        testType: TEST_TYPES[testKey],
        viewType,
        rule,
        metrics: { [rule.metric]: rule.direction === 'above' ? rule.threshold + 1 : rule.threshold - 1 },
      })),
    ),
  );
}

// Cópia literal da regra de antes do passo 0 (poseBiomechanics.ts em 0289e7f), para provar que cada caso disparava
function findingsBefore(metrics: Record<string, number>, rules: MetricThreshold[]): string[] {
  const findings: string[] = [];
  rules.forEach(threshold => {
    const value = metrics[threshold.metric];
    if (value === undefined) return;
    const flagged = threshold.direction === 'above' ? value > threshold.threshold : value < threshold.threshold;
    if (flagged) findings.push(threshold.compensationId);
  });
  return findings;
}

// Regra nova e limiar 0, que dispararia com qualquer valor positivo
const OVERRIDE: Partial<PoseObjectiveThresholds> = {
  ohs: {
    anterior: [
      { metric: 'valgusAngle', label: 'Ângulo de Valgo', threshold: 0, direction: 'above', compensationId: 'knee_valgus' },
      { metric: 'metricaSintetica', label: 'Regra nova', threshold: 0, direction: 'above', compensationId: 'regra_sintetica' },
    ],
  },
};

describe('pose: nenhum alerta automático (passo 0)', () => {
  it('a trava é uma constante de código, desligada', () => {
    expect(POSE_OBJECTIVE_FINDINGS_ENABLED).toBe(false);
  });

  it('as 13 regras do padrão, que antes disparavam, não devolvem achado', () => {
    const cases = triggeringCases(getDefaultClinicalThresholds().poseObjective);
    expect(cases).toHaveLength(13);
    for (const { testType, viewType, rule, metrics } of cases) {
      expect(findingsBefore(metrics, [rule]), rule.compensationId).toEqual([rule.compensationId]);
      expect(evaluatePoseFindings(metrics, testType, viewType, getDefaultClinicalThresholds().poseObjective), rule.compensationId)
        .toEqual([]);
    }
  });

  it('o lado na vista (left_/right_) também não devolve achado', () => {
    const poseObjective = getDefaultClinicalThresholds().poseObjective;
    expect(evaluatePoseFindings({ pelvicDrop: 20 }, 'single_leg_squat', 'left_posterior', poseObjective)).toEqual([]);
    expect(evaluatePoseFindings({ valgusProxy: 20 }, 'single_leg_squat', 'right_anterior', poseObjective)).toEqual([]);
  });

  for (const source of THRESHOLD_SOURCES) {
    it(`configuração vinda de ${source}: nenhuma regra devolve achado, nem a nova nem a de limiar 0`, async () => {
      await useThresholdSource(source, { poseObjective: OVERRIDE as PoseObjectiveThresholds });
      const poseObjective = getClinicalThresholds().poseObjective;
      if (source !== 'padrão') expect(poseObjective.ohs.anterior.map(r => r.compensationId)).toContain('regra_sintetica');

      const cases = triggeringCases(poseObjective);
      expect(cases.length).toBeGreaterThanOrEqual(13);
      for (const { testType, viewType, rule, metrics } of cases) {
        expect(findingsBefore(metrics, [rule]), rule.compensationId).toEqual([rule.compensationId]);
        expect(evaluatePoseFindings(metrics, testType, viewType, poseObjective), rule.compensationId).toEqual([]);
      }
    });
  }
});
