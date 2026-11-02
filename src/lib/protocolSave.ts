// The request for save_assessment_protocol: the protocol, one finding per primary cause, and the
// assessment it completes (migration 20261103120000_etapa3d_gravacao_protocolo.sql).
import type { Json } from '@/integrations/supabase/types';
import type { PriorityEngineResult } from '@/lib/priorityEngine';
import type { GeneratedProtocol } from '@/lib/protocolResponse';

export const getBodyRegionFromCausa = (causaId: string): string => {
  if (causaId.includes('glute') || causaId.includes('hip') || causaId.includes('tfl') || causaId.includes('piriformis')) return 'Quadril';
  if (causaId.includes('ankle') || causaId.includes('dorsi') || causaId.includes('tib') || causaId.includes('calf') || causaId.includes('foot')) return 'Tornozelo/Pé';
  if (causaId.includes('core') || causaId.includes('lumbar') || causaId.includes('spine')) return 'Core/Lombar';
  if (causaId.includes('shoulder') || causaId.includes('scapula') || causaId.includes('serratus') || causaId.includes('trap') || causaId.includes('pec')) return 'Ombro/Escápula';
  if (causaId.includes('neck') || causaId.includes('cervical')) return 'Cervical';
  if (causaId.includes('knee') || causaId.includes('quad')) return 'Joelho';
  return 'Geral';
};

export const getSeverityFromScore = (score: number): 'mild' | 'moderate' | 'severe' => {
  if (score >= 6) return 'severe';
  if (score >= 4) return 'moderate';
  return 'mild';
};

export interface ProtocolSaveRequest {
  _assessment_id: string;
  _protocol: Json;
  _findings: Json;
}

export function buildProtocolSave(
  assessmentId: string,
  protocol: GeneratedProtocol,
  priorityResult: PriorityEngineResult | null,
): ProtocolSaveRequest {
  // B-13: the weights go as the engine computed them (the database accepts 0..4 and 0..6)
  const findings = (priorityResult?.primaryIssues ?? []).map(issue => ({
    classification_tag: issue.id,
    body_region: getBodyRegionFromCausa(issue.id),
    severity: getSeverityFromScore(issue.priorityScore),
    hyperactive_muscles: issue.categoria === 'HYPER' ? [issue.label] : [],
    hypoactive_muscles: issue.categoria === 'HYPO' ? [issue.label] : [],
    priority_score: issue.priorityScore,
    context_weight: issue.contextAdjustment,
    biomechanical_importance: issue.baseWeight,
  }));
  return {
    _assessment_id: assessmentId,
    _protocol: {
      name: protocol.protocolName,
      priority_level: protocol.priorityLevel,
      frequency_per_week: protocol.frequencyPerWeek,
      duration_weeks: protocol.durationWeeks,
      exercises: protocol.exercises as unknown as Json,
    },
    _findings: findings,
  };
}
