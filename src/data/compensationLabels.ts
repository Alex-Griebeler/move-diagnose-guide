// ============================================
// COMPENSATION_LABELS - Single Source of Truth
// All components import from here - no duplication
// ============================================

import { 
  ohsAnteriorCompensations, 
  ohsLateralCompensations, 
  ohsPosteriorCompensations,
  slsAnteriorCompensations,
  slsPosteriorCompensations,
  pushupPosteriorCompensations,
} from './compensationMappings';

// ============================================
// Auto-generate labels from compensationMappings
// ============================================

const allMappings = [
  ...ohsAnteriorCompensations,
  ...ohsLateralCompensations,
  ...ohsPosteriorCompensations,
  ...slsAnteriorCompensations,
  ...slsPosteriorCompensations,
  ...pushupPosteriorCompensations,
];

export const COMPENSATION_LABELS: Record<string, string> = {};

allMappings.forEach(mapping => {
  COMPENSATION_LABELS[mapping.id] = mapping.label;
});

// ============================================
// Add aliases for backward compatibility
// ============================================

COMPENSATION_LABELS['butt_wink'] = COMPENSATION_LABELS['spine_flexion'] || 'Flexão da Coluna (butt wink)';
COMPENSATION_LABELS['arms_fall'] = COMPENSATION_LABELS['arms_fall_forward'] || 'Braços caem';
COMPENSATION_LABELS['foot_pronation'] = COMPENSATION_LABELS['feet_eversion'] || 'Pronação do Pé';
COMPENSATION_LABELS['hips_drop'] = 'Quadril Cai';
COMPENSATION_LABELS['hip_elevation'] = 'Elevação do Quadril';
COMPENSATION_LABELS['lumbar_extension'] = 'Extensão Lombar';
COMPENSATION_LABELS['head_forward'] = 'Cabeça Projetada';
COMPENSATION_LABELS['misalignment'] = 'Desalinhamento';

// ============================================
// Helper function
// ============================================

export function getCompensationLabel(id: string): string {
  return COMPENSATION_LABELS[id] || id;
}

// ============================================
// Get all compensation IDs
// ============================================

export function getAllCompensationIds(): string[] {
  return Object.keys(COMPENSATION_LABELS);
}
