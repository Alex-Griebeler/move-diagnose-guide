import { afterEach, describe, expect, it, vi } from 'vitest';
import { fuseEvidence } from '@/lib/clinical/biomechanicalScoring';
import type { PoseObjectiveThresholds } from '@/lib/clinical/clinicalThresholds';
import type { PoseResult, QualityResult } from '@/lib/clinical/types';
import type { AnalysisResult } from '@/hooks/useMovementAnalysis';
import { resetThresholdSource, THRESHOLD_SOURCES, useThresholdSource } from './thresholdSources';

vi.mock('@/integrations/supabase/client', () => import('./thresholdSources'));

afterEach(resetThresholdSource);

const QUALITY_OK: QualityResult = {
  passed: true,
  score: 0.9,
  issues: [],
  metrics: { brightness: 120, contrast: 50, sharpness: 40, width: 1280, height: 720 },
};
const QUALITY_BAD: QualityResult = {
  passed: false,
  score: 0.2,
  issues: [{ code: 'low_brightness', label: 'Imagem escura', value: 10, threshold: 40 }],
  metrics: { brightness: 10, contrast: 50, sharpness: 40, width: 1280, height: 720 },
};

const ai = (detected: string[], confidence: number): AnalysisResult => ({ detected_compensations: detected, confidence });
const pose = (findings: string[], extra: Partial<PoseResult> = {}): PoseResult => ({
  poseConfidence: 0.9,
  objectiveMetrics: { valgusAngle: 20 },
  objectiveFindings: findings,
  landmarkCount: 33,
  ...extra,
});

const NEW_REASON = 'Confiança da IA abaixo de 70%';

describe('fuseEvidence: a análise só sugere (passo 0)', () => {
  it('nenhuma combinação aplica compensação', () => {
    const aiCases = [null, ai([], 0.65), ai([], 0.8), ai(['knee_valgus'], 0.65), ai(['knee_valgus'], 0.95)];
    const poseCases = [null, pose([]), pose(['knee_valgus']), pose(['feet_abduction'], { poseConfidence: 0.3 })];
    for (const aiResult of aiCases) {
      for (const poseResult of poseCases) {
        for (const quality of [QUALITY_OK, QUALITY_BAD]) {
          const result = fuseEvidence(aiResult, poseResult, quality);
          expect(result).not.toHaveProperty('autoApplyCompensations');
          expect(result.evidenceMetadata.autoAppliedCompensations).toEqual([]);
        }
      }
    }
  });

  it('IA com achado e confiança 0,8, pose boa: "ready", sem concordância calculada e sem achado da pose', () => {
    const result = fuseEvidence(ai(['knee_valgus'], 0.8), pose(['knee_valgus']), QUALITY_OK);
    expect(result.status).toBe('ready');
    expect(result.objectiveAgreementScore).toBe(0);
    expect(result.evidenceMetadata.objectiveFindings).toEqual([]);
    expect(result.evidenceMetadata.predictedCompensations).toEqual(['knee_valgus']);
    expect(result.indeterminateReasons).toEqual([]);
  });

  it('o que só a pose aponta não vira sugestão', () => {
    const result = fuseEvidence(ai(['knee_valgus'], 0.8), pose(['feet_abduction']), QUALITY_OK);
    expect(result.evidenceMetadata.predictedCompensations).toEqual(['knee_valgus']);
    expect(result.evidenceMetadata.detectedCompensations).toEqual(['knee_valgus']);
  });

  it('IA com achado e confiança 0,65: "indeterminate", com o motivo novo', () => {
    const result = fuseEvidence(ai(['knee_valgus'], 0.65), pose([]), QUALITY_OK);
    expect(result.status).toBe('indeterminate');
    expect(result.indeterminateReasons).toEqual([NEW_REASON]);
  });

  it('IA sem achado e confiança 0,65: "ready"', () => {
    const result = fuseEvidence(ai([], 0.65), pose([]), QUALITY_OK);
    expect(result.status).toBe('ready');
    expect(result.indeterminateReasons).toEqual([]);
  });

  it('IA e pose sem achado: concordância 0, não 1', () => {
    expect(fuseEvidence(ai([], 0.8), pose([]), QUALITY_OK).objectiveAgreementScore).toBe(0);
  });

  it('IA sem achado e confiança 0,8, pose apontando algo: "ready" (antes, "indeterminate" por concordância 0)', () => {
    const result = fuseEvidence(ai([], 0.8), pose(['knee_valgus']), QUALITY_OK);
    expect(result.status).toBe('ready');
    expect(result.indeterminateReasons).toEqual([]);
  });

  it('sem pose, IA com achado e confiança 0,65: "indeterminate", com o motivo novo', () => {
    const result = fuseEvidence(ai(['knee_valgus'], 0.65), null, QUALITY_OK);
    expect(result.status).toBe('indeterminate');
    expect(result.indeterminateReasons).toEqual([NEW_REASON]);
  });

  it('qualidade reprovada: "blocked_quality"', () => {
    const result = fuseEvidence(ai(['knee_valgus'], 0.95), pose(['knee_valgus']), QUALITY_BAD);
    expect(result.status).toBe('blocked_quality');
    expect(result.evidenceMetadata.predictedCompensations).toEqual([]);
  });

  describe('a pose continua conferindo a captura, mesmo sem achado', () => {
    it('timeout da análise temporal', () => {
      const result = fuseEvidence(ai([], 0.8), pose([], { temporalTimeoutFallback: true }), QUALITY_OK);
      expect(result.status).toBe('indeterminate');
      expect(result.indeterminateReasons).toEqual(['Fallback temporal por timeout — análise com frame único']);
    });

    it('taxa de quadros válidos abaixo de 0,5', () => {
      const result = fuseEvidence(ai([], 0.8), pose([], { frameQualityPassRate: 0.4, frameCountRequested: 7 }), QUALITY_OK);
      expect(result.status).toBe('indeterminate');
      expect(result.indeterminateReasons).toEqual(['Taxa de frames válidos baixa (40%)']);
    });

    it('confiança da pose abaixo de 0,5', () => {
      const result = fuseEvidence(ai([], 0.8), pose([], { poseConfidence: 0.3 }), QUALITY_OK);
      expect(result.status).toBe('indeterminate');
      expect(result.indeterminateReasons).toEqual(['Confiança Pose baixa (30%)']);
    });

    it('confiança da IA abaixo de 0,6 continua valendo', () => {
      const result = fuseEvidence(ai(['knee_valgus'], 0.5), pose([]), QUALITY_OK);
      expect(result.status).toBe('indeterminate');
      expect(result.indeterminateReasons).toEqual(['Confiança IA baixa (50%)']);
    });
  });

  // Uma regra de pose que dispararia sempre, para provar que nenhuma fonte de configuração religa os achados
  const ALWAYS: Partial<PoseObjectiveThresholds> = {
    ohs: {
      anterior: [{ metric: 'valgusAngle', label: 'Ângulo de Valgo', threshold: 0, direction: 'above', compensationId: 'knee_valgus' }],
    },
  };

  for (const source of THRESHOLD_SOURCES) {
    it(`o snapshot marca os achados da pose desligados (fonte: ${source})`, async () => {
      await useThresholdSource(source, { poseObjective: ALWAYS as PoseObjectiveThresholds }, 'perfil-sintetico-2025');
      const result = fuseEvidence(ai([], 0.8), pose(['knee_valgus']), QUALITY_OK);
      const snapshot = result.evidenceMetadata.thresholdSnapshot;

      expect(snapshot.poseObjectiveFindingsEnabled).toBe(false);
      expect(snapshot.source).toBe(source === 'padrão' ? 'defaults' : source);
      // O perfil do backend troca a versão; por isso a marca é a flag, não a versão
      expect(result.evidenceMetadata.evidenceVersion).toBe(source === 'backend' ? 'perfil-sintetico-2025' : '2026.11.v3-p0');
      expect(result.status).toBe('ready');
      expect(result.evidenceMetadata.objectiveFindings).toEqual([]);
    });
  }
});
