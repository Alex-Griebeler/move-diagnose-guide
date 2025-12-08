// FABRIK Weight Engine - Tabelas A e E
// Pesos base das compensações e ajustes de contexto

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
    { id: 'glute_med_hypo', label: 'Glúteo Médio Hipoativo', categoria: 'HYPO', baseWeight: 3 },
    { id: 'glute_max_upper_hypo', label: 'Glúteo Máximo (Superior) Hipoativo', categoria: 'HYPO', baseWeight: 2 },
    { id: 'tfl_hyper', label: 'TFL Hiperativo', categoria: 'HYPER', baseWeight: 2 },
    { id: 'foot_pronation', label: 'Pronação do Pé', categoria: 'MOB_L', baseWeight: 2 },
    { id: 'tib_post_hypo', label: 'Tibial Posterior Hipoativo', categoria: 'HYPO', baseWeight: 2 },
    { id: 'hip_er_limit', label: 'Limitação Rotação Externa Quadril', categoria: 'MOB_L', baseWeight: 1 },
    { id: 'frontal_instability', label: 'Instabilidade Frontal', categoria: 'INSTAB', baseWeight: 3 },
  ],

  // Varo de joelho
  knee_varus: [
    { id: 'tfl_hyper', label: 'TFL Hiperativo', categoria: 'HYPER', baseWeight: 2 },
    { id: 'piriformis_hyper', label: 'Piriforme Hiperativo', categoria: 'HYPER', baseWeight: 2 },
    { id: 'glute_max_hypo', label: 'Glúteo Máximo Hipoativo', categoria: 'HYPO', baseWeight: 2 },
  ],

  // Calcanhares sobem
  heels_rise: [
    { id: 'dorsiflexion_limit', label: 'Limitação Dorsiflexão', categoria: 'MOB_L', baseWeight: 4 },
    { id: 'gastroc_tight', label: 'Gastrocnêmio Encurtado', categoria: 'HYPER', baseWeight: 3 },
    { id: 'soleus_tight', label: 'Sóleo Encurtado', categoria: 'HYPER', baseWeight: 3 },
    { id: 'tc_joint_restriction', label: 'Restrição Articular TC', categoria: 'MOB_L', baseWeight: 4 },
  ],
  heels_rise_posterior: [
    { id: 'dorsiflexion_limit', label: 'Limitação Dorsiflexão', categoria: 'MOB_L', baseWeight: 4 },
    { id: 'gastroc_tight', label: 'Gastrocnêmio Encurtado', categoria: 'HYPER', baseWeight: 3 },
  ],

  // Inclinação do tronco (OHS lateral)
  trunk_forward_lean: [
    { id: 'tspine_ext_limit', label: 'Limitação Extensão Torácica', categoria: 'MOB_L', baseWeight: 3 },
    { id: 'core_deep_hypo', label: 'Core Profundo Hipoativo', categoria: 'HYPO', baseWeight: 2 },
    { id: 'paravertebrais_hyper', label: 'Paravertebrais Hiperativos', categoria: 'HYPER', baseWeight: 2 },
    { id: 'hip_flexor_tight', label: 'Flexores do Quadril Encurtados', categoria: 'HYPER', baseWeight: 2 },
    { id: 'glute_max_hypo', label: 'Glúteo Máximo Hipoativo', categoria: 'HYPO', baseWeight: 3 },
  ],

  // Hiperextensão lombar
  lumbar_hyperextension: [
    { id: 'core_deep_hypo', label: 'Core Profundo Hipoativo', categoria: 'HYPO', baseWeight: 3 },
    { id: 'hip_flexor_tight', label: 'Flexores do Quadril Encurtados', categoria: 'HYPER', baseWeight: 3 },
    { id: 'glute_max_hypo', label: 'Glúteo Máximo Hipoativo', categoria: 'HYPO', baseWeight: 2 },
    { id: 'lumbar_control', label: 'Déficit Controle Motor Lombar', categoria: 'CM', baseWeight: 3 },
  ],

  // Flexão da coluna (butt wink) - usando spine_flexion como ID
  spine_flexion: [
    { id: 'hamstring_tight', label: 'Isquiotibiais Encurtados', categoria: 'HYPER', baseWeight: 3 },
    { id: 'hip_flexion_limit', label: 'Limitação Flexão Quadril', categoria: 'MOB_L', baseWeight: 3 },
    { id: 'lumbar_erector_hypo', label: 'Eretores Lombares Hipoativos', categoria: 'HYPO', baseWeight: 2 },
    { id: 'glute_max_tight', label: 'Glúteo Máximo Encurtado', categoria: 'HYPER', baseWeight: 2 },
  ],

  // Alias para butt_wink (mesmo que spine_flexion)
  butt_wink: [
    { id: 'hamstring_tight', label: 'Isquiotibiais Encurtados', categoria: 'HYPER', baseWeight: 3 },
    { id: 'hip_flexion_limit', label: 'Limitação Flexão Quadril', categoria: 'MOB_L', baseWeight: 3 },
  ],

  // Braços caem (OHS lateral) - usando arms_fall_forward como ID principal
  arms_fall_forward: [
    { id: 'serratus_hypo', label: 'Serrátil Anterior Hipoativo', categoria: 'HYPO', baseWeight: 3 },
    { id: 'trap_inf_hypo', label: 'Trapézio Inferior Hipoativo', categoria: 'HYPO', baseWeight: 2 },
    { id: 'trap_sup_hyper', label: 'Trapézio Superior Hiperativo', categoria: 'HYPER', baseWeight: 2 },
    { id: 'tspine_ext_limit', label: 'Limitação Extensão Torácica', categoria: 'MOB_L', baseWeight: 2 },
    { id: 'shoulder_flex_limit', label: 'Limitação Flexão Ombro', categoria: 'MOB_L', baseWeight: 3 },
    { id: 'lat_tight', label: 'Latíssimo do Dorso Encurtado', categoria: 'HYPER', baseWeight: 2 },
  ],

  // Alias para arms_fall (alguns lugares usam sem _forward)
  arms_fall: [
    { id: 'serratus_hypo', label: 'Serrátil Anterior Hipoativo', categoria: 'HYPO', baseWeight: 3 },
    { id: 'shoulder_flex_limit', label: 'Limitação Flexão Ombro', categoria: 'MOB_L', baseWeight: 3 },
  ],

  // Pronação do pé (referenciado em knee_valgus)
  foot_pronation: [
    { id: 'tib_post_hypo', label: 'Tibial Posterior Hipoativo', categoria: 'HYPO', baseWeight: 3 },
    { id: 'foot_intrinsic_hypo', label: 'Intrínsecos do Pé Hipoativos', categoria: 'HYPO', baseWeight: 2 },
    { id: 'peroneal_hyper', label: 'Fibulares Hiperativos', categoria: 'HYPER', baseWeight: 2 },
  ],

  // Pés abduzidos
  feet_abduction: [
    { id: 'hip_er_hyper', label: 'Rotadores Externos Hiperativos', categoria: 'HYPER', baseWeight: 2 },
    { id: 'tib_post_hypo', label: 'Tibial Posterior Hipoativo', categoria: 'HYPO', baseWeight: 2 },
  ],

  // Eversão dos pés
  feet_eversion: [
    { id: 'tib_post_hypo', label: 'Tibial Posterior Hipoativo', categoria: 'HYPO', baseWeight: 3 },
    { id: 'glute_med_hypo', label: 'Glúteo Médio Hipoativo', categoria: 'HYPO', baseWeight: 2 },
    { id: 'peroneal_hyper', label: 'Fibulares Hiperativos', categoria: 'HYPER', baseWeight: 2 },
  ],
  feet_eversion_posterior: [
    { id: 'tib_post_hypo', label: 'Tibial Posterior Hipoativo', categoria: 'HYPO', baseWeight: 3 },
    { id: 'glute_med_hypo', label: 'Glúteo Médio Hipoativo', categoria: 'HYPO', baseWeight: 2 },
  ],

  // Shift assimétrico
  asymmetric_shift: [
    { id: 'ql_imbalance', label: 'Desequilíbrio Quadrado Lombar', categoria: 'HYPER', baseWeight: 3 },
    { id: 'glute_med_asymmetry', label: 'Assimetria Glúteo Médio', categoria: 'HYPO', baseWeight: 3 },
    { id: 'core_lateral_hypo', label: 'Core Lateral Hipoativo', categoria: 'HYPO', baseWeight: 2 },
  ],

  // Rotação do tronco
  trunk_rotation: [
    { id: 'oblique_imbalance', label: 'Desequilíbrio Oblíquos', categoria: 'HYPER', baseWeight: 2 },
    { id: 'core_rotation_control', label: 'Déficit Controle Rotacional', categoria: 'CM', baseWeight: 3 },
  ],

  // ============================================
  // SLS - Single Leg Squat
  // ============================================

  hip_drop: [
    { id: 'glute_med_hypo', label: 'Glúteo Médio Hipoativo', categoria: 'HYPO', baseWeight: 4 },
    { id: 'glute_min_hypo', label: 'Glúteo Mínimo Hipoativo', categoria: 'HYPO', baseWeight: 2 },
    { id: 'tfl_hyper', label: 'TFL Hiperativo', categoria: 'HYPER', baseWeight: 2 },
    { id: 'lateral_pelvic_instab', label: 'Instabilidade Pélvica Lateral', categoria: 'INSTAB', baseWeight: 3 },
  ],

  hip_hike: [
    { id: 'ql_hyper', label: 'Quadrado Lombar Hiperativo', categoria: 'HYPER', baseWeight: 3 },
    { id: 'glute_med_hypo', label: 'Glúteo Médio Hipoativo', categoria: 'HYPO', baseWeight: 3 },
  ],

  trunk_rotation_medial: [
    { id: 'glute_med_hypo', label: 'Glúteo Médio Hipoativo', categoria: 'HYPO', baseWeight: 3 },
    { id: 'core_rotation_control', label: 'Déficit Controle Rotacional', categoria: 'CM', baseWeight: 3 },
  ],

  trunk_rotation_lateral: [
    { id: 'glute_med_hypo', label: 'Glúteo Médio Hipoativo', categoria: 'HYPO', baseWeight: 2 },
    { id: 'oblique_imbalance', label: 'Desequilíbrio Oblíquos', categoria: 'HYPER', baseWeight: 2 },
  ],

  trunk_forward_lean_sls: [
    { id: 'glute_max_hypo', label: 'Glúteo Máximo Hipoativo', categoria: 'HYPO', baseWeight: 3 },
    { id: 'hip_flexor_tight', label: 'Flexores do Quadril Encurtados', categoria: 'HYPER', baseWeight: 2 },
    { id: 'core_deep_hypo', label: 'Core Profundo Hipoativo', categoria: 'HYPO', baseWeight: 2 },
  ],

  knee_flexion_insufficient: [
    { id: 'quad_control_deficit', label: 'Déficit Controle Excêntrico Quadríceps', categoria: 'CM', baseWeight: 3 },
    { id: 'glute_max_hypo', label: 'Glúteo Máximo Hipoativo', categoria: 'HYPO', baseWeight: 2 },
  ],

  instability: [
    { id: 'glute_med_hypo', label: 'Glúteo Médio Hipoativo', categoria: 'HYPO', baseWeight: 3 },
    { id: 'ankle_stability_deficit', label: 'Déficit Estabilidade Tornozelo', categoria: 'INSTAB', baseWeight: 3 },
    { id: 'core_stability_deficit', label: 'Déficit Estabilidade Core', categoria: 'INSTAB', baseWeight: 2 },
  ],

  tremor: [
    { id: 'motor_control_deficit', label: 'Déficit Controle Motor Global', categoria: 'CM', baseWeight: 3 },
    { id: 'muscle_fatigue', label: 'Fadiga Muscular', categoria: 'HYPO', baseWeight: 2 },
  ],

  foot_collapse: [
    { id: 'tib_post_hypo', label: 'Tibial Posterior Hipoativo', categoria: 'HYPO', baseWeight: 4 },
    { id: 'foot_intrinsic_hypo', label: 'Intrínsecos do Pé Hipoativos', categoria: 'HYPO', baseWeight: 3 },
    { id: 'arch_control_deficit', label: 'Déficit Controle do Arco', categoria: 'CM', baseWeight: 3 },
  ],

  balance_loss: [
    { id: 'proprioception_deficit', label: 'Déficit Proprioceptivo', categoria: 'CM', baseWeight: 3 },
    { id: 'ankle_stability_deficit', label: 'Déficit Estabilidade Tornozelo', categoria: 'INSTAB', baseWeight: 3 },
    { id: 'glute_med_hypo', label: 'Glúteo Médio Hipoativo', categoria: 'HYPO', baseWeight: 2 },
  ],

  // ============================================
  // Push-up
  // ============================================

  scapular_winging: [
    { id: 'serratus_hypo', label: 'Serrátil Anterior Hipoativo', categoria: 'HYPO', baseWeight: 4 },
    { id: 'trap_inf_hypo', label: 'Trapézio Inferior Hipoativo', categoria: 'HYPO', baseWeight: 3 },
    { id: 'trap_sup_hyper', label: 'Trapézio Superior Hiperativo', categoria: 'HYPER', baseWeight: 2 },
    { id: 'scapular_dyskinesis', label: 'Discinese Escapular', categoria: 'INSTAB', baseWeight: 3 },
  ],

  hips_drop: [
    { id: 'core_deep_hypo', label: 'Core Profundo Hipoativo', categoria: 'HYPO', baseWeight: 3 },
    { id: 'glute_max_hypo', label: 'Glúteo Máximo Hipoativo', categoria: 'HYPO', baseWeight: 2 },
    { id: 'lumbar_control', label: 'Déficit Controle Motor Lombar', categoria: 'CM', baseWeight: 3 },
  ],

  hip_elevation: [
    { id: 'rectus_abd_hyper', label: 'Reto Abdominal Hiperativo', categoria: 'HYPER', baseWeight: 2 },
    { id: 'glute_max_hypo', label: 'Glúteo Máximo Hipoativo', categoria: 'HYPO', baseWeight: 2 },
  ],

  lumbar_extension: [
    { id: 'core_deep_hypo', label: 'Core Profundo Hipoativo', categoria: 'HYPO', baseWeight: 4 },
    { id: 'hip_flexor_tight', label: 'Flexores do Quadril Encurtados', categoria: 'HYPER', baseWeight: 3 },
    { id: 'lumbar_erector_hyper', label: 'Eretores Lombares Hiperativos', categoria: 'HYPER', baseWeight: 2 },
  ],

  elbow_flare: [
    { id: 'pec_major_hyper', label: 'Peitoral Maior Hiperativo', categoria: 'HYPER', baseWeight: 2 },
    { id: 'serratus_hypo', label: 'Serrátil Anterior Hipoativo', categoria: 'HYPO', baseWeight: 2 },
    { id: 'shoulder_er_hypo', label: 'Rotadores Externos Ombro Hipoativos', categoria: 'HYPO', baseWeight: 2 },
  ],

  shoulder_protraction: [
    { id: 'pec_minor_tight', label: 'Peitoral Menor Encurtado', categoria: 'HYPER', baseWeight: 3 },
    { id: 'trap_mid_hypo', label: 'Trapézio Médio Hipoativo', categoria: 'HYPO', baseWeight: 2 },
    { id: 'rhomboid_hypo', label: 'Romboides Hipoativos', categoria: 'HYPO', baseWeight: 2 },
  ],

  shoulder_retraction_insufficient: [
    { id: 'rhomboid_hypo', label: 'Romboides Hipoativos', categoria: 'HYPO', baseWeight: 3 },
    { id: 'trap_mid_hypo', label: 'Trapézio Médio Hipoativo', categoria: 'HYPO', baseWeight: 3 },
  ],

  head_forward: [
    { id: 'deep_neck_flexor_hypo', label: 'Flexores Cervicais Profundos Hipoativos', categoria: 'HYPO', baseWeight: 3 },
    { id: 'trap_sup_hyper', label: 'Trapézio Superior Hiperativo', categoria: 'HYPER', baseWeight: 2 },
    { id: 'scm_hyper', label: 'ECM Hiperativo', categoria: 'HYPER', baseWeight: 2 },
  ],

  misalignment: [
    { id: 'core_asymmetry', label: 'Assimetria de Core', categoria: 'HYPO', baseWeight: 2 },
    { id: 'scapular_asymmetry', label: 'Assimetria Escapular', categoria: 'INSTAB', baseWeight: 2 },
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
      paravertebrais_hyper: 2,
      hip_flexor_tight: 2,
      core_deep_hypo: 2,
      tspine_ext_limit: 2,
      lumbar_erector_hyper: 2,
      lumbar_control: 2,
    },
  },
  // Dor no joelho
  {
    condicao: 'dor_joelho',
    label: 'Dor no Joelho',
    ajustes: {
      glute_med_hypo: 2,
      tib_post_hypo: 2,
      dorsiflexion_limit: 2,
      tfl_hyper: 2,
      vmo_hypo: 2,
    },
  },
  // Dor no ombro
  {
    condicao: 'dor_ombro',
    label: 'Dor no Ombro',
    ajustes: {
      serratus_hypo: 2,
      trap_inf_hypo: 2,
      trap_sup_hyper: 2,
      pec_minor_tight: 2,
      shoulder_er_hypo: 2,
    },
  },
  // Dor cervical
  {
    condicao: 'dor_cervical',
    label: 'Dor Cervical',
    ajustes: {
      deep_neck_flexor_hypo: 2,
      trap_sup_hyper: 2,
      scm_hyper: 2,
    },
  },
  // Corrida
  {
    condicao: 'corrida',
    label: 'Corrida',
    ajustes: {
      glute_med_hypo: 2,
      dorsiflexion_limit: 2,
      tib_post_hypo: 2,
      hamstring_tight: 1,
      calf_tight: 1,
    },
  },
  // Futebol
  {
    condicao: 'futebol',
    label: 'Futebol',
    ajustes: {
      glute_med_hypo: 2,
      adductor_hyper: 2,
      ankle_stability_deficit: 2,
      hip_flexor_tight: 1,
    },
  },
  // Basquete/Vôlei (saltos)
  {
    condicao: 'saltos',
    label: 'Esportes de Salto',
    ajustes: {
      dorsiflexion_limit: 2,
      glute_max_hypo: 2,
      quad_control_deficit: 2,
    },
  },
  // Natação
  {
    condicao: 'natacao',
    label: 'Natação',
    ajustes: {
      serratus_hypo: 2,
      shoulder_flex_limit: 2,
      trap_inf_hypo: 2,
      tspine_ext_limit: 2,
    },
  },
  // Musculação
  {
    condicao: 'musculacao',
    label: 'Musculação',
    ajustes: {
      pec_minor_tight: 1,
      hip_flexor_tight: 1,
      lat_tight: 1,
    },
  },
  // Sedentarismo (muitas horas sentado)
  {
    condicao: 'sedentarismo',
    label: 'Sedentarismo (>6h sentado)',
    ajustes: {
      hip_flexor_tight: 2,
      glute_max_hypo: 2,
      core_deep_hypo: 1,
      tspine_ext_limit: 1,
    },
  },
  // Sono ruim
  {
    condicao: 'sono_ruim',
    label: 'Qualidade de Sono Ruim',
    ajustes: {
      muscle_fatigue: 1,
      motor_control_deficit: 1,
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
    if (esporte.includes('muscula') || esporte.includes('academia') || esporte.includes('gym') || esporte.includes('peso')) {
      contextos.push('musculacao');
    }
  });

  // Sedentarismo
  if (anamnese.sedentaryHoursPerDay && anamnese.sedentaryHoursPerDay >= 6) {
    contextos.push('sedentarismo');
  }

  // Sono ruim (qualidade < 5)
  if (anamnese.sleepQuality && anamnese.sleepQuality < 5) {
    contextos.push('sono_ruim');
  }

  return [...new Set(contextos)]; // Remove duplicatas
}
