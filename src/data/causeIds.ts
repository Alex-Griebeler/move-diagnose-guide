// ============================================
// CAUSE_IDS - Constantes centralizadas para todas as causas
// Garante consistência entre Tabela A, B e C
// ============================================

export const CAUSE_IDS = {
  // ============================================
  // HYPO - Hipoatividades
  // ============================================
  GLUTE_MED_HYPO: 'glute_med_hypo',
  GLUTE_MIN_HYPO: 'glute_min_hypo',
  GLUTE_MAX_HYPO: 'glute_max_hypo',
  GLUTE_MAX_UPPER_HYPO: 'glute_max_upper_hypo',
  TIB_POST_HYPO: 'tib_post_hypo',
  FOOT_INTRINSIC_HYPO: 'foot_intrinsic_hypo',
  SERRATUS_HYPO: 'serratus_hypo',
  TRAP_INF_HYPO: 'trap_inf_hypo',
  TRAP_MID_HYPO: 'trap_mid_hypo',
  RHOMBOID_HYPO: 'rhomboid_hypo',
  DEEP_NECK_FLEXOR_HYPO: 'deep_neck_flexor_hypo',
  CORE_DEEP_HYPO: 'core_deep_hypo',
  CORE_LATERAL_HYPO: 'core_lateral_hypo',
  LUMBAR_ERECTOR_HYPO: 'lumbar_erector_hypo',
  SHOULDER_ER_HYPO: 'shoulder_er_hypo',
  VMO_HYPO: 'vmo_hypo',
  MUSCLE_FATIGUE: 'muscle_fatigue',
  GLUTE_MED_ASYMMETRY: 'glute_med_asymmetry',
  CORE_ASYMMETRY: 'core_asymmetry',

  // ============================================
  // HYPER - Hiperatividades / Encurtamentos
  // ============================================
  TFL_HYPER: 'tfl_hyper',
  PIRIFORMIS_HYPER: 'piriformis_hyper',
  GASTROC_TIGHT: 'gastroc_tight',
  SOLEUS_TIGHT: 'soleus_tight',
  CALF_TIGHT: 'calf_tight',
  PERONEAL_HYPER: 'peroneal_hyper',
  HIP_ER_HYPER: 'hip_er_hyper',
  HIP_FLEXOR_TIGHT: 'hip_flexor_tight',
  HAMSTRING_TIGHT: 'hamstring_tight',
  GLUTE_MAX_TIGHT: 'glute_max_tight',
  ADDUCTOR_HYPER: 'adductor_hyper',
  QL_HYPER: 'ql_hyper',
  QL_IMBALANCE: 'ql_imbalance',
  OBLIQUE_IMBALANCE: 'oblique_imbalance',
  PARAVERTEBRAIS_HYPER: 'paravertebrais_hyper',
  LUMBAR_ERECTOR_HYPER: 'lumbar_erector_hyper',
  TRAP_SUP_HYPER: 'trap_sup_hyper',
  SCM_HYPER: 'scm_hyper',
  PEC_MAJOR_HYPER: 'pec_major_hyper',
  PEC_MINOR_TIGHT: 'pec_minor_tight',
  LAT_TIGHT: 'lat_tight',
  RECTUS_ABD_HYPER: 'rectus_abd_hyper',

  // ============================================
  // MOB_L - Limitações de Mobilidade
  // ============================================
  DORSIFLEXION_LIMIT: 'dorsiflexion_limit',
  TC_JOINT_RESTRICTION: 'tc_joint_restriction',
  HIP_ER_LIMIT: 'hip_er_limit',
  HIP_FLEXION_LIMIT: 'hip_flexion_limit',
  TSPINE_EXT_LIMIT: 'tspine_ext_limit',
  SHOULDER_FLEX_LIMIT: 'shoulder_flex_limit',
  FOOT_PRONATION: 'foot_pronation',

  // ============================================
  // INSTAB - Instabilidades
  // ============================================
  FRONTAL_INSTABILITY: 'frontal_instability',
  LATERAL_PELVIC_INSTAB: 'lateral_pelvic_instab',
  ANKLE_STABILITY_DEFICIT: 'ankle_stability_deficit',
  CORE_STABILITY_DEFICIT: 'core_stability_deficit',
  SCAPULAR_DYSKINESIS: 'scapular_dyskinesis',
  SCAPULAR_ASYMMETRY: 'scapular_asymmetry',

  // ============================================
  // CM - Controle Motor
  // ============================================
  LUMBAR_CONTROL: 'lumbar_control',
  CORE_ROTATION_CONTROL: 'core_rotation_control',
  QUAD_CONTROL_DEFICIT: 'quad_control_deficit',
  ARCH_CONTROL_DEFICIT: 'arch_control_deficit',
  MOTOR_CONTROL_DEFICIT: 'motor_control_deficit',
  PROPRIOCEPTION_DEFICIT: 'proprioception_deficit',
} as const;

export type CauseId = typeof CAUSE_IDS[keyof typeof CAUSE_IDS];

// Lista de todas as causas para validação
export const ALL_CAUSE_IDS = Object.values(CAUSE_IDS);
