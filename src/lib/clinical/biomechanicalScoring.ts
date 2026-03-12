// ============================================
// Biomechanical Scoring & Evidence Fusion
// Fusão de evidências (IA + Pose), scoring e status
// ============================================

import { CLINICAL_THRESHOLDS } from './clinicalThresholds';
import type {
  QualityResult,
  PoseResult,
  EvidenceMetadata,
  BiomechanicalScoreResult,
  ViewReliabilityStatus,
  ReliabilityLevel,
} from './types';
import type { AnalysisResult } from '@/hooks/useMovementAnalysis';
import { compensacaoCausas } from '@/data/weightEngine';

/**
 * Fuse AI analysis and objective pose findings into a single evidence package.
 * Determines reliability status and whether compensations should be auto-applied.
 */
export function fuseEvidence(
  aiResult: AnalysisResult | null,
  poseResult: PoseResult | null,
  qualityResult: QualityResult
): BiomechanicalScoreResult {
  const thresholds = CLINICAL_THRESHOLDS.fusion;
  const indeterminateReasons: string[] = [];

  // 1. Quality gate — bloqueante
  if (!qualityResult.passed) {
    return buildBlockedResult(qualityResult, indeterminateReasons);
  }

  // 2. Extract findings from both sources
  const aiFindings = aiResult?.detected_compensations || [];
  const aiConfidence = aiResult?.confidence ?? 0;
  const poseFindings = poseResult?.objectiveFindings || [];
  const poseConfidence = poseResult?.poseConfidence ?? 0;

  // 3. Compute agreement score (Jaccard index)
  const objectiveAgreementScore = computeJaccardIndex(aiFindings, poseFindings);

  // 4. Determine status
  let status: ViewReliabilityStatus = 'ready';

  if (aiConfidence < thresholds.minAiConfidence) {
    status = 'indeterminate';
    indeterminateReasons.push(`Confiança IA baixa (${Math.round(aiConfidence * 100)}%)`);
  }

  if (poseResult && poseConfidence < CLINICAL_THRESHOLDS.pose.minPoseConfidence) {
    status = 'indeterminate';
    indeterminateReasons.push(`Confiança Pose baixa (${Math.round(poseConfidence * 100)}%)`);
  }

  if (poseResult && objectiveAgreementScore < thresholds.minAgreementScore) {
    status = 'indeterminate';
    indeterminateReasons.push(
      `Baixa concordância entre IA e análise objetiva (${Math.round(objectiveAgreementScore * 100)}%)`
    );
  }

  // 5. Determine which compensations to auto-apply
  let autoApplyCompensations: string[] = [];

  if (status === 'ready') {
    if (poseResult && objectiveAgreementScore >= thresholds.autoApplyThreshold) {
      // High agreement: use union of both
      autoApplyCompensations = [...new Set([...aiFindings, ...poseFindings])];
    } else if (!poseResult) {
      // No pose data: use AI findings only if confidence is good
      autoApplyCompensations = aiConfidence >= thresholds.autoApplyThreshold ? aiFindings : [];
      if (aiConfidence < thresholds.autoApplyThreshold && aiFindings.length > 0) {
        status = 'indeterminate';
        indeterminateReasons.push('Confiança insuficiente para auto-aplicação');
      }
    } else {
      // Low agreement but not below minimum: use intersection only
      autoApplyCompensations = aiFindings.filter(f => poseFindings.includes(f));
    }
  }

  // 6. Compute biomechanical score
  const allDetected = [...new Set([...aiFindings, ...poseFindings])];
  const biomechanicalScore = computeBiomechanicalScore(
    allDetected,
    aiConfidence,
    qualityResult.score
  );

  // 7. Determine reliability level
  const reliability = computeReliability(status, aiConfidence, poseConfidence, objectiveAgreementScore);

  // 8. Build evidence metadata
  const evidenceMetadata: EvidenceMetadata = {
    status,
    evidenceVersion: CLINICAL_THRESHOLDS.version,
    qualityScore: qualityResult.score,
    qualityPassed: qualityResult.passed,
    qualityIssues: qualityResult.issues.map(i => i.code),
    aiConfidence,
    poseConfidence,
    biomechanicalScore,
    detectedCompensations: allDetected,
    autoAppliedCompensations: autoApplyCompensations,
    objectiveAgreementScore,
    objectiveFindings: poseFindings,
    objectiveMetrics: poseResult?.objectiveMetrics || {},
    indeterminateReasons,
    computedAt: new Date().toISOString(),
  };

  return {
    status,
    reliability,
    qualityScore: qualityResult.score,
    biomechanicalScore,
    objectiveAgreementScore,
    autoApplyCompensations,
    indeterminateReasons,
    evidenceMetadata,
  };
}

/**
 * Check if evidence metadata exists on a view data object.
 * Used for backward compatibility with legacy drafts.
 */
export function hasEvidenceMetadata(viewData: unknown): viewData is { evidenceMetadata: EvidenceMetadata } {
  return (
    viewData !== null &&
    typeof viewData === 'object' &&
    'evidenceMetadata' in viewData &&
    typeof (viewData as any).evidenceMetadata === 'object' &&
    (viewData as any).evidenceMetadata !== null &&
    'status' in (viewData as any).evidenceMetadata
  );
}

/**
 * Get the reliability status from view data, returning null for legacy data.
 */
export function getViewStatus(viewData: unknown): ViewReliabilityStatus | null {
  if (hasEvidenceMetadata(viewData)) {
    return viewData.evidenceMetadata.status;
  }
  return null;
}

// ============================================
// Internal Helpers
// ============================================

function buildBlockedResult(
  qualityResult: QualityResult,
  _reasons: string[]
): BiomechanicalScoreResult {
  const evidenceMetadata: EvidenceMetadata = {
    status: 'blocked_quality',
    evidenceVersion: CLINICAL_THRESHOLDS.version,
    qualityScore: qualityResult.score,
    qualityPassed: false,
    qualityIssues: qualityResult.issues.map(i => i.code),
    aiConfidence: 0,
    poseConfidence: 0,
    biomechanicalScore: 0,
    detectedCompensations: [],
    autoAppliedCompensations: [],
    objectiveAgreementScore: 0,
    objectiveFindings: [],
    objectiveMetrics: {},
    indeterminateReasons: qualityResult.issues.map(i => i.label),
    computedAt: new Date().toISOString(),
  };

  return {
    status: 'blocked_quality',
    reliability: 'low',
    qualityScore: qualityResult.score,
    biomechanicalScore: 0,
    objectiveAgreementScore: 0,
    autoApplyCompensations: [],
    indeterminateReasons: qualityResult.issues.map(i => i.label),
    evidenceMetadata,
  };
}

function computeJaccardIndex(setA: string[], setB: string[]): number {
  if (setA.length === 0 && setB.length === 0) return 1; // both empty = perfect agreement
  const union = new Set([...setA, ...setB]);
  const intersection = setA.filter(item => setB.includes(item));
  return union.size === 0 ? 0 : intersection.length / union.size;
}

function computeBiomechanicalScore(
  compensationIds: string[],
  aiConfidence: number,
  qualityScore: number
): number {
  if (compensationIds.length === 0) return 0;

  let totalWeight = 0;

  compensationIds.forEach(compId => {
    const causes = compensacaoCausas[compId];
    if (causes) {
      // Use max base weight among causes as the compensation's biomechanical importance
      const maxWeight = Math.max(...causes.map(c => c.baseWeight));
      totalWeight += maxWeight;
    } else {
      totalWeight += 1; // default weight for unknown compensations
    }
  });

  // Modulate by confidence and quality
  const confidenceFactor = Math.max(0.3, aiConfidence);
  const qualityFactor = Math.max(0.3, qualityScore);

  return Math.round(totalWeight * confidenceFactor * qualityFactor * 100) / 100;
}

function computeReliability(
  status: ViewReliabilityStatus,
  aiConfidence: number,
  poseConfidence: number,
  agreementScore: number
): ReliabilityLevel {
  if (status === 'blocked_quality') return 'low';
  if (status === 'indeterminate') return 'low';

  const avgConfidence = poseConfidence > 0
    ? (aiConfidence + poseConfidence) / 2
    : aiConfidence;

  if (avgConfidence >= 0.8 && agreementScore >= 0.7) return 'high';
  if (avgConfidence >= 0.6) return 'moderate';
  return 'low';
}
