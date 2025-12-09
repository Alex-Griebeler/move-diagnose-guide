// ============================================
// TABELA B - Mapeamento Causa → Testes Segmentados
// Superprompt: "Se GluteMed_hypo → Trendelenburg + SLS_control"
// ============================================

import { CAUSE_IDS, ALL_CAUSE_IDS } from './causeIds';

// Mapeamento: causaId → array de testIds
export const causaToTests: Record<string, string[]> = {
  // ============================================
  // HYPO - Hipoatividades
  // ============================================
  
  // Superprompt: "Se GluteMed_hypo → Trendelenburg + SLS_control"
  [CAUSE_IDS.GLUTE_MED_HYPO]: ['trendelenburg', 'single_leg_squat_control', 'hip_abduction_strength'],
  [CAUSE_IDS.GLUTE_MIN_HYPO]: ['trendelenburg', 'hip_abduction_strength'],
  [CAUSE_IDS.GLUTE_MAX_HYPO]: ['hip_flexor_length', 'prone_instability'],
  [CAUSE_IDS.GLUTE_MAX_UPPER_HYPO]: ['hip_abduction_strength', 'ober_test'],
  
  [CAUSE_IDS.TIB_POST_HYPO]: ['short_foot', 'ankle_dorsiflexion'],
  [CAUSE_IDS.FOOT_INTRINSIC_HYPO]: ['short_foot'],
  
  // Superprompt: "Se Serratus_hypo → ScapularDyskinesis + ShoulderFlexion"
  [CAUSE_IDS.SERRATUS_HYPO]: ['scapular_dyskinesis', 'shoulder_flexion', 'serratus_strength'],
  [CAUSE_IDS.TRAP_INF_HYPO]: ['scapular_dyskinesis', 'shoulder_flexion'],
  [CAUSE_IDS.TRAP_MID_HYPO]: ['scapular_dyskinesis'],
  [CAUSE_IDS.RHOMBOID_HYPO]: ['scapular_dyskinesis'],
  
  [CAUSE_IDS.DEEP_NECK_FLEXOR_HYPO]: ['cervical_flexion_endurance'],
  
  // Superprompt: "Se Core_deep_hypo → DeadBug"
  [CAUSE_IDS.CORE_DEEP_HYPO]: ['dead_bug', 'trunk_endurance_flexor', 'prone_instability'],
  [CAUSE_IDS.CORE_LATERAL_HYPO]: ['trunk_endurance_lateral', 'dead_bug'],
  [CAUSE_IDS.LUMBAR_ERECTOR_HYPO]: ['trunk_endurance_flexor', 'prone_instability'],
  
  [CAUSE_IDS.SHOULDER_ER_HYPO]: ['shoulder_flexion'],
  [CAUSE_IDS.VMO_HYPO]: ['single_leg_squat_control'],
  [CAUSE_IDS.MUSCLE_FATIGUE]: ['single_leg_squat_control'],
  [CAUSE_IDS.GLUTE_MED_ASYMMETRY]: ['trendelenburg', 'hip_abduction_strength'],
  [CAUSE_IDS.CORE_ASYMMETRY]: ['trunk_endurance_lateral', 'dead_bug'],

  // ============================================
  // HYPER - Hiperatividades / Encurtamentos
  // ============================================
  
  [CAUSE_IDS.TFL_HYPER]: ['ober_test', 'hip_flexor_length'],
  [CAUSE_IDS.PIRIFORMIS_HYPER]: ['hip_rotation'],
  
  // Superprompt: implícito em heels_rise → dorsiflexion_limit → ankle tests
  [CAUSE_IDS.GASTROC_TIGHT]: ['calf_flexibility', 'ankle_dorsiflexion'],
  [CAUSE_IDS.SOLEUS_TIGHT]: ['calf_flexibility', 'ankle_dorsiflexion'],
  [CAUSE_IDS.CALF_TIGHT]: ['calf_flexibility', 'ankle_dorsiflexion'],
  [CAUSE_IDS.PERONEAL_HYPER]: ['ankle_dorsiflexion', 'short_foot'],
  
  [CAUSE_IDS.HIP_ER_HYPER]: ['hip_rotation'],
  [CAUSE_IDS.HIP_FLEXOR_TIGHT]: ['hip_flexor_length'],
  [CAUSE_IDS.HAMSTRING_TIGHT]: ['hip_flexor_length'],
  [CAUSE_IDS.GLUTE_MAX_TIGHT]: ['hip_flexor_length'],
  [CAUSE_IDS.ADDUCTOR_HYPER]: ['hip_rotation'],
  
  [CAUSE_IDS.QL_HYPER]: ['trunk_endurance_lateral'],
  [CAUSE_IDS.QL_IMBALANCE]: ['trunk_endurance_lateral'],
  [CAUSE_IDS.OBLIQUE_IMBALANCE]: ['trunk_endurance_lateral', 'dead_bug'],
  [CAUSE_IDS.PARAVERTEBRAIS_HYPER]: ['trunk_endurance_flexor', 'dead_bug', 'prone_instability'],
  [CAUSE_IDS.LUMBAR_ERECTOR_HYPER]: ['trunk_endurance_flexor', 'prone_instability'],
  
  [CAUSE_IDS.TRAP_SUP_HYPER]: ['upper_trap_length', 'scapular_dyskinesis'],
  [CAUSE_IDS.SCM_HYPER]: ['cervical_flexion_endurance', 'upper_trap_length'],
  [CAUSE_IDS.PEC_MAJOR_HYPER]: ['pec_minor_length', 'shoulder_flexion'],
  [CAUSE_IDS.PEC_MINOR_TIGHT]: ['pec_minor_length', 'shoulder_flexion'],
  [CAUSE_IDS.LAT_TIGHT]: ['shoulder_flexion'],
  [CAUSE_IDS.RECTUS_ABD_HYPER]: ['dead_bug'],

  // ============================================
  // MOB_L - Limitações de Mobilidade
  // ============================================
  
  // Superprompt: "Se Dorsiflexion_limit → KneeToWall"
  [CAUSE_IDS.DORSIFLEXION_LIMIT]: ['ankle_dorsiflexion'],
  [CAUSE_IDS.TC_JOINT_RESTRICTION]: ['ankle_dorsiflexion'],
  
  [CAUSE_IDS.HIP_ER_LIMIT]: ['hip_rotation'],
  [CAUSE_IDS.HIP_FLEXION_LIMIT]: ['hip_flexor_length', 'hip_rotation'],
  
  // Superprompt: "Se Tspine_ext_limit → TspineExtension + ShoulderFlexion"
  [CAUSE_IDS.TSPINE_EXT_LIMIT]: ['tspine_extension', 'shoulder_flexion'],
  [CAUSE_IDS.SHOULDER_FLEX_LIMIT]: ['shoulder_flexion', 'pec_minor_length'],
  
  [CAUSE_IDS.FOOT_PRONATION]: ['short_foot', 'ankle_dorsiflexion'],

  // ============================================
  // INSTAB - Instabilidades
  // ============================================
  
  [CAUSE_IDS.FRONTAL_INSTABILITY]: ['trendelenburg', 'single_leg_squat_control', 'hip_abduction_strength'],
  [CAUSE_IDS.LATERAL_PELVIC_INSTAB]: ['trendelenburg', 'trunk_endurance_lateral'],
  [CAUSE_IDS.ANKLE_STABILITY_DEFICIT]: ['ankle_dorsiflexion', 'single_leg_squat_control'],
  [CAUSE_IDS.CORE_STABILITY_DEFICIT]: ['dead_bug', 'trunk_endurance_flexor', 'prone_instability'],
  [CAUSE_IDS.SCAPULAR_DYSKINESIS]: ['scapular_dyskinesis', 'serratus_strength'],
  [CAUSE_IDS.SCAPULAR_ASYMMETRY]: ['scapular_dyskinesis'],

  // ============================================
  // CM - Controle Motor
  // ============================================
  
  [CAUSE_IDS.LUMBAR_CONTROL]: ['dead_bug', 'prone_instability', 'trunk_endurance_flexor'],
  [CAUSE_IDS.CORE_ROTATION_CONTROL]: ['dead_bug', 'trunk_endurance_lateral'],
  [CAUSE_IDS.QUAD_CONTROL_DEFICIT]: ['single_leg_squat_control'],
  [CAUSE_IDS.ARCH_CONTROL_DEFICIT]: ['short_foot'],
  [CAUSE_IDS.MOTOR_CONTROL_DEFICIT]: ['single_leg_squat_control', 'dead_bug'],
  [CAUSE_IDS.PROPRIOCEPTION_DEFICIT]: ['single_leg_squat_control'],
};

// ============================================
// Validação Programática de Cobertura
// ============================================

export function validateCausaTestCoverage(): { 
  covered: string[]; 
  missing: string[];
  coverage: number;
} {
  const covered: string[] = [];
  const missing: string[] = [];

  ALL_CAUSE_IDS.forEach(causeId => {
    if (causaToTests[causeId] && causaToTests[causeId].length > 0) {
      covered.push(causeId);
    } else {
      missing.push(causeId);
    }
  });

  const coverage = (covered.length / ALL_CAUSE_IDS.length) * 100;

  if (missing.length > 0) {
    console.warn(
      `[FABRIK] Causas sem testes mapeados (${missing.length}):`,
      missing
    );
  }

  return { covered, missing, coverage };
}

// Executar validação em desenvolvimento
if (import.meta.env.DEV) {
  const { coverage, missing } = validateCausaTestCoverage();
  if (missing.length > 0) {
    console.warn(`[FABRIK] Cobertura de Tabela B: ${coverage.toFixed(1)}%`);
  }
}
