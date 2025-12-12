// FABRIK Weight Engine - Tabelas A e E
// Pesos base das compensações e ajustes de contexto

import { CAUSE_IDS } from './causeIds';

// ============================================
// TABELA A - Pesos Base por Compensação
// Cada compensação gera causas prováveis com pesos
// ============================================

export interface CausaProvavel {
  id: string;
  label: string;
  categoria: 'HYPO' | 'HYPER' | 'MOB_L' | 'INSTAB' | 'CM' | 'TECH';
  baseWeight: number;
}

// Mapeamento: compensação → causas prováveis com pesos
export const compensacaoCausas: Record<string, CausaProvavel[]> = {
  // ============================================
  // OHS - Overhead Squat
  // ============================================
  
  // Valgo de joelho
  knee_valgus: [
    { id: CAUSE_IDS.GLUTE_MED_HYPO, label: 'Glúteo Médio Hipoativo', categoria: 'HYPO', baseWeight: 3 },
    { id: CAUSE_IDS.GLUTE_MAX_UPPER_HYPO, label: 'Glúteo Máximo (Superior) Hipoativo', categoria: 'HYPO', baseWeight: 2 },
    { id: CAUSE_IDS.TFL_HYPER, label: 'TFL Hiperativo', categoria: 'HYPER', baseWeight: 2 },
    { id: CAUSE_IDS.FOOT_PRONATION, label: 'Pronação do Pé', categoria: 'MOB_L', baseWeight: 2 },
    { id: CAUSE_IDS.TIB_POST_HYPO, label: 'Tibial Posterior Hipoativo', categoria: 'HYPO', baseWeight: 2 },
    { id: CAUSE_IDS.HIP_ER_LIMIT, label: 'Limitação Rotação Externa Quadril', categoria: 'MOB_L', baseWeight: 1 },
    { id: CAUSE_IDS.FRONTAL_INSTABILITY, label: 'Instabilidade Frontal', categoria: 'INSTAB', baseWeight: 3 },
  ],

  // Varo de joelho
  knee_varus: [
    { id: CAUSE_IDS.TFL_HYPER, label: 'TFL Hiperativo', categoria: 'HYPER', baseWeight: 2 },
    { id: CAUSE_IDS.PIRIFORMIS_HYPER, label: 'Piriforme Hiperativo', categoria: 'HYPER', baseWeight: 2 },
    { id: CAUSE_IDS.GLUTE_MAX_HYPO, label: 'Glúteo Máximo Hipoativo', categoria: 'HYPO', baseWeight: 2 },
  ],

  // Calcanhares sobem
  heels_rise: [
    { id: CAUSE_IDS.DORSIFLEXION_LIMIT, label: 'Limitação Dorsiflexão', categoria: 'MOB_L', baseWeight: 4 },
    { id: CAUSE_IDS.GASTROC_TIGHT, label: 'Gastrocnêmio Encurtado', categoria: 'HYPER', baseWeight: 3 },
    { id: CAUSE_IDS.SOLEUS_TIGHT, label: 'Sóleo Encurtado', categoria: 'HYPER', baseWeight: 3 },
    { id: CAUSE_IDS.TC_JOINT_RESTRICTION, label: 'Restrição Articular TC', categoria: 'MOB_L', baseWeight: 4 },
  ],
  heels_rise_posterior: [
    { id: CAUSE_IDS.DORSIFLEXION_LIMIT, label: 'Limitação Dorsiflexão', categoria: 'MOB_L', baseWeight: 4 },
    { id: CAUSE_IDS.GASTROC_TIGHT, label: 'Gastrocnêmio Encurtado', categoria: 'HYPER', baseWeight: 3 },
  ],

  // Inclinação do tronco (OHS lateral)
  trunk_forward_lean: [
    { id: CAUSE_IDS.TSPINE_EXT_LIMIT, label: 'Limitação Extensão Torácica', categoria: 'MOB_L', baseWeight: 3 },
    { id: CAUSE_IDS.CORE_DEEP_HYPO, label: 'Core Profundo Hipoativo', categoria: 'HYPO', baseWeight: 2 },
    { id: CAUSE_IDS.PARAVERTEBRAIS_HYPER, label: 'Paravertebrais Hiperativos', categoria: 'HYPER', baseWeight: 2 },
    { id: CAUSE_IDS.HIP_FLEXOR_TIGHT, label: 'Flexores do Quadril Encurtados', categoria: 'HYPER', baseWeight: 2 },
    { id: CAUSE_IDS.GLUTE_MAX_HYPO, label: 'Glúteo Máximo Hipoativo', categoria: 'HYPO', baseWeight: 3 },
  ],

  // Hiperextensão lombar
  lumbar_hyperextension: [
    { id: CAUSE_IDS.CORE_DEEP_HYPO, label: 'Core Profundo Hipoativo', categoria: 'HYPO', baseWeight: 3 },
    { id: CAUSE_IDS.HIP_FLEXOR_TIGHT, label: 'Flexores do Quadril Encurtados', categoria: 'HYPER', baseWeight: 3 },
    { id: CAUSE_IDS.GLUTE_MAX_HYPO, label: 'Glúteo Máximo Hipoativo', categoria: 'HYPO', baseWeight: 2 },
    { id: CAUSE_IDS.LUMBAR_CONTROL, label: 'Déficit Controle Motor Lombar', categoria: 'CM', baseWeight: 3 },
  ],

  // Flexão da coluna (butt wink) - usando spine_flexion como ID
  spine_flexion: [
    { id: CAUSE_IDS.HAMSTRING_TIGHT, label: 'Isquiotibiais Encurtados', categoria: 'HYPER', baseWeight: 3 },
    { id: CAUSE_IDS.HIP_FLEXION_LIMIT, label: 'Limitação Flexão Quadril', categoria: 'MOB_L', baseWeight: 3 },
    { id: CAUSE_IDS.LUMBAR_ERECTOR_HYPO, label: 'Eretores Lombares Hipoativos', categoria: 'HYPO', baseWeight: 2 },
    { id: CAUSE_IDS.GLUTE_MAX_TIGHT, label: 'Glúteo Máximo Encurtado', categoria: 'HYPER', baseWeight: 2 },
  ],

  // Alias para butt_wink (mesmo que spine_flexion)
  butt_wink: [
    { id: CAUSE_IDS.HAMSTRING_TIGHT, label: 'Isquiotibiais Encurtados', categoria: 'HYPER', baseWeight: 3 },
    { id: CAUSE_IDS.HIP_FLEXION_LIMIT, label: 'Limitação Flexão Quadril', categoria: 'MOB_L', baseWeight: 3 },
  ],

  // Braços caem (OHS lateral) - usando arms_fall_forward como ID principal
  arms_fall_forward: [
    { id: CAUSE_IDS.SERRATUS_HYPO, label: 'Serrátil Anterior Hipoativo', categoria: 'HYPO', baseWeight: 3 },
    { id: CAUSE_IDS.TRAP_INF_HYPO, label: 'Trapézio Inferior Hipoativo', categoria: 'HYPO', baseWeight: 2 },
    { id: CAUSE_IDS.TRAP_SUP_HYPER, label: 'Trapézio Superior Hiperativo', categoria: 'HYPER', baseWeight: 2 },
    { id: CAUSE_IDS.TSPINE_EXT_LIMIT, label: 'Limitação Extensão Torácica', categoria: 'MOB_L', baseWeight: 2 },
    { id: CAUSE_IDS.SHOULDER_FLEX_LIMIT, label: 'Limitação Flexão Ombro', categoria: 'MOB_L', baseWeight: 3 },
    { id: CAUSE_IDS.LAT_TIGHT, label: 'Latíssimo do Dorso Encurtado', categoria: 'HYPER', baseWeight: 2 },
  ],

  // Alias para arms_fall (alguns lugares usam sem _forward)
  arms_fall: [
    { id: CAUSE_IDS.SERRATUS_HYPO, label: 'Serrátil Anterior Hipoativo', categoria: 'HYPO', baseWeight: 3 },
    { id: CAUSE_IDS.SHOULDER_FLEX_LIMIT, label: 'Limitação Flexão Ombro', categoria: 'MOB_L', baseWeight: 3 },
  ],

  // Pronação do pé (referenciado em knee_valgus)
  foot_pronation: [
    { id: CAUSE_IDS.TIB_POST_HYPO, label: 'Tibial Posterior Hipoativo', categoria: 'HYPO', baseWeight: 3 },
    { id: CAUSE_IDS.FOOT_INTRINSIC_HYPO, label: 'Intrínsecos do Pé Hipoativos', categoria: 'HYPO', baseWeight: 2 },
    { id: CAUSE_IDS.PERONEAL_HYPER, label: 'Fibulares Hiperativos', categoria: 'HYPER', baseWeight: 2 },
  ],

  // Pés abduzidos
  feet_abduction: [
    { id: CAUSE_IDS.HIP_ER_HYPER, label: 'Rotadores Externos Hiperativos', categoria: 'HYPER', baseWeight: 2 },
    { id: CAUSE_IDS.TIB_POST_HYPO, label: 'Tibial Posterior Hipoativo', categoria: 'HYPO', baseWeight: 2 },
  ],

  // Eversão dos pés
  feet_eversion: [
    { id: CAUSE_IDS.TIB_POST_HYPO, label: 'Tibial Posterior Hipoativo', categoria: 'HYPO', baseWeight: 3 },
    { id: CAUSE_IDS.GLUTE_MED_HYPO, label: 'Glúteo Médio Hipoativo', categoria: 'HYPO', baseWeight: 2 },
    { id: CAUSE_IDS.PERONEAL_HYPER, label: 'Fibulares Hiperativos', categoria: 'HYPER', baseWeight: 2 },
  ],
  feet_eversion_posterior: [
    { id: CAUSE_IDS.TIB_POST_HYPO, label: 'Tibial Posterior Hipoativo', categoria: 'HYPO', baseWeight: 3 },
    { id: CAUSE_IDS.GLUTE_MED_HYPO, label: 'Glúteo Médio Hipoativo', categoria: 'HYPO', baseWeight: 2 },
  ],

  // Shift assimétrico
  asymmetric_shift: [
    { id: CAUSE_IDS.QL_IMBALANCE, label: 'Desequilíbrio Quadrado Lombar', categoria: 'HYPER', baseWeight: 3 },
    { id: CAUSE_IDS.GLUTE_MED_ASYMMETRY, label: 'Assimetria Glúteo Médio', categoria: 'HYPO', baseWeight: 3 },
    { id: CAUSE_IDS.CORE_LATERAL_HYPO, label: 'Core Lateral Hipoativo', categoria: 'HYPO', baseWeight: 2 },
  ],

  // Rotação do tronco
  trunk_rotation: [
    { id: CAUSE_IDS.OBLIQUE_IMBALANCE, label: 'Desequilíbrio Oblíquos', categoria: 'HYPER', baseWeight: 2 },
    { id: CAUSE_IDS.CORE_ROTATION_CONTROL, label: 'Déficit Controle Rotacional', categoria: 'CM', baseWeight: 3 },
  ],

  // ============================================
  // SLS - Single Leg Squat
  // ============================================

  hip_drop: [
    { id: CAUSE_IDS.GLUTE_MED_HYPO, label: 'Glúteo Médio Hipoativo', categoria: 'HYPO', baseWeight: 4 },
    { id: CAUSE_IDS.GLUTE_MIN_HYPO, label: 'Glúteo Mínimo Hipoativo', categoria: 'HYPO', baseWeight: 2 },
    { id: CAUSE_IDS.TFL_HYPER, label: 'TFL Hiperativo', categoria: 'HYPER', baseWeight: 2 },
    { id: CAUSE_IDS.LATERAL_PELVIC_INSTAB, label: 'Instabilidade Pélvica Lateral', categoria: 'INSTAB', baseWeight: 3 },
  ],

  hip_hike: [
    { id: CAUSE_IDS.QL_HYPER, label: 'Quadrado Lombar Hiperativo', categoria: 'HYPER', baseWeight: 3 },
    { id: CAUSE_IDS.GLUTE_MED_HYPO, label: 'Glúteo Médio Hipoativo', categoria: 'HYPO', baseWeight: 3 },
  ],

  trunk_rotation_medial: [
    { id: CAUSE_IDS.GLUTE_MED_HYPO, label: 'Glúteo Médio Hipoativo', categoria: 'HYPO', baseWeight: 3 },
    { id: CAUSE_IDS.CORE_ROTATION_CONTROL, label: 'Déficit Controle Rotacional', categoria: 'CM', baseWeight: 3 },
  ],

  trunk_rotation_lateral: [
    { id: CAUSE_IDS.GLUTE_MED_HYPO, label: 'Glúteo Médio Hipoativo', categoria: 'HYPO', baseWeight: 2 },
    { id: CAUSE_IDS.OBLIQUE_IMBALANCE, label: 'Desequilíbrio Oblíquos', categoria: 'HYPER', baseWeight: 2 },
  ],

  trunk_forward_lean_sls: [
    { id: CAUSE_IDS.GLUTE_MAX_HYPO, label: 'Glúteo Máximo Hipoativo', categoria: 'HYPO', baseWeight: 3 },
    { id: CAUSE_IDS.HIP_FLEXOR_TIGHT, label: 'Flexores do Quadril Encurtados', categoria: 'HYPER', baseWeight: 2 },
    { id: CAUSE_IDS.CORE_DEEP_HYPO, label: 'Core Profundo Hipoativo', categoria: 'HYPO', baseWeight: 2 },
  ],

  knee_flexion_insufficient: [
    { id: CAUSE_IDS.QUAD_CONTROL_DEFICIT, label: 'Déficit Controle Excêntrico Quadríceps', categoria: 'CM', baseWeight: 3 },
    { id: CAUSE_IDS.GLUTE_MAX_HYPO, label: 'Glúteo Máximo Hipoativo', categoria: 'HYPO', baseWeight: 2 },
  ],

  instability: [
    { id: CAUSE_IDS.GLUTE_MED_HYPO, label: 'Glúteo Médio Hipoativo', categoria: 'HYPO', baseWeight: 3 },
    { id: CAUSE_IDS.ANKLE_STABILITY_DEFICIT, label: 'Déficit Estabilidade Tornozelo', categoria: 'INSTAB', baseWeight: 3 },
    { id: CAUSE_IDS.CORE_STABILITY_DEFICIT, label: 'Déficit Estabilidade Core', categoria: 'INSTAB', baseWeight: 2 },
  ],

  tremor: [
    { id: CAUSE_IDS.MOTOR_CONTROL_DEFICIT, label: 'Déficit Controle Motor Global', categoria: 'CM', baseWeight: 3 },
    { id: CAUSE_IDS.MUSCLE_FATIGUE, label: 'Fadiga Muscular', categoria: 'HYPO', baseWeight: 2 },
  ],

  foot_collapse: [
    { id: CAUSE_IDS.TIB_POST_HYPO, label: 'Tibial Posterior Hipoativo', categoria: 'HYPO', baseWeight: 4 },
    { id: CAUSE_IDS.FOOT_INTRINSIC_HYPO, label: 'Intrínsecos do Pé Hipoativos', categoria: 'HYPO', baseWeight: 3 },
    { id: CAUSE_IDS.ARCH_CONTROL_DEFICIT, label: 'Déficit Controle do Arco', categoria: 'CM', baseWeight: 3 },
  ],

  balance_loss: [
    { id: CAUSE_IDS.PROPRIOCEPTION_DEFICIT, label: 'Déficit Proprioceptivo', categoria: 'CM', baseWeight: 3 },
    { id: CAUSE_IDS.ANKLE_STABILITY_DEFICIT, label: 'Déficit Estabilidade Tornozelo', categoria: 'INSTAB', baseWeight: 3 },
    { id: CAUSE_IDS.GLUTE_MED_HYPO, label: 'Glúteo Médio Hipoativo', categoria: 'HYPO', baseWeight: 2 },
  ],

  // ============================================
  // Push-up
  // ============================================

  scapular_winging: [
    { id: CAUSE_IDS.SERRATUS_HYPO, label: 'Serrátil Anterior Hipoativo', categoria: 'HYPO', baseWeight: 4 },
    { id: CAUSE_IDS.TRAP_INF_HYPO, label: 'Trapézio Inferior Hipoativo', categoria: 'HYPO', baseWeight: 3 },
    { id: CAUSE_IDS.TRAP_SUP_HYPER, label: 'Trapézio Superior Hiperativo', categoria: 'HYPER', baseWeight: 2 },
    { id: CAUSE_IDS.SCAPULAR_DYSKINESIS, label: 'Discinese Escapular', categoria: 'INSTAB', baseWeight: 3 },
  ],

  hips_drop: [
    { id: CAUSE_IDS.CORE_DEEP_HYPO, label: 'Core Profundo Hipoativo', categoria: 'HYPO', baseWeight: 3 },
    { id: CAUSE_IDS.GLUTE_MAX_HYPO, label: 'Glúteo Máximo Hipoativo', categoria: 'HYPO', baseWeight: 2 },
    { id: CAUSE_IDS.LUMBAR_CONTROL, label: 'Déficit Controle Motor Lombar', categoria: 'CM', baseWeight: 3 },
  ],

  hip_elevation: [
    { id: CAUSE_IDS.RECTUS_ABD_HYPER, label: 'Reto Abdominal Hiperativo', categoria: 'HYPER', baseWeight: 2 },
    { id: CAUSE_IDS.GLUTE_MAX_HYPO, label: 'Glúteo Máximo Hipoativo', categoria: 'HYPO', baseWeight: 2 },
  ],

  lumbar_extension: [
    { id: CAUSE_IDS.CORE_DEEP_HYPO, label: 'Core Profundo Hipoativo', categoria: 'HYPO', baseWeight: 4 },
    { id: CAUSE_IDS.HIP_FLEXOR_TIGHT, label: 'Flexores do Quadril Encurtados', categoria: 'HYPER', baseWeight: 3 },
    { id: CAUSE_IDS.LUMBAR_ERECTOR_HYPER, label: 'Eretores Lombares Hiperativos', categoria: 'HYPER', baseWeight: 2 },
  ],

  elbow_flare: [
    { id: CAUSE_IDS.PEC_MAJOR_HYPER, label: 'Peitoral Maior Hiperativo', categoria: 'HYPER', baseWeight: 2 },
    { id: CAUSE_IDS.SERRATUS_HYPO, label: 'Serrátil Anterior Hipoativo', categoria: 'HYPO', baseWeight: 2 },
    { id: CAUSE_IDS.SHOULDER_ER_HYPO, label: 'Rotadores Externos Ombro Hipoativos', categoria: 'HYPO', baseWeight: 2 },
  ],

  shoulder_protraction: [
    { id: CAUSE_IDS.PEC_MINOR_TIGHT, label: 'Peitoral Menor Encurtado', categoria: 'HYPER', baseWeight: 3 },
    { id: CAUSE_IDS.TRAP_MID_HYPO, label: 'Trapézio Médio Hipoativo', categoria: 'HYPO', baseWeight: 2 },
    { id: CAUSE_IDS.RHOMBOID_HYPO, label: 'Romboides Hipoativos', categoria: 'HYPO', baseWeight: 2 },
  ],

  shoulder_retraction_insufficient: [
    { id: CAUSE_IDS.RHOMBOID_HYPO, label: 'Romboides Hipoativos', categoria: 'HYPO', baseWeight: 3 },
    { id: CAUSE_IDS.TRAP_MID_HYPO, label: 'Trapézio Médio Hipoativo', categoria: 'HYPO', baseWeight: 3 },
  ],

  head_forward: [
    { id: CAUSE_IDS.DEEP_NECK_FLEXOR_HYPO, label: 'Flexores Cervicais Profundos Hipoativos', categoria: 'HYPO', baseWeight: 3 },
    { id: CAUSE_IDS.TRAP_SUP_HYPER, label: 'Trapézio Superior Hiperativo', categoria: 'HYPER', baseWeight: 2 },
    { id: CAUSE_IDS.SCM_HYPER, label: 'ECM Hiperativo', categoria: 'HYPER', baseWeight: 2 },
  ],

  misalignment: [
    { id: CAUSE_IDS.CORE_ASYMMETRY, label: 'Assimetria de Core', categoria: 'HYPO', baseWeight: 2 },
    { id: CAUSE_IDS.SCAPULAR_ASYMMETRY, label: 'Assimetria Escapular', categoria: 'INSTAB', baseWeight: 2 },
  ],
};

// ============================================
// TABELA E - Ajustes de Contexto
// Baseado em anamnese (dor, esportes, etc.)
// ============================================

export interface ContextoAjuste {
  condicao: string;
  label: string;
  ajustes: Record<string, number>; // causaId → +N
}

export const contextosAjuste: ContextoAjuste[] = [
  // Dor lombar
  {
    condicao: 'dor_lombar',
    label: 'Dor Lombar',
    ajustes: {
      [CAUSE_IDS.PARAVERTEBRAIS_HYPER]: 2,
      [CAUSE_IDS.HIP_FLEXOR_TIGHT]: 2,
      [CAUSE_IDS.CORE_DEEP_HYPO]: 2,
      [CAUSE_IDS.TSPINE_EXT_LIMIT]: 2,
      [CAUSE_IDS.LUMBAR_ERECTOR_HYPER]: 2,
      [CAUSE_IDS.LUMBAR_CONTROL]: 2,
    },
  },
  // Dor no joelho
  {
    condicao: 'dor_joelho',
    label: 'Dor no Joelho',
    ajustes: {
      [CAUSE_IDS.GLUTE_MED_HYPO]: 2,
      [CAUSE_IDS.TIB_POST_HYPO]: 2,
      [CAUSE_IDS.DORSIFLEXION_LIMIT]: 2,
      [CAUSE_IDS.TFL_HYPER]: 2,
      [CAUSE_IDS.VMO_HYPO]: 2,
    },
  },
  // Dor no ombro
  {
    condicao: 'dor_ombro',
    label: 'Dor no Ombro',
    ajustes: {
      [CAUSE_IDS.SERRATUS_HYPO]: 2,
      [CAUSE_IDS.TRAP_INF_HYPO]: 2,
      [CAUSE_IDS.TRAP_SUP_HYPER]: 2,
      [CAUSE_IDS.PEC_MINOR_TIGHT]: 2,
      [CAUSE_IDS.SHOULDER_ER_HYPO]: 2,
    },
  },
  // Dor cervical
  {
    condicao: 'dor_cervical',
    label: 'Dor Cervical',
    ajustes: {
      [CAUSE_IDS.DEEP_NECK_FLEXOR_HYPO]: 2,
      [CAUSE_IDS.TRAP_SUP_HYPER]: 2,
      [CAUSE_IDS.SCM_HYPER]: 2,
    },
  },
  // Corrida
  {
    condicao: 'corrida',
    label: 'Corrida',
    ajustes: {
      [CAUSE_IDS.GLUTE_MED_HYPO]: 2,
      [CAUSE_IDS.DORSIFLEXION_LIMIT]: 2,
      [CAUSE_IDS.TIB_POST_HYPO]: 2,
      [CAUSE_IDS.HAMSTRING_TIGHT]: 1,
      [CAUSE_IDS.CALF_TIGHT]: 1,
    },
  },
  // Futebol
  {
    condicao: 'futebol',
    label: 'Futebol',
    ajustes: {
      [CAUSE_IDS.GLUTE_MED_HYPO]: 2,
      [CAUSE_IDS.ADDUCTOR_HYPER]: 2,
      [CAUSE_IDS.ANKLE_STABILITY_DEFICIT]: 2,
      [CAUSE_IDS.HIP_FLEXOR_TIGHT]: 1,
    },
  },
  // Basquete/Vôlei (saltos)
  {
    condicao: 'saltos',
    label: 'Esportes de Salto',
    ajustes: {
      [CAUSE_IDS.DORSIFLEXION_LIMIT]: 2,
      [CAUSE_IDS.GLUTE_MAX_HYPO]: 2,
      [CAUSE_IDS.QUAD_CONTROL_DEFICIT]: 2,
    },
  },
  // Natação
  {
    condicao: 'natacao',
    label: 'Natação',
    ajustes: {
      [CAUSE_IDS.SERRATUS_HYPO]: 2,
      [CAUSE_IDS.SHOULDER_FLEX_LIMIT]: 2,
      [CAUSE_IDS.TRAP_INF_HYPO]: 2,
      [CAUSE_IDS.TSPINE_EXT_LIMIT]: 2,
    },
  },
  // Musculação
  {
    condicao: 'musculacao',
    label: 'Musculação',
    ajustes: {
      [CAUSE_IDS.PEC_MINOR_TIGHT]: 1,
      [CAUSE_IDS.HIP_FLEXOR_TIGHT]: 1,
      [CAUSE_IDS.LAT_TIGHT]: 1,
    },
  },
  // Sedentarismo (muitas horas sentado)
  {
    condicao: 'sedentarismo',
    label: 'Sedentarismo (>6h sentado)',
    ajustes: {
      [CAUSE_IDS.HIP_FLEXOR_TIGHT]: 2,
      [CAUSE_IDS.GLUTE_MAX_HYPO]: 2,
      [CAUSE_IDS.CORE_DEEP_HYPO]: 1,
      [CAUSE_IDS.TSPINE_EXT_LIMIT]: 1,
    },
  },
  // Sono ruim
  {
    condicao: 'sono_ruim',
    label: 'Qualidade de Sono Ruim',
    ajustes: {
      [CAUSE_IDS.MUSCLE_FATIGUE]: 1,
      [CAUSE_IDS.MOTOR_CONTROL_DEFICIT]: 1,
    },
  },
];

// Função para identificar contextos aplicáveis baseado na anamnese
export function identificarContextos(anamnese: {
  painHistory?: Array<{ region: string; intensity: number }>;
  sports?: Array<{ name: string }>;
  activityTypes?: string[];
  sedentaryHoursPerDay?: number;
  sleepQuality?: number;
}): string[] {
  const contextos: string[] = [];

  // Analisar histórico de dor
  anamnese.painHistory?.forEach(pain => {
    const region = pain.region.toLowerCase();
    if (region.includes('lombar') || region.includes('costas') || region.includes('coluna')) {
      contextos.push('dor_lombar');
    }
    if (region.includes('joelho')) {
      contextos.push('dor_joelho');
    }
    if (region.includes('ombro')) {
      contextos.push('dor_ombro');
    }
    if (region.includes('cervical') || region.includes('pescoço')) {
      contextos.push('dor_cervical');
    }
  });

  // Analisar esportes
  const todosEsportes = [
    ...(anamnese.sports?.map(s => s.name.toLowerCase()) || []),
    ...(anamnese.activityTypes?.map(a => a.toLowerCase()) || []),
  ];

  todosEsportes.forEach(esporte => {
    if (esporte.includes('corr') || esporte.includes('run')) {
      contextos.push('corrida');
    }
    if (esporte.includes('futebol') || esporte.includes('soccer')) {
      contextos.push('futebol');
    }
    if (esporte.includes('basquete') || esporte.includes('vôlei') || esporte.includes('volei') || esporte.includes('salto')) {
      contextos.push('saltos');
    }
    if (esporte.includes('nata') || esporte.includes('swim')) {
      contextos.push('natacao');
    }
    if (esporte.includes('muscula') || esporte.includes('academia') || esporte.includes('gym') || esporte.includes('peso') || esporte.includes('strength') || esporte.includes('força') || esporte.includes('treino')) {
      contextos.push('musculacao');
    }
  });

  // Sedentarismo
  if (anamnese.sedentaryHoursPerDay && anamnese.sedentaryHoursPerDay >= 6) {
    contextos.push('sedentarismo');
  }

  // Qualidade de sono
  if (anamnese.sleepQuality && anamnese.sleepQuality <= 2) {
    contextos.push('sono_ruim');
  }

  // Remover duplicatas
  return [...new Set(contextos)];
}
